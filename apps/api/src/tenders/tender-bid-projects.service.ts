import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

/** Bid-project statuses a sync may move a project out of. A project that has reached AWARDED or COMPLETED is never moved back by tender events. */
const LOCKED = new Set(["AWARDED", "COMPLETED"]);
const PRE_AWARD = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED"];

/**
 * Keeps a supplier's Project Management project in step with its tender (2026-10-24). One project per organisation and tender, found by
 * Project.sourceTenderId. Created automatically when the organisation registers interest, or on demand ("Track as a project"). Then:
 *   interest -> IDENTIFIED, bid saved -> IN_PROGRESS (draft prices copied), bid submitted -> SUBMITTED (submission date, prices, bid total),
 *   bid withdrawn -> IN_PROGRESS, interest withdrawn -> DECLINED, tender cancelled -> CANCELLED,
 *   awarded -> AWARDED (lines cut to what was awarded, at the awarded share), not awarded -> UNAWARDED, never bid -> DECLINED.
 * The contract step later reuses this project. All writes are system actions in a platform context and never throw into the caller.
 */
@Injectable()
export class TenderBidProjectsService {
  /** The project for this organisation and tender, if one exists. */
  async findFor(tx: any, organizationId: string, tenderId: string) {
    return tx.project.findFirst({ where: { organizationId, sourceTenderId: tenderId, isArchived: false }, orderBy: { createdAt: "asc" } });
  }

  private async uniqueReference(tx: any, organizationId: string, base: string) {
    let ref = base; let n = 1;
    while (await tx.project.findFirst({ where: { organizationId, referenceNumber: ref }, select: { id: true } })) { n++; ref = `${base}-BID${n > 2 ? n - 1 : ""}`; }
    return ref;
  }

  /** Finds or creates the project, with a line per tender line. Returns the project and whether it was created. */
  async ensure(tx: any, organizationId: string, tenderId: string, userId: string | null, status: string = "IDENTIFIED") {
    const existing = await this.findFor(tx, organizationId, tenderId);
    if (existing) return { project: existing, created: false };
    const t = await tx.tender.findUnique({ where: { id: tenderId } });
    if (!t) throw new NotFoundException("Tender not found.");
    const lines = await tx.tenderLine.findMany({ where: { tenderId }, orderBy: { lineNumber: "asc" } });
    const pm = await tx.productMaster.findMany({ where: { id: { in: lines.map((l: any) => l.productMasterId).filter(Boolean) } }, select: { category: true } });
    const pharma = pm.some((p: any) => /pharma|medicine|drug/i.test(p.category));
    const issuer = await tx.organization.findUnique({ where: { id: t.organizationId }, select: { name: true } });
    const codes = t.deliveryCountryCodes as string | null;
    const project = await tx.project.create({ data: {
      organizationId, referenceNumber: await this.uniqueReference(tx, organizationId, t.referenceNumber), title: t.title, category: "PROCUREMENT",
      projectType: pharma ? "PHARMACEUTICAL" : "NON_PHARMACEUTICAL", status, sourceTenderId: tenderId,
      dueDate: t.closingAt ?? undefined, incoterm: t.incoterm ?? undefined,
      ...(codes ? { deliveryCountryCodes: codes, deliveryCountryCode: codes.split(",").filter(Boolean)[0] } : {}),
      projectNotes: `Tracking tender ${t.referenceNumber} issued by ${issuer?.name ?? "the issuer"}. Bid closes ${t.closingAt ? t.closingAt.toISOString().slice(0, 10) : "(date not set)"}.`,
      lines: { create: lines.map((l: any) => ({
        organizationId, clientProductDescription: l.description, productMasterId: l.productMasterId ?? undefined, sourceTenderLineId: l.id,
        quantity: l.quantity != null ? Math.round(Number(l.quantity)) : undefined, ...(l.destinationCountryCode ? { destinationCountryCode: l.destinationCountryCode } : {}),
      })) },
    } });
    await tx.projectStatusHistory.create({ data: { organizationId, projectId: project.id, status, changedById: userId } });
    return { project, created: true };
  }

  /** Moves a project to a status and records it, unless it has already reached AWARDED or COMPLETED. */
  private async move(tx: any, project: any, status: string, userId: string | null, patch: Record<string, unknown> = {}, note?: string) {
    if (LOCKED.has(project.status) && !(project.status === "AWARDED" && status === "AWARDED")) return project;
    if (project.status === status && Object.keys(patch).length === 0 && !note) return project;
    const data: Record<string, unknown> = { ...patch };
    if (project.status !== status) data.status = status;
    if (note) data.projectNotes = [project.projectNotes, note].filter(Boolean).join("\n");
    const updated = await tx.project.update({ where: { id: project.id }, data });
    if (project.status !== status) await tx.projectStatusHistory.create({ data: { organizationId: project.organizationId, projectId: project.id, status, changedById: userId } });
    return updated;
  }

  /** Copies the bid's prices onto the project lines: unit price becomes the unit sales price; lines the bidder did not price are archived. */
  private async copyPrices(tx: any, project: any, tenderId: string) {
    const bid = await tx.tenderBid.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: project.organizationId } } });
    if (!bid) return null;
    const bidLines = await tx.tenderBidLine.findMany({ where: { bidId: bid.id } });
    const plines = await tx.projectLine.findMany({ where: { projectId: project.id, sourceTenderLineId: { not: null } } });
    for (const pl of plines) {
      const bl = bidLines.find((x: any) => x.tenderLineId === pl.sourceTenderLineId);
      if (!bl) continue;
      await tx.projectLine.update({ where: { id: pl.id }, data: bl.noBid
        ? { archivedAt: new Date() }
        : { archivedAt: null, unitSalesPrice: bl.unitPrice ?? null, countryOfManufactureCode: bl.countryOfOrigin ?? null } });
    }
    return bid;
  }

  private async safely(label: string, fn: () => Promise<unknown>) {
    try { await fn(); } catch (e) { console.error(`Tender bid project sync failed (${label})`, e); }
  }

  // ------------------------------------------------------------------ on demand

  /** "Track as a project": any supplier who can see a published tender can start its project, with or without registering interest. */
  async track(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "projects.create");
    const t = await withTenantContext(user.organizationId, (tx) => tx.tender.findUnique({ where: { id: tenderId } }));
    if (!t || !t.isPublished || t.organizationId === user.organizationId) throw new NotFoundException("Tender not found.");
    if (["CANCELLED"].includes(t.status)) throw new ConflictException("This tender has been cancelled.");
    return withPlatformStaffContext(async (tx: any) => {
      const r = await this.ensure(tx, user.organizationId, tenderId, user.id);
      return { projectId: r.project.id as string, created: r.created };
    });
  }

  /** The caller's project for a tender, if any (null otherwise). */
  async mine(user: RequestUser, tenderId: string): Promise<{ projectId: string; referenceNumber: string; status: string } | null> {
    const p = await withTenantContext(user.organizationId, (tx) => tx.project.findFirst({ where: { organizationId: user.organizationId, sourceTenderId: tenderId, isArchived: false }, select: { id: true, referenceNumber: true, status: true } }));
    return p ? { projectId: p.id, referenceNumber: p.referenceNumber, status: p.status } : null;
  }

  // ------------------------------------------------------------------ lifecycle hooks (best effort)

  onInterest(organizationId: string, tenderId: string, userId: string) {
    return this.safely("interest", () => withPlatformStaffContext(async (tx: any) => {
      const r = await this.ensure(tx, organizationId, tenderId, userId, "IDENTIFIED");
      // Re-expressing interest after withdrawing reopens a declined project.
      if (!r.created && r.project.status === "DECLINED") await this.move(tx, r.project, "IDENTIFIED", userId, { reasonForCancellation: null });
    }));
  }

  onInterestWithdrawn(organizationId: string, tenderId: string, userId: string) {
    return this.safely("interest withdrawn", () => withPlatformStaffContext(async (tx: any) => {
      const p = await this.findFor(tx, organizationId, tenderId);
      if (p && PRE_AWARD.includes(p.status)) await this.move(tx, p, "DECLINED", userId, { reasonForCancellation: "Withdrew interest in the tender." });
    }));
  }

  onBidSaved(organizationId: string, tenderId: string, userId: string) {
    return this.safely("bid saved", () => withPlatformStaffContext(async (tx: any) => {
      const { project } = await this.ensure(tx, organizationId, tenderId, userId, "IN_PROGRESS");
      const p = project.status === "IDENTIFIED" || project.status === "DECLINED" ? await this.move(tx, project, "IN_PROGRESS", userId, { reasonForCancellation: null }) : project;
      if (p.status === "IN_PROGRESS") await this.copyPrices(tx, p, tenderId);
    }));
  }

  onBidSubmitted(organizationId: string, tenderId: string, userId: string, total: { currency: string | null; amount: number | null; tenderCurrency: string | null; tenderAmount: number | null }) {
    return this.safely("bid submitted", () => withPlatformStaffContext(async (tx: any) => {
      const { project } = await this.ensure(tx, organizationId, tenderId, userId, "SUBMITTED");
      const bid = await this.copyPrices(tx, project, tenderId);
      const when = (bid?.submittedAt ?? new Date()) as Date;
      const note = `Bid submitted ${when.toISOString().slice(0, 10)}${total.amount != null ? `: total ${total.currency ?? ""} ${total.amount.toFixed(2)}${total.tenderCurrency && total.tenderCurrency !== total.currency && total.tenderAmount != null ? ` (${total.tenderCurrency} ${total.tenderAmount.toFixed(2)} at the tender's currency)` : ""}` : ""}.`;
      await this.move(tx, project, "SUBMITTED", userId, { submissionDate: when, reasonForCancellation: null }, note);
    }));
  }

  onBidWithdrawn(organizationId: string, tenderId: string, userId: string) {
    return this.safely("bid withdrawn", () => withPlatformStaffContext(async (tx: any) => {
      const p = await this.findFor(tx, organizationId, tenderId);
      if (p && p.status === "SUBMITTED") await this.move(tx, p, "IN_PROGRESS", userId, { submissionDate: null }, `Bid withdrawn ${new Date().toISOString().slice(0, 10)}.`);
    }));
  }

  /** The issuer cancelled the tender: every bid project that was still before award is cancelled with the reason. */
  onTenderCancelled(tenderId: string, reason: string) {
    return this.safely("tender cancelled", () => withPlatformStaffContext(async (tx: any) => {
      const projects = await tx.project.findMany({ where: { sourceTenderId: tenderId, isArchived: false, status: { in: PRE_AWARD } } });
      for (const p of projects) await this.move(tx, p, "CANCELLED", null, { reasonForCancellation: `Tender cancelled by the issuer: ${reason}`.slice(0, 500) });
    }));
  }

  /** The award was recorded. Awarded suppliers' projects become AWARDED with only the awarded lines; other bidders' become UNAWARDED; those that never bid are DECLINED. */
  onAward(tenderId: string, awards: { organizationId: string; lines: { tenderLineId: string; sharePercent: number }[] }[], outcomes: { organizationId: string; outcome: "NOT_AWARDED" | "NOT_COMPLIANT" }[]) {
    return this.safely("award", () => withPlatformStaffContext(async (tx: any) => {
      const tlines = await tx.tenderLine.findMany({ where: { tenderId } });
      for (const a of awards) {
        const { project } = await this.ensure(tx, a.organizationId, tenderId, null, "SUBMITTED");
        const plines = await tx.projectLine.findMany({ where: { projectId: project.id, sourceTenderLineId: { not: null } } });
        for (const pl of plines) {
          const al = a.lines.find((x) => x.tenderLineId === pl.sourceTenderLineId);
          const tl = tlines.find((x: any) => x.id === pl.sourceTenderLineId);
          if (!al) await tx.projectLine.update({ where: { id: pl.id }, data: { archivedAt: new Date() } });
          else await tx.projectLine.update({ where: { id: pl.id }, data: { archivedAt: null, ...(tl?.quantity != null ? { quantity: Math.round(Number(tl.quantity) * Number(al.sharePercent) / 100) } : {}) } });
        }
        await this.move(tx, project, "AWARDED", null, { reasonForCancellation: null }, `Awarded ${new Date().toISOString().slice(0, 10)}: ${a.lines.length} item${a.lines.length === 1 ? "" : "s"}.`);
      }
      const awarded = new Set(awards.map((a) => a.organizationId));
      const bidders = new Set(outcomes.map((o) => o.organizationId));
      for (const o of outcomes) {
        if (awarded.has(o.organizationId)) continue;
        const p = await this.findFor(tx, o.organizationId, tenderId);
        if (p && PRE_AWARD.includes(p.status)) await this.move(tx, p, "UNAWARDED", null, { reasonForCancellation: o.outcome === "NOT_COMPLIANT" ? "The bid did not pass every gate." : "Another bid was awarded." });
      }
      const others = await tx.project.findMany({ where: { sourceTenderId: tenderId, isArchived: false, status: { in: PRE_AWARD } } });
      for (const p of others) if (!awarded.has(p.organizationId) && !bidders.has(p.organizationId)) await this.move(tx, p, "DECLINED", null, { reasonForCancellation: "The tender closed without a submitted bid from this organisation." });
    }));
  }
}
