import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type {
  ProductComplianceStatus,
  ProductRegistrationSummary,
  RegulatoryDashboard,
  RegistrationVerificationSummary,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertNotDemoUser } from "../common/authorization";
import { writeProductChanges } from "./product-record";
import type { CreateRegistrationDto, UpdateRegistrationDto, VerifyRegistrationDto } from "./dto/registration.dto";

const DAY = 86400000;
export const EXPIRING_SOON_DAYS = 90;

type RegRow = {
  id: string;
  productMasterId: string;
  authority: string;
  scheme: string | null;
  referenceNumber: string;
  regulatoryClass: string | null;
  countryCode: string | null;
  holderName: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  status: string;
  sourceUrl: string | null;
  notes: string | null;
  verificationLevel: string;
  contributedByOrganizationName: string | null;
  isArchived: boolean;
};

/** ACTIVE with a past expiry date reads EXPIRED. */
export function effectiveStatus(status: string, expiryDate: Date | null, now = Date.now()): string {
  if (status === "ACTIVE" && expiryDate && expiryDate.getTime() < now) return "EXPIRED";
  return status;
}

export function daysToExpiry(expiryDate: Date | null, now = Date.now()): number | null {
  return expiryDate ? Math.floor((expiryDate.getTime() - now) / DAY) : null;
}

/** Compliance position of a product from its lifecycle and (non-archived) registrations. Safety notices join in step 4. */
export function computeCompliance(lifecycleStatus: string, regs: Pick<RegRow, "status" | "expiryDate" | "authority" | "referenceNumber">[], now = Date.now()): ProductComplianceStatus {
  const reasons: string[] = [];
  let status: ProductComplianceStatus["status"] = "OK";
  const bump = (s: ProductComplianceStatus["status"]) => { if (s === "BLOCKED" || (s === "WARNING" && status === "OK")) status = s; };
  if (lifecycleStatus === "RECALLED" || lifecycleStatus === "WITHDRAWN") { bump("BLOCKED"); reasons.push(`Product is ${lifecycleStatus.toLowerCase()}`); }
  else if (lifecycleStatus === "RESTRICTED") { bump("WARNING"); reasons.push("Product is restricted"); }
  else if (lifecycleStatus === "DISCONTINUED") { bump("WARNING"); reasons.push("Product is discontinued"); }
  else if (lifecycleStatus === "DRAFT") { bump("WARNING"); reasons.push("Catalogue entry is still a draft"); }
  if (regs.length === 0) { bump("WARNING"); reasons.push("No regulatory registration recorded"); }
  else {
    const eff = regs.map((r) => ({ ...r, eff: effectiveStatus(r.status, r.expiryDate, now) }));
    const live = eff.filter((r) => r.eff === "ACTIVE");
    for (const r of eff.filter((x) => x.eff === "SUSPENDED" || x.eff === "WITHDRAWN")) { bump("BLOCKED"); reasons.push(`${r.authority} ${r.referenceNumber} is ${r.eff.toLowerCase()}`); }
    if (live.length === 0) { bump("WARNING"); reasons.push("No active registration (all expired, pending or refused)"); }
    for (const r of live) {
      const d = daysToExpiry(r.expiryDate, now);
      if (d !== null && d <= EXPIRING_SOON_DAYS) { bump("WARNING"); reasons.push(`${r.authority} ${r.referenceNumber} expires in ${d} days`); }
    }
  }
  return { status, reasons };
}

function toDate(v: string | undefined | null): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${v}`);
  return d;
}

const clean = (v: string | undefined) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

/**
 * Regulatory registrations for catalogue products (Product Database step 2, 2026-10-18). Registrations are shared facts;
 * each organisation's own "checked and verified" record is tenant-scoped (RLS) and append-only. Nothing is deleted:
 * registrations are retired with isArchived. Every shared change is written to ProductMasterChange so the product history
 * shows it.
 */
@Injectable()
export class ProductRegistrationsService {
  private canContribute(user: RequestUser): boolean {
    return user.platformStaffRole !== "NONE" || user.permissions.includes("projects.edit") || user.permissions.includes("products.approve");
  }

  private async assertProductVisible(productId: string, showSimulated: boolean) {
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, name: true, isSimulated: true, version: true } });
    if (!p || (p.isSimulated && !showSimulated)) throw new NotFoundException("Product not found.");
    return p;
  }

  private async myVerifications(user: RequestUser, registrationIds: string[]): Promise<Map<string, RegistrationVerificationSummary>> {
    const out = new Map<string, RegistrationVerificationSummary>();
    if (registrationIds.length === 0) return out;
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productRegistrationVerification.findMany({
        where: { organizationId: user.organizationId, registrationId: { in: registrationIds } },
        include: { verifiedBy: { select: { forename: true, surname: true } } },
        orderBy: { verifiedAt: "desc" },
      }),
    );
    for (const v of rows) {
      if (out.has(v.registrationId)) continue; // newest first
      out.set(v.registrationId, {
        id: v.id,
        outcome: v.outcome,
        jurisdiction: v.jurisdiction,
        notes: v.notes,
        nextReverificationDue: v.nextReverificationDue ? v.nextReverificationDue.toISOString() : null,
        verifiedByName: `${v.verifiedBy.forename} ${v.verifiedBy.surname}`.trim(),
        verifiedAt: v.verifiedAt.toISOString(),
      });
    }
    return out;
  }

  private toSummary(r: RegRow, mine: RegistrationVerificationSummary | undefined): ProductRegistrationSummary {
    return {
      id: r.id,
      productMasterId: r.productMasterId,
      authority: r.authority,
      scheme: r.scheme,
      referenceNumber: r.referenceNumber,
      regulatoryClass: r.regulatoryClass,
      countryCode: r.countryCode,
      holderName: r.holderName,
      issueDate: r.issueDate ? r.issueDate.toISOString() : null,
      expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
      status: r.status,
      effectiveStatus: effectiveStatus(r.status, r.expiryDate),
      daysToExpiry: daysToExpiry(r.expiryDate),
      sourceUrl: r.sourceUrl,
      notes: r.notes,
      verificationLevel: r.verificationLevel,
      contributedByOrganizationName: r.contributedByOrganizationName,
      isArchived: r.isArchived,
      myVerification: mine ?? null,
    };
  }

  /** GET /product-catalog/:id/registrations — shared registrations plus the caller's own latest verification of each. */
  async list(user: RequestUser, productId: string, includeArchived = false): Promise<ProductRegistrationSummary[]> {
    await this.assertProductVisible(productId, user.inDemoOrganization === true);
    const rows = await prisma.productRegulatoryRegistration.findMany({
      where: { productMasterId: productId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ authority: "asc" }, { expiryDate: "asc" }],
    });
    const mine = await this.myVerifications(user, rows.map((r) => r.id));
    return rows.map((r) => this.toSummary(r, mine.get(r.id)));
  }

  /** Used by the product detail: raw non-archived registrations for the compliance calculation. */
  async activeRows(productId: string) {
    return prisma.productRegulatoryRegistration.findMany({
      where: { productMasterId: productId, isArchived: false },
      select: { status: true, expiryDate: true, authority: true, referenceNumber: true },
    });
  }

  async create(user: RequestUser, productId: string, dto: CreateRegistrationDto): Promise<ProductRegistrationSummary> {
    assertNotDemoUser(user, "Adding a regulatory registration to the shared catalogue");
    if (!this.canContribute(user)) throw new ForbiddenException("Missing permission: adding a registration requires projects.edit or products.approve.");
    const product = await this.assertProductVisible(productId, user.inDemoOrganization === true);
    const isStaff = user.platformStaffRole !== "NONE";
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.productRegulatoryRegistration.create({
        data: {
          productMasterId: productId,
          authority: dto.authority,
          scheme: clean(dto.scheme) ?? null,
          referenceNumber: dto.referenceNumber.trim(),
          regulatoryClass: clean(dto.regulatoryClass) ?? null,
          countryCode: dto.countryCode ? dto.countryCode.toUpperCase() : null,
          holderName: clean(dto.holderName) ?? null,
          issueDate: toDate(dto.issueDate) ?? null,
          expiryDate: toDate(dto.expiryDate) ?? null,
          status: dto.status ?? "ACTIVE",
          sourceUrl: clean(dto.sourceUrl) ?? null,
          notes: clean(dto.notes) ?? null,
          verificationLevel: "CONTRIBUTED",
          contributedByOrganizationId: user.organizationId,
          contributedByOrganizationName: user.organizationName,
          contributedById: user.id,
          isSimulated: user.inDemoOrganization === true,
        },
      });
      await writeProductChanges(tx, {
        productMasterId: productId,
        version: product.version,
        changes: [{ field: "registration added", oldValue: null, newValue: `${row.authority} ${row.referenceNumber} (${row.status})` }],
        source: "REGISTRATION",
        user,
      });
      return row;
    });
    void isStaff;
    return this.toSummary(created, undefined);
  }

  private async loadForEdit(user: RequestUser, registrationId: string) {
    const reg = await prisma.productRegulatoryRegistration.findUnique({ where: { id: registrationId }, include: { productMaster: { select: { isSimulated: true, version: true } } } });
    if (!reg || (reg.productMaster.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Registration not found.");
    return reg;
  }

  /** PATCH /product-catalog/registrations/:id — platform staff, or the contributing organisation (with edit permission). */
  async update(user: RequestUser, registrationId: string, dto: UpdateRegistrationDto): Promise<ProductRegistrationSummary> {
    assertNotDemoUser(user, "Changing a regulatory registration in the shared catalogue");
    const reg = await this.loadForEdit(user, registrationId);
    const isStaff = user.platformStaffRole !== "NONE";
    if (!isStaff) {
      if (!this.canContribute(user) || reg.contributedByOrganizationId !== user.organizationId) {
        throw new ForbiddenException("Only the contributing organisation or a platform admin can change this registration.");
      }
      if (dto.verificationLevel !== undefined) throw new ForbiddenException("Only a platform admin can mark a registration as source-verified.");
    }
    const data: Record<string, unknown> = {};
    const set = (k: string, v: unknown) => { if (v !== undefined) data[k] = v; };
    set("authority", dto.authority);
    set("scheme", clean(dto.scheme));
    set("referenceNumber", dto.referenceNumber?.trim());
    set("regulatoryClass", clean(dto.regulatoryClass));
    set("countryCode", dto.countryCode === undefined ? undefined : dto.countryCode.trim() === "" ? null : dto.countryCode.trim().toUpperCase());
    set("holderName", clean(dto.holderName));
    set("issueDate", toDate(dto.issueDate));
    set("expiryDate", toDate(dto.expiryDate));
    set("status", dto.status);
    set("sourceUrl", clean(dto.sourceUrl));
    set("notes", clean(dto.notes));
    set("isArchived", dto.isArchived);
    set("verificationLevel", dto.verificationLevel);
    const norm = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v));
    const before = reg as unknown as Record<string, unknown>;
    const changes = Object.entries(data)
      .filter(([k, v]) => norm(before[k]) !== norm(v))
      .map(([k, v]) => ({ field: `registration ${reg.authority} ${reg.referenceNumber}: ${k}`, oldValue: norm(before[k]) || null, newValue: norm(v) || null }));
    if (changes.length === 0) return this.toSummary(reg, (await this.myVerifications(user, [reg.id])).get(reg.id));
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.productRegulatoryRegistration.update({ where: { id: registrationId }, data });
      await writeProductChanges(tx, { productMasterId: reg.productMasterId, version: reg.productMaster.version, changes, source: "REGISTRATION", user });
      return row;
    });
    return this.toSummary(updated, (await this.myVerifications(user, [updated.id])).get(updated.id));
  }

  /** POST /product-catalog/registrations/:id/verify — the caller's organisation records "checked and verified" (QA only). */
  async verify(user: RequestUser, registrationId: string, dto: VerifyRegistrationDto): Promise<ProductRegistrationSummary> {
    if (user.platformStaffRole === "NONE" && !user.permissions.includes("products.approve")) {
      throw new ForbiddenException("Missing permission: recording a verification requires products.approve (QA).");
    }
    const reg = await this.loadForEdit(user, registrationId);
    if ((dto.outcome === "ISSUE_FOUND" || dto.outcome === "NOT_APPLICABLE") && !dto.notes?.trim()) {
      throw new BadRequestException("A note explaining the outcome is required.");
    }
    await withTenantContext(user.organizationId, (tx) =>
      tx.productRegistrationVerification.create({
        data: {
          organizationId: user.organizationId,
          registrationId,
          outcome: dto.outcome,
          jurisdiction: clean(dto.jurisdiction) ?? null,
          notes: clean(dto.notes) ?? null,
          nextReverificationDue: toDate(dto.nextReverificationDue) ?? null,
          verifiedById: user.id,
        },
      }),
    );
    return this.toSummary(reg, (await this.myVerifications(user, [registrationId])).get(registrationId));
  }

  /** GET /product-catalog/regulatory/dashboard — catalogue-wide registration health plus the caller's own verification queue. */
  async dashboard(user: RequestUser): Promise<RegulatoryDashboard> {
    const showSim = user.inDemoOrganization === true;
    const simWhere = showSim ? {} : { productMaster: { isSimulated: false } };
    const now = new Date();
    const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY);
    const base = { isArchived: false, ...simWhere };
    const [registrations, active, expiringSoon, expired, suspendedOrWithdrawn, productsWithRegs, productCount, attentionRows] = await Promise.all([
      prisma.productRegulatoryRegistration.count({ where: base }),
      prisma.productRegulatoryRegistration.count({ where: { ...base, status: "ACTIVE", OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] } }),
      prisma.productRegulatoryRegistration.count({ where: { ...base, status: "ACTIVE", expiryDate: { gte: now, lte: soon } } }),
      prisma.productRegulatoryRegistration.count({ where: { ...base, OR: [{ status: "EXPIRED" }, { status: "ACTIVE", expiryDate: { lt: now } }] } }),
      prisma.productRegulatoryRegistration.count({ where: { ...base, status: { in: ["SUSPENDED", "WITHDRAWN"] } } }),
      prisma.productRegulatoryRegistration.findMany({ where: base, distinct: ["productMasterId"], select: { productMasterId: true } }).then((r) => r.length),
      prisma.productMaster.count({ where: { isArchived: false, ...(showSim ? {} : { isSimulated: false }) } }),
      prisma.productRegulatoryRegistration.findMany({
        where: { ...base, OR: [{ status: { in: ["SUSPENDED", "WITHDRAWN"] } }, { status: "ACTIVE", expiryDate: { lte: soon } }] },
        include: { productMaster: { select: { name: true } } },
        orderBy: [{ expiryDate: "asc" }],
        take: 25,
      }),
    ]);
    const mine = await withTenantContext(user.organizationId, async (tx) => {
      const verifs = await tx.productRegistrationVerification.findMany({
        where: { organizationId: user.organizationId },
        select: { registrationId: true, outcome: true, nextReverificationDue: true, verifiedAt: true },
        orderBy: { verifiedAt: "desc" },
      });
      const latest = new Map<string, (typeof verifs)[number]>();
      for (const v of verifs) if (!latest.has(v.registrationId)) latest.set(v.registrationId, v);
      // Registrations on products the organisation actually uses on project lines.
      const used = await tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 2000 });
      return { latest, usedIds: used.map((u) => u.productMasterId as string) };
    });
    const usedRegs = mine.usedIds.length
      ? await prisma.productRegulatoryRegistration.findMany({ where: { isArchived: false, productMasterId: { in: mine.usedIds } }, select: { id: true } })
      : [];
    const unverified = usedRegs.filter((r) => !mine.latest.has(r.id)).length;
    const nowMs = now.getTime();
    const reverificationDue = [...mine.latest.values()].filter((v) => v.nextReverificationDue && v.nextReverificationDue.getTime() < nowMs).length;
    const issuesFound = [...mine.latest.values()].filter((v) => v.outcome === "ISSUE_FOUND").length;
    return {
      totals: { registrations, active, expiringSoon, expired, suspendedOrWithdrawn, productsWithoutRegistration: Math.max(productCount - productsWithRegs, 0) },
      mine: { unverified, reverificationDue, issuesFound },
      attention: attentionRows.map((r) => ({
        registrationId: r.id,
        productMasterId: r.productMasterId,
        productName: r.productMaster.name,
        authority: r.authority,
        referenceNumber: r.referenceNumber,
        expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
        effectiveStatus: effectiveStatus(r.status, r.expiryDate),
        daysToExpiry: daysToExpiry(r.expiryDate),
      })),
    };
  }
}
