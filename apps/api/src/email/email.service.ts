import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { EMAIL_EVENT_TYPES, appForNotification } from "@universe/types";
import type { EmailPersonMatch, EmailRecipientInput, EmailRulesView } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { emailConfigured, sendEmail } from "./email-sender";
import { renderEmail } from "./email-template";
import type { EmailContext } from "./email-template";

type Tx = any;
const run = <T = any>(u: RequestUser, fn: (tx: Tx) => Promise<T>): Promise<T> => (u.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(u.organizationId, fn));
const canManage = (u: RequestUser) => u.platformStaffRole !== "NONE" || u.permissions.includes("org.users.manage");
const APP_URLS: Record<string, string> = {
  "project-management": "https://black-island-047de4e0f.5.azurestaticapps.net",
  "tender-issuance": "https://jolly-ground-0378d7b0f.4.azurestaticapps.net",
  "product-database": "https://delightful-stone-0f4d11d0f.1.azurestaticapps.net",
  insights: "https://calm-sea-0bb7a750f.5.azurestaticapps.net",
  crm: "https://jolly-dune-0c822430f.5.azurestaticapps.net",
  admin: "https://orange-tree-06a3f710f.6.azurestaticapps.net",
};
/** Turns an app-relative link into a full address so it can be clicked from an email. */
export function absoluteLink(link: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link)) return link;
  const app = appForNotification("", link);
  const base = app ? process.env[`APP_URL_${app.toUpperCase().replace(/-/g, "_")}`] ?? APP_URLS[app] : null;
  return base ? `${base}${link}` : null;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Configurable email (2026-11-01). Approved users choose who gets an email for each event type; the sender flushes the outbox once a mail provider is configured. */
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  onModuleInit() { if (process.env.NODE_ENV !== "test") { this.timer = setInterval(() => void this.flush().catch(() => undefined), 60_000); this.timer.unref?.(); } }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private guard(u: RequestUser) { if (!canManage(u)) throw new ForbiddenException("Email recipients are managed by organisation administrators."); }

  async view(u: RequestUser): Promise<EmailRulesView> {
    this.guard(u);
    return run(u, async (tx) => {
      const rows: any[] = await tx.emailRecipient.findMany({ where: { organizationId: u.organizationId }, orderBy: { createdAt: "asc" } });
      const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
      const users: any[] = ids.length ? await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, forename: true, surname: true, jobTitle: true, email: true } }) : [];
      const by = new Map(users.map((x) => [x.id, x]));
      const [queued, failed] = await Promise.all([
        tx.emailOutbox.count({ where: { organizationId: u.organizationId, status: "QUEUED" } }),
        tx.emailOutbox.count({ where: { organizationId: u.organizationId, status: "FAILED" } }),
      ]);
      return {
        configured: emailConfigured(),
        queued, failed,
        events: EMAIL_EVENT_TYPES.map((e) => ({
          ...e,
          recipients: rows.filter((r) => r.eventKey === e.key).map((r) => {
            const x = r.userId ? by.get(r.userId) : null;
            return { id: r.id, eventKey: r.eventKey, userId: r.userId, userName: x ? `${x.forename} ${x.surname}` : null, userJobTitle: x?.jobTitle ?? null, address: r.address, resolvedAddress: x?.email ?? r.address };
          }),
        })),
      };
    });
  }

  /** Search the organisation's registered users by name, job title or role. */
  async people(u: RequestUser, q: string): Promise<EmailPersonMatch[]> {
    this.guard(u);
    const term = (q ?? "").trim();
    if (term.length < 2) return [];
    const rows: any[] = await run(u, (tx) => tx.user.findMany({
      where: {
        organizationId: u.organizationId, status: "ACTIVE", archivedAt: null,
        OR: [{ forename: { contains: term } }, { surname: { contains: term } }, { jobTitle: { contains: term } }, { userRoles: { some: { role: { name: { contains: term } } } } }],
      },
      select: { id: true, forename: true, surname: true, jobTitle: true, email: true, userRoles: { select: { role: { select: { name: true } } } } },
      orderBy: [{ forename: "asc" }, { surname: "asc" }], take: 15,
    }));
    return rows.map((x) => ({ id: x.id, name: `${x.forename} ${x.surname}`, jobTitle: x.jobTitle ?? null, roles: x.userRoles.map((r: any) => r.role.name), email: x.email }));
  }

  async add(u: RequestUser, dto: EmailRecipientInput) {
    this.guard(u);
    if (!EMAIL_EVENT_TYPES.some((e) => e.key === dto.eventKey)) throw new NotFoundException("Unknown email type.");
    const address = dto.address?.trim().toLowerCase();
    if (!!dto.userId === !!address) throw new BadRequestException("Choose a registered user or type one address.");
    if (address && (!EMAIL_RE.test(address) || address.length > 320)) throw new BadRequestException("That does not look like an email address.");
    return run(u, async (tx) => {
      if (dto.userId) {
        const x = await tx.user.findFirst({ where: { id: dto.userId, organizationId: u.organizationId, status: "ACTIVE" }, select: { id: true } });
        if (!x) throw new NotFoundException("User not found in this organisation.");
      }
      const dup = await tx.emailRecipient.findFirst({ where: { organizationId: u.organizationId, eventKey: dto.eventKey, ...(dto.userId ? { userId: dto.userId } : { address }) } });
      if (dup) return { id: dup.id };
      const row = await tx.emailRecipient.create({ data: { organizationId: u.organizationId, eventKey: dto.eventKey, userId: dto.userId ?? null, address: address ?? null, createdById: u.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "email_recipients", recordId: row.id, changedById: u.id, changes: [{ field: "recipient", oldValue: null, newValue: `${dto.eventKey}: ${dto.userId ? "registered user" : address}` }] });
      return { id: row.id };
    });
  }

  async remove(u: RequestUser, id: string) {
    this.guard(u);
    return run(u, async (tx) => {
      const row = await tx.emailRecipient.findFirst({ where: { id, organizationId: u.organizationId } });
      if (!row) throw new NotFoundException("Recipient not found.");
      await tx.emailRecipient.delete({ where: { id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "email_recipients", recordId: id, changedById: u.id, changes: [{ field: "recipient", oldValue: `${row.eventKey}`, newValue: null }] });
      return { id };
    });
  }

  /** Everything about the organisation that goes into the header and footer of its emails. */
  private async orgBits(tx: Tx, orgId: string): Promise<Pick<EmailContext, "orgName" | "logoUrl" | "primaryColor" | "support" | "legalLine">> {
    const o = await tx.organization.findUnique({ where: { id: orgId }, select: { name: true, logoUrl: true, logoIconUrl: true, primaryColor: true, primaryContactName: true, primaryContactTitle: true, primaryContactEmail: true, legalName: true, legalEntityType: true, registrationNumber: true, registeredAddress: true, countryOfRegistration: { select: { name: true } } } });
    const api = process.env.API_PUBLIC_URL ?? "https://universe-pilot-api.victoriousflower-f66d984b.uksouth.azurecontainerapps.io";
    // Mail apps do not show SVG, so use the logo or the icon only when it is a raster image.
    const raster = (p: string | null) => (p && /\.(png|jpe?g|webp)$/i.test(p) ? (p.startsWith("/") ? `${api}${p}` : p) : null);
    let support: EmailContext["support"] = null;
    if (o?.primaryContactEmail) support = { name: o.primaryContactName ?? o.primaryContactEmail, role: o.primaryContactTitle ?? "Primary contact", email: o.primaryContactEmail };
    else {
      const a = await tx.user.findFirst({
        where: { organizationId: orgId, status: "ACTIVE", platformStaffRole: "NONE", clientPartnerId: null, userRoles: { some: { role: { rolePermissions: { some: { permission: { key: "org.users.manage" } } } } } } },
        select: { forename: true, surname: true, email: true }, orderBy: [{ surname: "asc" }, { forename: "asc" }],
      });
      if (a) support = { name: `${a.forename} ${a.surname}`.trim(), role: "Administrator", email: a.email };
    }
    return { orgName: o?.name ?? "Universe", logoUrl: raster(o?.logoUrl ?? null) ?? raster(o?.logoIconUrl ?? null), primaryColor: o?.primaryColor ?? null, support, legalLine: this.legalLine(o) };
  }

  /** The organisation's own legal details; falls back to the platform line when none are filled in. */
  private legalLine(o: any): string {
    const fallback = process.env.UNIVERSE_EMAIL_LEGAL_LINE ?? "Universe Platform. This is an automated message.";
    const bits: string[] = [];
    const kind: Record<string, string> = { GOVERNMENT_AGENCY: "government agency", PRIVATE_COMPANY: "company", REGISTERED_NGO: "registered NGO", FAITH_BASED_NETWORK: "faith-based network", MULTILATERAL_UN_BODY: "multilateral body", COOPERATIVE: "cooperative", ACADEMIC_INSTITUTION: "academic institution", INDIVIDUAL: "", OTHER: "" };
    const name = o?.legalName || null;
    if (!name && !o?.registrationNumber && !o?.registeredAddress) return fallback;
    bits.push(`${name ?? o?.name ?? "Organisation"}${o?.legalEntityType && kind[o.legalEntityType] ? ` (${kind[o.legalEntityType]})` : ""}`);
    if (o?.countryOfRegistration?.name) bits.push(`registered in ${o.countryOfRegistration.name}`);
    if (o?.registrationNumber) bits.push(`registration number ${o.registrationNumber}`);
    if (o?.registeredAddress) bits.push(`registered office: ${o.registeredAddress}`);
    return `${bits.join(", ")}.`;
  }

  /** What an email for this type of event would look like, using this organisation's own branding and a made-up example. */
  async preview(u: RequestUser, eventKey: string) {
    this.guard(u);
    if (!EMAIL_EVENT_TYPES.some((e) => e.key === eventKey)) throw new NotFoundException("Unknown email type.");
    const bits = await run(u, (tx) => this.orgBits(tx, u.organizationId));
    const soon = new Date(Date.now() + 3 * 86400000);
    return renderEmail({
      ...bits, eventKey, title: "Example: New complaint CMP-2026-0001", body: "This is an example of how this email will look.", link: absoluteLink("/quality/complaints"),
      actorName: `${u.forename} ${u.surname}`, actorTitle: null, requiresAction: true, dueDate: soon, category: null, sentAt: new Date(),
    });
  }

  /** Queues an example email of this type to the caller's own address only. */
  async sample(u: RequestUser, eventKey: string) {
    this.guard(u);
    if (!EMAIL_EVENT_TYPES.some((e) => e.key === eventKey)) throw new NotFoundException("Unknown email type.");
    await run(u, (tx) => tx.emailOutbox.create({ data: {
      organizationId: u.organizationId, eventKey, toAddress: u.email.toLowerCase(), subject: "Example: New complaint CMP-2026-0001", body: "This is an example of how this email will look.",
      link: "/quality", actorName: `${u.forename} ${u.surname}`, requiresAction: true, dueDate: new Date(Date.now() + 3 * 86400000),
    } }));
    return { to: u.email };
  }

  /** Sends queued emails (oldest first, 25 at a time; three attempts). Does nothing until a mail provider is configured. */
  async flush(): Promise<number> {
    if (!emailConfigured()) return 0;
    return withPlatformStaffContext(async (tx: Tx) => {
      const rows: any[] = await tx.emailOutbox.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: 25 });
      const orgs = new Map<string, Awaited<ReturnType<EmailService["orgBits"]>>>();
      let sent = 0;
      for (const r of rows) {
        try {
          if (!orgs.has(r.organizationId)) orgs.set(r.organizationId, await this.orgBits(tx, r.organizationId));
          const bits = orgs.get(r.organizationId)!;
          const mail = renderEmail({
            ...bits, eventKey: r.eventKey, title: r.subject, body: r.body || null, link: absoluteLink(r.link), actorName: r.actorName, actorTitle: r.actorTitle,
            requiresAction: r.requiresAction, dueDate: r.dueDate, category: r.category, sentAt: new Date(),
          });
          await sendEmail(r.toAddress, mail.subject, mail.text, mail.html, bits.support?.email);
          await tx.emailOutbox.update({ where: { id: r.id }, data: { status: "SENT", sentAt: new Date(), attempts: r.attempts + 1, lastError: null } });
          sent++;
        } catch (e) {
          const attempts = r.attempts + 1;
          await tx.emailOutbox.update({ where: { id: r.id }, data: { attempts, status: attempts >= 3 ? "FAILED" : "QUEUED", lastError: (e instanceof Error ? e.message : "Send failed").slice(0, 500) } });
        }
      }
      return sent;
    });
  }
}
