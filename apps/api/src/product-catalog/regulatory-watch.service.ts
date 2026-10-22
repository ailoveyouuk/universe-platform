import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { RegulatoryWatchDashboard, WatchItemSummary, WatchMatchSummary, WatchRunSummary, WatchSourceHealth } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ExportRestrictionsService } from "./export-restrictions.service";
import { ProductSafetyNoticesService } from "./product-safety-notices.service";
import { productTarget } from "./product-target";

const DAY = 86400000;
const SOURCES = ["OPENFDA_DEVICE", "OPENFDA_DRUG", "MHRA_ALERTS", "UK_EXPORT_RESTRICTIONS"];
const STALE_AFTER_MS = 36 * 3600000;

type ItemRow = { id: string; source: string; authority: string; noticeType: string; severity: string; title: string; summary: string; affectedText: string | null; actionRequired: string | null; firmName: string | null; countryCodes: string | null; issueDate: Date; status: string; url: string | null; sourceReference: string; isSimulated: boolean };
type MatchRow = { id: string; status: string; confidence: number; matchBasis: string; matchDetail: string | null; productMasterId: string; reviewedByName: string | null; reviewedAt: Date | null; reviewNotes: string | null; safetyNoticeId: string | null; item: ItemRow; productMaster: { name: string } };

const toItem = (i: ItemRow): WatchItemSummary => ({
  id: i.id, source: i.source, authority: i.authority, noticeType: i.noticeType, severity: i.severity, title: i.title, summary: i.summary, firmName: i.firmName,
  issueDate: i.issueDate.toISOString(), status: i.status, url: i.url, isSimulated: i.isSimulated,
});
const toMatch = (m: MatchRow): WatchMatchSummary => ({
  id: m.id, status: m.status, confidence: m.confidence, matchBasis: m.matchBasis, matchDetail: m.matchDetail, productMasterId: m.productMasterId, productName: m.productMaster.name,
  item: toItem(m.item), reviewedByName: m.reviewedByName, reviewedAt: m.reviewedAt ? m.reviewedAt.toISOString() : null, reviewNotes: m.reviewNotes, safetyNoticeId: m.safetyNoticeId,
});

/**
 * Regulatory watch (Product Database step 4b). The daily job stores public regulator items and advisory matches; this service
 * lets everyone see them (real items outside the demo organisation, simulated ones inside it) and lets platform staff confirm a
 * match, which records a ProductSafetyNotice through the normal route (so organisations using the product are notified and
 * review it), or dismiss it with a reason. Nothing is deleted; nothing is blocked until a person confirms.
 */
@Injectable()
export class RegulatoryWatchService {
  constructor(private readonly safety: ProductSafetyNoticesService, private readonly restrictions: ExportRestrictionsService) {}

  private sim(user: RequestUser): boolean {
    return user.inDemoOrganization === true;
  }

  async dashboard(user: RequestUser): Promise<RegulatoryWatchDashboard> {
    const isSimulated = this.sim(user);
    const since = new Date(Date.now() - 30 * DAY);
    const matchInclude = { item: true, productMaster: { select: { name: true } } } as const;
    const [runsRaw, itemsLast30, pendingCount, confirmed, dismissed, pendingRows, recentItems] = await Promise.all([
      // Source health is real for everyone: the demo organisation sees the real daily runs, not only the sample ones (2026-10-22).
      prisma.regulatoryWatchRun.findMany({ where: { isSimulated: false }, orderBy: { startedAt: "desc" }, take: 60 }),
      prisma.regulatoryWatchItem.count({ where: { isSimulated, issueDate: { gte: since } } }),
      prisma.regulatoryWatchMatch.count({ where: { status: "PENDING", item: { isSimulated } } }),
      prisma.regulatoryWatchMatch.count({ where: { status: "CONFIRMED", item: { isSimulated } } }),
      prisma.regulatoryWatchMatch.count({ where: { status: "DISMISSED", item: { isSimulated } } }),
      prisma.regulatoryWatchMatch.findMany({ where: { status: "PENDING", item: { isSimulated } }, include: matchInclude, orderBy: [{ confidence: "desc" }, { createdAt: "desc" }], take: 25 }),
      prisma.regulatoryWatchItem.findMany({ where: { isSimulated }, orderBy: { issueDate: "desc" }, take: 25 }),
    ]);
    const now = Date.now();
    const sources: WatchSourceHealth[] = SOURCES.map((source) => {
      const mine = runsRaw.filter((r) => r.source === source);
      const last = mine[0];
      const ok = mine.find((r) => r.status === "SUCCESS");
      return {
        source, lastRunAt: last ? last.startedAt.toISOString() : null, lastStatus: last?.status ?? null, lastSuccessAt: ok ? ok.startedAt.toISOString() : null,
        lastError: last?.status === "FAILED" ? last.error : null, stale: !ok || now - ok.startedAt.getTime() > STALE_AFTER_MS,
      };
    });
    const runs: WatchRunSummary[] = runsRaw.slice(0, 15).map((r) => ({
      id: r.id, source: r.source, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null, status: r.status,
      fetched: r.fetched, newItems: r.newItems, changedItems: r.changedItems, newMatches: r.newMatches, error: r.error,
    }));
    return { exportRestrictions: await this.restrictions.list(false, user.inDemoOrganization === true), sources, totals: { itemsLast30Days: itemsLast30, pendingMatches: pendingCount, confirmed, dismissed }, runs, pending: pendingRows.map((m) => toMatch(m as unknown as MatchRow)), recentItems: recentItems.map((i) => toItem(i as ItemRow)) };
  }

  /** Pending and confirmed matches for one product (read-only for everyone who can see the product). */
  async forProduct(user: RequestUser, productId: string): Promise<WatchMatchSummary[]> {
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { isSimulated: true } });
    if (!p || (p.isSimulated && !this.sim(user))) throw new NotFoundException("Product not found.");
    const rows = await prisma.regulatoryWatchMatch.findMany({ where: { productMasterId: productId, status: { in: ["PENDING", "CONFIRMED"] } }, include: { item: true, productMaster: { select: { name: true } } }, orderBy: [{ status: "asc" }, { confidence: "desc" }], take: 20 });
    return rows.map((m) => toMatch(m as unknown as MatchRow));
  }

  private async load(user: RequestUser, matchId: string) {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can confirm or dismiss regulatory watch matches.");
    const m = await prisma.regulatoryWatchMatch.findUnique({ where: { id: matchId }, include: { item: true, productMaster: { select: { name: true } } } });
    if (!m || (m.item.isSimulated && !this.sim(user))) throw new NotFoundException("Match not found.");
    if (m.status !== "PENDING") throw new BadRequestException(`This match has already been ${m.status.toLowerCase()}.`);
    return m;
  }

  async confirm(user: RequestUser, matchId: string, notes?: string): Promise<WatchMatchSummary> {
    const m = await this.load(user, matchId);
    const i = m.item;
    const notice = await this.safety.create(user, productTarget(m.productMasterId), {
      noticeType: i.noticeType, severity: i.severity, authority: i.authority,
      referenceNumber: i.sourceReference.length <= 200 && !i.sourceReference.startsWith("/") ? i.sourceReference : undefined,
      title: i.title.slice(0, 300), summary: i.summary, actionRequired: i.actionRequired ?? undefined,
      affectedBatches: i.affectedText ? i.affectedText.slice(0, 4000) : undefined, countryCodes: i.countryCodes ?? undefined,
      issueDate: i.issueDate.toISOString().slice(0, 10), sourceUrl: i.url ?? undefined,
    });
    const updated = await prisma.regulatoryWatchMatch.update({
      where: { id: matchId },
      data: { status: "CONFIRMED", reviewedById: user.id, reviewedByName: `${user.forename} ${user.surname}`.trim(), reviewedAt: new Date(), reviewNotes: notes?.trim() || null, safetyNoticeId: notice.id },
      include: { item: true, productMaster: { select: { name: true } } },
    });
    return toMatch(updated as unknown as MatchRow);
  }

  async dismiss(user: RequestUser, matchId: string, notes: string): Promise<WatchMatchSummary> {
    await this.load(user, matchId);
    if (!notes.trim()) throw new BadRequestException("A reason is required to dismiss a match.");
    const updated = await prisma.regulatoryWatchMatch.update({
      where: { id: matchId },
      data: { status: "DISMISSED", reviewedById: user.id, reviewedByName: `${user.forename} ${user.surname}`.trim(), reviewedAt: new Date(), reviewNotes: notes.trim() },
      include: { item: true, productMaster: { select: { name: true } } },
    });
    return toMatch(updated as unknown as MatchRow);
  }

  /** Matches by outcome (CONFIRMED | DISMISSED | PENDING), newest first, for the watch tiles. */
  async matchesByStatus(user: RequestUser, status: string): Promise<WatchMatchSummary[]> {
    const isSimulated = this.sim(user);
    const st = status === "CONFIRMED" || status === "DISMISSED" ? status : "PENDING";
    const rows = await prisma.regulatoryWatchMatch.findMany({
      where: { status: st, item: { isSimulated } },
      include: { item: true, productMaster: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 100,
    });
    return rows.map((m) => toMatch(m as unknown as MatchRow));
  }
}
