import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { ProductSafetyFlag, ProductSafetyNoticeSummary, RegulatoryRegisterPage, SafetyNoticeDashboard, SafetyNoticeReviewSummary } from "@universe/types";
import { attributionContext, maskContributor, type AttributionContext } from "./attribution";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertNotDemoUser } from "../common/authorization";
import { completeActionsFor, createNotifications, usersWithPermission } from "../notifications/notify";
import { ownerData, ownerFilter, resolveTarget, writeTargetChanges, type Target } from "./product-target";
import type { CreateSafetyNoticeDto, ReviewSafetyNoticeDto, UpdateSafetyNoticeDto } from "./dto/safety-notice.dto";

const DAY = 86400000;
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };
const clean = (v: string | undefined) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

type NoticeRow = {
  id: string;
  productMasterId: string | null;
  productFamilyId: string | null;
  noticeType: string;
  severity: string;
  authority: string;
  referenceNumber: string | null;
  title: string;
  summary: string;
  actionRequired: string | null;
  affectedBatches: string | null;
  countryCodes: string | null;
  issueDate: Date;
  status: string;
  closedDate: Date | null;
  closedReason: string | null;
  sourceUrl: string | null;
  contributedByOrganizationId: string | null;
  contributedByOrganizationName: string | null;
  isArchived: boolean;
  productMaster?: { name: string } | null;
  productFamily?: { name: string } | null;
};

function toDate(v: string | undefined | null): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${v}`);
  return d;
}

/** Open, non-archived notices that apply to a variant (its own and its family's) or to a family (its own and its variants'). */
export async function openNoticesForCompliance(target: { kind: "product" | "family"; id: string; familyId: string | null }) {
  const where =
    target.kind === "family"
      ? { OR: [{ productFamilyId: target.id }, { productMaster: { productFamilyId: target.id } }] }
      : { OR: target.familyId ? [{ productMasterId: target.id }, { productFamilyId: target.familyId }] : [{ productMasterId: target.id }] };
  return prisma.productSafetyNotice.findMany({
    where: { isArchived: false, status: "OPEN", ...where },
    select: { severity: true, noticeType: true, title: true },
  });
}

/**
 * Safety notices, recalls and field safety notices for catalogue products (Product Database step 4, 2026-10-18). The notice is
 * a shared fact attached to a variant or a family; each organisation's own "checked / not applicable / action taken / affected"
 * review is tenant-scoped (RLS) and append-only. Nothing is deleted: notices are CLOSED or archived. Creating an open notice
 * notifies the QA reviewers of every organisation that uses the product on a project line or as an approved source.
 */
@Injectable()
export class ProductSafetyNoticesService {
  private canManage(user: RequestUser): boolean {
    return user.platformStaffRole !== "NONE" || user.permissions.includes("products.approve");
  }

  private async myReviews(user: RequestUser, noticeIds: string[]): Promise<Map<string, SafetyNoticeReviewSummary>> {
    const out = new Map<string, SafetyNoticeReviewSummary>();
    for (const ids of chunk(noticeIds, 500)) {
      const rows = await withTenantContext(user.organizationId, (tx) =>
        tx.productSafetyNoticeReview.findMany({
          where: { organizationId: user.organizationId, noticeId: { in: ids } },
          include: { reviewedBy: { select: { forename: true, surname: true } } },
          orderBy: { reviewedAt: "desc" },
        }),
      );
      for (const v of rows) {
        if (out.has(v.noticeId)) continue;
        out.set(v.noticeId, { id: v.id, outcome: v.outcome, notes: v.notes, reviewedByName: `${v.reviewedBy.forename} ${v.reviewedBy.surname}`.trim(), reviewedAt: v.reviewedAt.toISOString() });
      }
    }
    return out;
  }

  private toSummary(r: NoticeRow, mine: SafetyNoticeReviewSummary | undefined, viewingProductId: string | undefined, ctx: AttributionContext): ProductSafetyNoticeSummary {
    return {
      id: r.id,
      productMasterId: r.productMasterId,
      productFamilyId: r.productFamilyId,
      inherited: viewingProductId !== undefined && r.productFamilyId !== null,
      productName: r.productMaster?.name ?? r.productFamily?.name ?? "",
      noticeType: r.noticeType,
      severity: r.severity,
      authority: r.authority,
      referenceNumber: r.referenceNumber,
      title: r.title,
      summary: r.summary,
      actionRequired: r.actionRequired,
      affectedBatches: r.affectedBatches,
      countryCodes: r.countryCodes,
      issueDate: r.issueDate.toISOString(),
      status: r.status,
      closedDate: r.closedDate ? r.closedDate.toISOString() : null,
      closedReason: r.closedReason,
      sourceUrl: r.sourceUrl,
      contributedByOrganizationName: maskContributor(ctx, r.contributedByOrganizationId, r.contributedByOrganizationName).name,
      isArchived: r.isArchived,
      myReview: mine ?? null,
      needsReview: r.status === "OPEN" && !r.isArchived && !mine,
    };
  }

  async list(user: RequestUser, target: Target, includeArchived = false): Promise<ProductSafetyNoticeSummary[]> {
    const rt = await resolveTarget(target, user.inDemoOrganization === true);
    const filter = rt.kind === "family" ? { OR: [{ productFamilyId: rt.id }, { productMaster: { productFamilyId: rt.id } }] } : ownerFilter(rt);
    const rows = await prisma.productSafetyNotice.findMany({
      where: { ...filter, ...(includeArchived ? {} : { isArchived: false }) },
      include: { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { issueDate: "desc" }],
    });
    const mine = await this.myReviews(user, rows.map((r) => r.id));
    const ctx = await attributionContext(user, rows.map((r) => r.contributedByOrganizationId));
    return rows
      .sort((a, b) => (a.status === b.status ? (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0) : a.status === "OPEN" ? -1 : 1))
      .map((r) => this.toSummary(r, mine.get(r.id), rt.kind === "product" ? rt.id : undefined, ctx));
  }

  async create(user: RequestUser, target: Target, dto: CreateSafetyNoticeDto): Promise<ProductSafetyNoticeSummary> {
    assertNotDemoUser(user, "Recording a safety notice in the shared catalogue");
    if (!this.canManage(user)) throw new ForbiddenException("Missing permission: recording a safety notice requires products.approve (QA) or platform staff.");
    const rt = await resolveTarget(target, user.inDemoOrganization === true);
    const issue = toDate(dto.issueDate);
    if (!issue) throw new BadRequestException("An issue date is required.");
    if (issue.getTime() > Date.now() + DAY) throw new BadRequestException("The issue date cannot be in the future.");
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.productSafetyNotice.create({
        data: {
          ...ownerData(rt),
          noticeType: dto.noticeType,
          severity: dto.severity,
          authority: dto.authority,
          referenceNumber: clean(dto.referenceNumber) ?? null,
          title: dto.title.trim(),
          summary: dto.summary.trim(),
          actionRequired: clean(dto.actionRequired) ?? null,
          affectedBatches: clean(dto.affectedBatches) ?? null,
          countryCodes: dto.countryCodes ? dto.countryCodes.split(/[\s,;]+/).filter(Boolean).map((c) => c.toUpperCase()).join(",") || null : null,
          issueDate: issue,
          sourceUrl: clean(dto.sourceUrl) ?? null,
          contributedByOrganizationId: user.organizationId,
          contributedByOrganizationName: user.organizationName,
          contributedById: user.id,
          isSimulated: user.inDemoOrganization === true,
        },
        include: { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } },
      });
      await writeTargetChanges(tx, ownerData(rt), {
        version: rt.version,
        changes: [{ field: "safety notice added", oldValue: null, newValue: `${row.noticeType} ${row.severity}: ${row.title}` }],
        source: "REGISTRATION",
        user,
      });
      return row;
    });
    await this.notifyUsers(created.id, user).catch(() => undefined); // best-effort: the notice itself is already saved
    return this.toSummary(created, undefined, undefined, await attributionContext(user, [created.contributedByOrganizationId]));
  }

  /** Product ids a notice covers: the variant, or every variant of the family. */
  private async coveredProductIds(n: { productMasterId: string | null; productFamilyId: string | null }): Promise<string[]> {
    if (n.productMasterId) return [n.productMasterId];
    if (!n.productFamilyId) return [];
    return (await prisma.productMaster.findMany({ where: { productFamilyId: n.productFamilyId }, select: { id: true } })).map((p) => p.id);
  }

  /** Notifies QA reviewers (products.approve) in every organisation that uses a covered product on a line or as an approved source. */
  async notifyUsers(noticeId: string, actor: RequestUser): Promise<number> {
    const n = await prisma.productSafetyNotice.findUnique({ where: { id: noticeId } });
    if (!n || n.status !== "OPEN" || n.isArchived) return 0;
    const productIds = await this.coveredProductIds(n);
    if (productIds.length === 0) return 0;
    const orgIds = new Set<string>();
    await withPlatformStaffContext(async (tx) => {
      for (const ids of chunk(productIds, 500)) {
        for (const l of await tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { in: ids } }, distinct: ["organizationId"], select: { organizationId: true } })) orgIds.add(l.organizationId);
        for (const a of await tx.productSourceApproval.findMany({ where: { productMasterId: { in: ids } }, distinct: ["organizationId"], select: { organizationId: true } })) orgIds.add(a.organizationId);
      }
    });
    if (orgIds.size === 0) return 0;
    // Simulated notices only ever reach the demo organisation; real notices never reach it.
    const orgs = await prisma.organization.findMany({ where: { id: { in: [...orgIds] } }, select: { id: true, isDemo: true } });
    const targets = orgs.filter((o) => (n.isSimulated ? o.isDemo : !o.isDemo)).map((o) => o.id);
    const productId = n.productMasterId ?? productIds[0];
    let sent = 0;
    for (const orgId of targets) {
      await withTenantContext(orgId, async (tx) => {
        const reviewers = await usersWithPermission(tx, orgId, "products.approve", actor.id);
        await createNotifications(
          tx,
          reviewers.map((rid) => ({
            organizationId: orgId,
            recipientUserId: rid,
            actorUserId: actor.id,
            kind: "SAFETY_NOTICE",
            category: "QUALITY",
            title: `${n.severity === "CRITICAL" ? "Urgent: " : ""}${n.noticeType === "RECALL" ? "Recall" : "Safety notice"} — ${n.title}`,
            body: "A product your organisation uses has an open safety notice. Please check it and record your review.",
            link: `/products/detail?id=${productId}`,
            subjectType: "product_safety_notice",
            subjectId: n.id,
            requiresAction: n.severity !== "LOW",
          })),
        );
        sent += reviewers.length;
      });
    }
    return sent;
  }

  private async loadForEdit(user: RequestUser, noticeId: string) {
    const n = await prisma.productSafetyNotice.findUnique({
      where: { id: noticeId },
      include: { productMaster: { select: { name: true, isSimulated: true, version: true } }, productFamily: { select: { name: true, isSimulated: true, version: true } } },
    });
    const owner = n?.productMaster ?? n?.productFamily;
    if (!n || !owner || (owner.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Safety notice not found.");
    return { ...n, ownerVersion: owner.version };
  }

  /** PATCH /product-catalog/safety-notices/:id — platform staff, or the contributing organisation's QA. Close with status CLOSED. */
  async update(user: RequestUser, noticeId: string, dto: UpdateSafetyNoticeDto): Promise<ProductSafetyNoticeSummary> {
    assertNotDemoUser(user, "Changing a safety notice in the shared catalogue");
    const n = await this.loadForEdit(user, noticeId);
    const isStaff = user.platformStaffRole !== "NONE";
    if (!isStaff) {
      if (!this.canManage(user) || n.contributedByOrganizationId !== user.organizationId) throw new ForbiddenException("Only the contributing organisation's QA or a platform admin can change this notice.");
      if (dto.verificationLevel !== undefined) throw new ForbiddenException("Only a platform admin can mark a notice as source-verified.");
    }
    if (dto.status === "CLOSED" && n.status !== "CLOSED" && !(dto.closedReason ?? n.closedReason)?.trim()) throw new BadRequestException("A reason is required to close a notice.");
    const data: Record<string, unknown> = {};
    const set = (k: string, v: unknown) => { if (v !== undefined) data[k] = v; };
    set("noticeType", dto.noticeType);
    set("severity", dto.severity);
    set("authority", dto.authority);
    set("referenceNumber", clean(dto.referenceNumber));
    set("title", dto.title?.trim());
    set("summary", dto.summary?.trim());
    set("actionRequired", clean(dto.actionRequired));
    set("affectedBatches", clean(dto.affectedBatches));
    set("countryCodes", dto.countryCodes === undefined ? undefined : dto.countryCodes.split(/[\s,;]+/).filter(Boolean).map((c) => c.toUpperCase()).join(",") || null);
    set("issueDate", toDate(dto.issueDate) ?? undefined);
    set("sourceUrl", clean(dto.sourceUrl));
    set("isArchived", dto.isArchived);
    set("verificationLevel", dto.verificationLevel);
    if (dto.status !== undefined) {
      set("status", dto.status);
      if (dto.status === "CLOSED" && n.status !== "CLOSED") { set("closedDate", new Date()); set("closedReason", clean(dto.closedReason)); }
      if (dto.status === "OPEN") { set("closedDate", null); set("closedReason", null); }
    } else if (dto.closedReason !== undefined) set("closedReason", clean(dto.closedReason));
    const norm = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v));
    const before = n as unknown as Record<string, unknown>;
    const changes = Object.entries(data)
      .filter(([k, v]) => norm(before[k]) !== norm(v))
      .map(([k, v]) => ({ field: `safety notice "${n.title}": ${k}`, oldValue: norm(before[k]) || null, newValue: norm(v) || null }));
    const ctx = await attributionContext(user, [n.contributedByOrganizationId]);
    if (changes.length === 0) return this.toSummary(n, (await this.myReviews(user, [n.id])).get(n.id), undefined, ctx);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.productSafetyNotice.update({
        where: { id: noticeId },
        data,
        include: { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } },
      });
      await writeTargetChanges(tx, { productMasterId: n.productMasterId, productFamilyId: n.productFamilyId }, { version: n.ownerVersion, changes, source: "REGISTRATION", user });
      return row;
    });
    if (n.status === "CLOSED" && updated.status === "OPEN") await this.notifyUsers(updated.id, user).catch(() => undefined);
    // A closed notice needs no further action from anyone.
    if (n.status !== "CLOSED" && updated.status === "CLOSED") {
      await withPlatformStaffContext((tx) => tx.notification.updateMany({ where: { subjectType: "product_safety_notice", subjectId: updated.id, requiresAction: true, actionStatus: "OPEN" }, data: { actionStatus: "DONE", completedAt: new Date(), readAt: new Date() } })).catch(() => undefined);
    }
    return this.toSummary(updated, (await this.myReviews(user, [updated.id])).get(updated.id), undefined, ctx);
  }

  /** POST /product-catalog/safety-notices/:id/review — the caller's organisation records its own check (QA only). */
  async review(user: RequestUser, noticeId: string, dto: ReviewSafetyNoticeDto): Promise<ProductSafetyNoticeSummary> {
    if (user.platformStaffRole === "NONE" && !user.permissions.includes("products.approve")) throw new ForbiddenException("Missing permission: recording a review requires products.approve (QA).");
    const n = await this.loadForEdit(user, noticeId);
    if (dto.outcome !== "CHECKED_NO_IMPACT" && !dto.notes?.trim()) throw new BadRequestException("A note explaining the outcome is required.");
    await withTenantContext(user.organizationId, async (tx) => {
      await tx.productSafetyNoticeReview.create({ data: { organizationId: user.organizationId, noticeId, outcome: dto.outcome, notes: clean(dto.notes) ?? null, reviewedById: user.id } });
      // The organisation has confirmed its position, so the to-do for every reviewer in it is done.
      await completeActionsFor(tx, user.organizationId, "product_safety_notice", noticeId);
    });
    const ctx = await attributionContext(user, [n.contributedByOrganizationId]);
    return this.toSummary(n, (await this.myReviews(user, [noticeId])).get(noticeId), undefined, ctx);
  }

  /** GET /product-catalog/safety-notices/flags?ids= — per-product open-notice position for the caller's organisation (project-line flags). */
  async flags(user: RequestUser, productIds: string[]): Promise<ProductSafetyFlag[]> {
    const ids = [...new Set(productIds.filter(Boolean))].slice(0, 500);
    if (ids.length === 0) return [];
    const showSim = user.inDemoOrganization === true;
    const products = await prisma.productMaster.findMany({ where: { id: { in: ids }, ...(showSim ? {} : { isSimulated: false }) }, select: { id: true, productFamilyId: true } });
    const familyIds = [...new Set(products.map((p) => p.productFamilyId).filter((f): f is string => !!f))];
    const notices = await prisma.productSafetyNotice.findMany({
      where: { isArchived: false, status: "OPEN", OR: [{ productMasterId: { in: products.map((p) => p.id) } }, ...(familyIds.length ? [{ productFamilyId: { in: familyIds } }] : [])] },
      select: { id: true, productMasterId: true, productFamilyId: true, severity: true, title: true },
    });
    const mine = await this.myReviews(user, notices.map((x) => x.id));
    return products
      .map((p) => {
        const mineN = notices.filter((x) => x.productMasterId === p.id || (x.productFamilyId !== null && x.productFamilyId === p.productFamilyId));
        const top = [...mineN].sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))[0];
        return {
          productMasterId: p.id,
          openNotices: mineN.length,
          criticalOpen: mineN.filter((x) => x.severity === "CRITICAL").length,
          unreviewed: mineN.filter((x) => !mine.has(x.id)).length,
          headline: top ? top.title : null,
        };
      })
      .filter((f) => f.openNotices > 0);
  }

  /** GET /product-catalog/safety-notices/dashboard */
  async dashboard(user: RequestUser): Promise<SafetyNoticeDashboard> {
    const showSim = user.inDemoOrganization === true;
    const simWhere = showSim ? {} : { OR: [{ productMaster: { isSimulated: false } }, { productFamily: { isSimulated: false } }] };
    const base = { isArchived: false, ...simWhere };
    const since = new Date(Date.now() - 90 * DAY);
    const [open, critical, closedRecent, openRows] = await Promise.all([
      prisma.productSafetyNotice.count({ where: { AND: [base, { status: "OPEN" }] } }),
      prisma.productSafetyNotice.count({ where: { AND: [base, { status: "OPEN", severity: "CRITICAL" }] } }),
      prisma.productSafetyNotice.count({ where: { AND: [base, { status: "CLOSED", closedDate: { gte: since } }] } }),
      prisma.productSafetyNotice.findMany({
        where: { AND: [base, { status: "OPEN" }] },
        include: { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } },
        orderBy: [{ issueDate: "desc" }],
        take: 100,
      }),
    ]);
    const productsAffected = new Set(openRows.map((r) => r.productMasterId ?? r.productFamilyId)).size;
    const mine = await this.myReviews(user, openRows.map((r) => r.id));
    const ctx = await attributionContext(user, openRows.map((r) => r.contributedByOrganizationId));
    const items = openRows
      .map((r) => this.toSummary(r, mine.get(r.id), undefined, ctx))
      .sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
      .slice(0, 25);
    const usedIds = await withTenantContext(user.organizationId, async (tx) =>
      (await tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 2000 })).map((l) => l.productMasterId as string),
    );
    let onLines = 0;
    for (const ids of chunk(usedIds, 500)) onLines += (await this.flags(user, ids)).length;
    const myOutcomes = [...mine.values()];
    return {
      totals: { open, critical, closedLast90Days: closedRecent, productsAffected },
      mine: {
        awaitingReview: openRows.filter((r) => !mine.has(r.id)).length,
        affected: myOutcomes.filter((m) => m.outcome === "AFFECTED").length,
        actionTaken: myOutcomes.filter((m) => m.outcome === "ACTION_TAKEN").length,
        onMyProjectLines: onLines,
      },
      items,
    };
  }

  /** The rows behind a safety-notice tile: open | critical | closed | review (awaiting my review) | affected (I recorded AFFECTED). */
  async register(user: RequestUser, view: string, page = 1, pageSize = 25): Promise<RegulatoryRegisterPage> {
    const showSim = user.inDemoOrganization === true;
    const simWhere = showSim ? {} : { OR: [{ productMaster: { isSimulated: false } }, { productFamily: { isSimulated: false } }] };
    const base = { isArchived: false, ...simWhere };
    const skip = (Math.max(page, 1) - 1) * pageSize;
    const include = { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } };
    const row = (r: { id: string; title: string; noticeType: string; severity: string; status: string; issueDate: Date; productMasterId: string | null; productFamilyId: string | null; productMaster: { name: string } | null; productFamily: { name: string } | null }) => ({
      id: r.id,
      name: r.productMaster?.name ?? r.productFamily?.name ?? "",
      detail: `${r.title} (${r.noticeType.replace(/_/g, " ").toLowerCase()}, ${r.severity.toLowerCase()})`,
      status: r.status,
      tone: (r.status === "CLOSED" ? "good" : r.severity === "CRITICAL" ? "critical" : "warning") as "good" | "warning" | "critical",
      date: r.issueDate.toISOString(),
      href: r.productMasterId ? `/products/detail?id=${r.productMasterId}` : `/families/detail?id=${r.productFamilyId}`,
    });
    if (view === "review" || view === "affected") {
      const open = await prisma.productSafetyNotice.findMany({ where: { AND: [base, { status: "OPEN" }] }, include, orderBy: [{ issueDate: "desc" }, { id: "asc" }], take: 1000 });
      const mine = await this.myReviews(user, open.map((r) => r.id));
      const picked = open.filter((r) => (view === "review" ? !mine.has(r.id) : mine.get(r.id)?.outcome === "AFFECTED"));
      return { total: picked.length, rows: picked.slice(skip, skip + pageSize).map(row) };
    }
    const since = new Date(Date.now() - 90 * DAY);
    const where = view === "critical" ? { AND: [base, { status: "OPEN", severity: "CRITICAL" }] } : view === "closed" ? { AND: [base, { status: "CLOSED", closedDate: { gte: since } }] } : { AND: [base, { status: "OPEN" }] };
    const [total, rows] = await Promise.all([
      prisma.productSafetyNotice.count({ where }),
      prisma.productSafetyNotice.findMany({ where, include, orderBy: [{ issueDate: "desc" }, { id: "asc" }], skip, take: pageSize }),
    ]);
    return { total, rows: rows.map(row) };
  }
}
