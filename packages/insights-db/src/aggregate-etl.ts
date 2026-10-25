import crypto from "node:crypto";
import { Prisma, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { insightsPrisma } from "./index";
import { MINIMUM_COHORT_SIZE } from "./query";

/**
 * Universe Insights aggregation pipeline (2026-09-24 — see architecture doc,
 * "Anonymized cross-tenant insights"). This is the ONLY writer to the
 * insights database, and the only code anywhere that's allowed to read
 * tenant pricing data across every organization at once (via
 * withPlatformStaffContext) — every other platform-staff-context read stays
 * narrowly scoped to admin/provisioning concerns.
 *
 * Not yet wired to a scheduler — designed to run as a nightly job (Azure
 * Function timer trigger or a scheduled GitHub Actions workflow), see
 * backend-launch-checklist.md. Run manually for now via `npm run aggregate
 * --workspace=@universe/insights-db`.
 *
 * PRICES ARE COST PRICES ONLY (2026-10-25): the price pool is fed from ProjectLine.supplierUnitPrice, the pre-margin price a
 * supplier or manufacturer charged. No sales price, margin-bearing figure, freight invoice or service charge is ever read.
 *
 * APPEND-ONLY BY DESIGN: each run only reads project lines whose supplier price was locked
 * since the last run (default: the last 24 hours) and appends new
 * aggregate rows. It never re-reads or rewrites older aggregate rows, so
 * there's no need to reconcile/upsert against what's already in the insights
 * database — a rerun with an overlapping window would double-count, so
 * `since` should always track "last successful run", not be guessed.
 */

const HASH_SECRET = process.env.INSIGHTS_HASH_SECRET;

/** One-way, stable per-organization hash — see AggregatedProductPrice's doc
 * comment in prisma/schema.prisma for why this exists (cohort-size counting
 * without storing which orgs are in the cohort). Throws rather than silently
 * aggregating unhashed/identifiable data if the secret isn't configured. */
// Demo and simulated organisations never feed the anonymised cross-organisation benchmarks (every consent
// lookup below excludes them): demo data must not appear in real organisations' views.
function hashOrganizationId(organizationId: string): string {
  if (!HASH_SECRET) {
    throw new Error(
      "INSIGHTS_HASH_SECRET is not set — refusing to run the aggregation pipeline without it, since sourceHash is what keeps AggregatedProductPrice de-identified.",
    );
  }
  return crypto.createHmac("sha256", HASH_SECRET).update(organizationId).digest("hex").slice(0, 32);
}

/** First-of-month, UTC — see the "effectiveMonth" field comment in
 * prisma/schema.prisma for why exact dates aren't kept. */
function truncateToMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function runAggregationPipeline(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({
      where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  });

  let written = 0;

  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);

    // COST PRICE ONLY (Lewis, 2026-10-25). The anonymised price pool carries what the supplier or manufacturer charged BEFORE any margin is
    // added: ProjectLine.supplierUnitPrice, in the currency it was agreed in. Nothing that includes a margin is ever read here, for goods,
    // freight or services: never unitSalesPrice, salesTotalPriceReportingCcy, clientPaymentAmount, productMargin*, freightMargin*,
    // freightInvoice* or grossMargin. apps/api/test/insights-cost-only.test.ts fails the build if this file names any of them.
    const priceRows = await withTenantContext(organizationId, async (tx) =>
      tx.projectLine.findMany({
        where: { supplierPriceLockedAt: { gte: since }, supplierUnitPrice: { not: null }, supplierPaymentCurrency: { not: null }, productMasterId: { not: null }, NOT: { productCategory: "SERVICES" } }, // services have their own pool (runServicePriceAggregationPipeline)
        select: {
          supplierUnitPrice: true,
          supplierPaymentCurrency: true,
          supplierPriceLockedAt: true,
          attributes: true,
          quantity: true,
          countryOfManufactureCode: true,
          productMaster: { select: { category: true } },
          project: { select: { deliveryCountryCode: true, incoterm: true, freightMode: true } },
        },
      }),
    );

    for (const row of priceRows) {
      if (!row.productMaster || row.supplierUnitPrice === null || !row.supplierPaymentCurrency || !row.supplierPriceLockedAt) continue;

      // Every consented org's row is written unconditionally, even a single
      // org's single entry — see the model's own doc comment in
      // prisma/schema.prisma ("WRITE vs READ anonymization") for why. The
      // cohort-size floor lives entirely in src/query.ts, never here.
      const manufactureRegion = await resolveRegion(row.countryOfManufactureCode ?? null);
      const destinationRegion = await resolveRegion(row.project?.deliveryCountryCode ?? null);
      const attributes = await sanitizeAttributes(row.productMaster.category, row.attributes ?? null);

      await insightsPrisma.aggregatedProductPrice.create({
        data: {
          category: row.productMaster.category,
          attributes,
          unitPrice: row.supplierUnitPrice,
          currency: row.supplierPaymentCurrency,
          effectiveMonth: truncateToMonth(row.supplierPriceLockedAt),
          manufactureRegion,
          destinationRegion,
          incoterm: row.project?.incoterm ?? null,
          freightMode: row.project?.freightMode ?? null,
          quantity: row.quantity ?? null,
          unitOfSupply: null,
          sourceHash,
        },
      });
      written += 1;
    }
  }

  return { organizationsProcessed: consentedOrgIds.length, rowsWritten: written };
}

/** Country -> WHO region — coarse and non-identifying, never the org's own
 * country/address. Region/Country are shared reference tables (not
 * tenant-scoped), so this reads plain `prisma`, same as seed.ts. */
async function resolveRegion(countryCode: string | null): Promise<string | null> {
  if (!countryCode) return null;
  const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { regionCode: true } });
  return country?.regionCode ?? null;
}

/**
 * Keeps only structured (ENUM/NUMBER/BOOLEAN) attribute values from the
 * source row's `attributes` JSON, dropping any STRING-typed (free-text)
 * attribute entirely. Free-text spec fields are exactly where a manufacturer or brand
 * name tends to leak in (e.g. "supplierProductDescription"-style notes
 * copied into a spec field) — structured values (a size, a volume, an enum
 * option) don't carry that risk the same way. This errs conservative: an
 * attribute key with no matching ProductAttributeDefinition (unrecognized)
 * is dropped too, not kept by default.
 */
async function sanitizeAttributes(category: string, rawAttributes: string | null): Promise<string | null> {
  if (!rawAttributes) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawAttributes);
  } catch {
    return null; // malformed JSON on the source row — don't propagate it
  }

  const definitions = await prisma.productAttributeDefinition.findMany({
    where: { category, dataType: { in: ["ENUM", "NUMBER", "BOOLEAN"] } }, // excludes "STRING" (free text) — see doc comment above
    select: { attributeKey: true },
  });
  const allowedKeys = new Set(definitions.map((d) => d.attributeKey));

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (allowedKeys.has(key)) sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? JSON.stringify(sanitized) : null;
}

/**
 * Supply-chain CO2/distance aggregation (added 2026-10-08) — writes one
 * AggregatedLogisticsMetric row per consented org's ProjectLineLogisticsMetric
 * row created since `since`, same append-only/sourceHash convention as
 * runAggregationPipeline above. A SEPARATE pipeline (not folded into
 * runAggregationPipeline) since it reads a different tenant table and
 * writes a different insights table — keeping them separate means a
 * change to one's cadence/window doesn't require touching the other.
 *
 * Run manually for now via `npm run aggregate:logistics --workspace=@universe/insights-db`.
 */
export async function runLogisticsAggregationPipeline(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({
      where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  });

  let written = 0;

  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);

    const metricRows = await withTenantContext(organizationId, async (tx) =>
      tx.projectLineLogisticsMetric.findMany({ where: { calculatedAt: { gte: since } } }),
    );

    for (const row of metricRows) {
      await insightsPrisma.aggregatedLogisticsMetric.create({
        data: {
          manufactureCountryCode: row.manufactureCountryCode,
          destinationCountryCode: row.destinationCountryCode,
          transportMode: row.transportMode,
          incoterm: row.incoterm,
          commodityGroup: row.commodityGroup,
          distanceKm: row.distanceKm,
          co2FactorKgPerTonneKm: row.co2FactorKgPerTonneKm,
          co2TotalKg: row.co2TotalKg,
          durationDays: row.durationDays,
          efficiencyScore: row.efficiencyScore,
          scoreBand: row.scoreBand,
          effectiveMonth: truncateToMonth(row.calculatedAt),
          sourceHash,
        },
      });
      written += 1;
    }
  }

  return { organizationsProcessed: consentedOrgIds.length, rowsWritten: written };
}

/**
 * Stakeholder efficiency-rating distribution (added 2026-10-08) —
 * Lewis's "25 projects 6/10, 50 8/10, 10 manufacturers are 4/10, 60
 * procurement service agents are 4/10" request. Deliberately NOT an
 * ETL'd/stored aggregate like the two pipelines above: computing each
 * stakeholder's (project/manufacturer/supplier/procuring-organization)
 * AVERAGE efficiency score is a point-in-time snapshot, not an append-
 * only event stream (an entity's average shifts as more lines are added),
 * so it's recomputed fresh on every call rather than accumulated. It
 * reads tenant data live (via withPlatformStaffContext, same cross-tenant
 * access already used by the pipelines above) and returns ONLY counts
 * per (entityType, scoreBand) bucket — never an entity's name/id — with
 * MINIMUM_COHORT_SIZE enforced as a floor on bucket size before it's
 * returned, consistent with this package's disclosure-control convention
 * everywhere else.
 */
export interface StakeholderRatingSummary {
  entityType: "PROJECT" | "MANUFACTURER" | "SUPPLIER" | "PROCURING_ORGANIZATION";
  /** Mean of the entities' own average scores (1-10), to one decimal place. */
  averageScore: number;
  scoreBand: string;
  /** How many entities were rated (never below MINIMUM_COHORT_SIZE). */
  entityCount: number;
}

function bandFor(score: number): string {
  if (score <= 3) return "RED";
  if (score <= 5) return "AMBER";
  if (score <= 7) return "YELLOW";
  return "GREEN";
}

export async function getStakeholderRatingSummary(showSimulated = false): Promise<StakeholderRatingSummary[]> {
  // Four set-based queries across every consenting organisation in one platform-staff context (2026-10-19). The first
  // version looped over organisations, opening a tenant transaction and loading rows for each; with hundreds of simulated
  // organisations in the demo that never finished. Real organisations: consented, not demo, not simulated. Demo
  // context: every consenting organisation.
  const consented = showSimulated
    ? Prisma.sql`SELECT c.organizationId FROM data_sharing_consents c WHERE c.revokedAt IS NULL`
    : Prisma.sql`SELECT c.organizationId FROM data_sharing_consents c JOIN organizations o ON o.id = c.organizationId WHERE c.revokedAt IS NULL AND o.isDemo = 0 AND o.isSimulated = 0`;

  type Row = { entityCount: number | bigint; averageScore: number | null };
  const [projects, manufacturers, suppliers, orgs] = await withPlatformStaffContext(async (tx) => [
    await tx.$queryRaw<Row[]>(Prisma.sql`SELECT COUNT(*) AS entityCount, AVG(a) AS averageScore FROM (
      SELECT AVG(CAST(m.efficiencyScore AS FLOAT)) AS a FROM project_line_logistics_metrics m WHERE m.organizationId IN (${consented}) GROUP BY m.projectId) t`),
    await tx.$queryRaw<Row[]>(Prisma.sql`SELECT COUNT(*) AS entityCount, AVG(a) AS averageScore FROM (
      SELECT AVG(CAST(m.efficiencyScore AS FLOAT)) AS a FROM project_line_logistics_metrics m JOIN project_lines l ON l.id = m.projectLineId
      WHERE m.organizationId IN (${consented}) AND l.manufacturerId IS NOT NULL GROUP BY l.manufacturerId) t`),
    await tx.$queryRaw<Row[]>(Prisma.sql`SELECT COUNT(*) AS entityCount, AVG(a) AS averageScore FROM (
      SELECT AVG(CAST(m.efficiencyScore AS FLOAT)) AS a FROM project_line_logistics_metrics m JOIN project_lines l ON l.id = m.projectLineId
      WHERE m.organizationId IN (${consented}) AND l.supplierId IS NOT NULL GROUP BY l.supplierId) t`),
    await tx.$queryRaw<Row[]>(Prisma.sql`SELECT COUNT(*) AS entityCount, AVG(a) AS averageScore FROM (
      SELECT AVG(CAST(m.efficiencyScore AS FLOAT)) AS a FROM project_line_logistics_metrics m WHERE m.organizationId IN (${consented}) GROUP BY m.organizationId) t`),
  ]);

  function summarise(entityType: StakeholderRatingSummary["entityType"], rows: Row[]): StakeholderRatingSummary[] {
    const entityCount = Number(rows[0]?.entityCount ?? 0);
    const avg = rows[0]?.averageScore;
    if (entityCount < MINIMUM_COHORT_SIZE || avg === null || avg === undefined) return [];
    const averageScore = Math.round(Number(avg) * 10) / 10;
    return [{ entityType, averageScore, scoreBand: bandFor(Math.round(averageScore)), entityCount }];
  }

  return [
    ...summarise("PROJECT", projects),
    ...summarise("MANUFACTURER", manufacturers),
    ...summarise("SUPPLIER", suppliers),
    ...summarise("PROCURING_ORGANIZATION", orgs),
  ];
}

/**
 * Product sourcing by category and country of manufacture (added
 * 2026-10-09) — writes one AggregatedProductSourcing row per consented
 * org's APPROVED, non-archived ProductSourceApproval row created/approved
 * since `since`, same append-only/sourceHash convention as the two
 * pipelines above. A SEPARATE pipeline for the same reason
 * runLogisticsAggregationPipeline is separate from runAggregationPipeline:
 * a different tenant table, a different insights table, independent
 * cadence.
 *
 * Filters on `updatedAt`, not `createdAt` — unlike ProductPriceHistory/
 * ProjectLineLogisticsMetric rows (which are effectively immutable once
 * written), a ProductSourceApproval is commonly created PENDING and only
 * flips to APPROVED later; filtering on createdAt would miss an approval
 * that happened well after the row was first created. This does mean an
 * approval that's edited for an unrelated reason (e.g. a note added) after
 * already being picked up by an earlier run gets re-aggregated — an
 * accepted, deliberate tradeoff (a harmless duplicate count row, same
 * "append-only, never reconciled against what's already there" design as
 * the rest of this package) rather than trying to track exactly what
 * changed.
 *
 * Only APPROVED rows are read — a PENDING or REJECTED sourcing
 * relationship isn't a confirmed "this category is made here" fact yet,
 * and REJECTED specifically should never suggest a manufacturer makes
 * something it was found NOT to be a valid source for.
 *
 * Run manually for now via `npm run aggregate:product-sourcing
 * --workspace=@universe/insights-db`.
 */
export async function runProductSourcingAggregationPipeline(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({
      where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  });

  let written = 0;

  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);

    const approvalRows = await withTenantContext(organizationId, async (tx) =>
      tx.productSourceApproval.findMany({
        where: { status: "APPROVED", isArchived: false, updatedAt: { gte: since } },
        select: {
          productMaster: { select: { category: true } },
          manufacturer: { select: { countryCode: true } },
        },
      }),
    );

    for (const row of approvalRows) {
      if (!row.productMaster) continue; // defensive — productMasterId is required, but mirrors the other pipelines' guard

      // Collapse to the top-level category group — see
      // AggregatedProductSourcing's doc comment in prisma/schema.prisma
      // for why, same split used by ProductCatalogService.getDashboardStats().
      const topLevelCategory = row.productMaster.category.split(".")[0];

      await insightsPrisma.aggregatedProductSourcing.create({
        data: {
          category: topLevelCategory,
          manufactureCountryCode: row.manufacturer?.countryCode ?? null,
          sourceHash,
        },
      });
      written += 1;
    }
  }

  return { organizationsProcessed: consentedOrgIds.length, rowsWritten: written };
}



/** Size bands for freight: rates fall steeply with shipment size, so they are only compared within a band. */
export function weightBandFor(totalKg: number): "LT_1T" | "T1_5" | "T5_20" | "GT_20T" {
  return totalKg < 1000 ? "LT_1T" : totalKg < 5000 ? "T1_5" : totalKg < 20000 ? "T5_20" : "GT_20T";
}

/**
 * Freight COST aggregation (added 2026-10-25, Lewis: anonymised cost prices for goods, freight and services, before any margin).
 * One AggregatedFreightCost row per consenting organisation's project whose freight price was locked since `since`.
 * COST ONLY: reads Project.freightCost (the core price the forwarder charges) and its currency; never the freight margin, the freight
 * invoice or any client figure (apps/api/test/insights-cost-only.test.ts fails the build if this file names one). The cost is divided by
 * the cargo weight and distance recorded by the logistics measurement, and only projects whose weights are measured (none estimated) are
 * used, so a per-tonne rate is never built on a guess. Region level; no project, forwarder or amount is kept.
 */
export async function runFreightCostAggregationPipeline(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({ where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } }, select: { organizationId: true } });
    return rows.map((r) => r.organizationId);
  });
  let written = 0;
  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);
    const projects = await withTenantContext(organizationId, async (tx) =>
      tx.project.findMany({
        where: { freightPriceLockedAt: { gte: since }, freightCost: { not: null }, freightCurrency: { not: null }, freightMode: { not: null } },
        select: { freightCost: true, freightCurrency: true, freightMode: true, incoterm: true, freightPriceLockedAt: true, lines: { select: { logisticsMetric: { select: { weightKgUsed: true, weightEstimated: true, distanceKm: true, manufactureCountryCode: true, destinationCountryCode: true } } } } },
      }),
    );
    for (const p of projects) {
      const metrics = p.lines.map((l) => l.logisticsMetric).filter((m): m is NonNullable<typeof m> => !!m && m.weightKgUsed !== null);
      if (!metrics.length || metrics.some((m) => m.weightEstimated) || p.freightCost === null || !p.freightCurrency || !p.freightMode || !p.freightPriceLockedAt) continue;
      const totalKg = metrics.reduce((a, m) => a + Number(m.weightKgUsed), 0);
      if (totalKg <= 0) continue;
      const avgKm = metrics.reduce((a, m) => a + Number(m.weightKgUsed) * Number(m.distanceKm), 0) / totalKg;
      if (avgKm <= 0) continue;
      const heaviest = [...metrics].sort((a, b) => Number(b.weightKgUsed) - Number(a.weightKgUsed))[0]!;
      const costPerTonne = Number(p.freightCost) / (totalKg / 1000);
      await insightsPrisma.aggregatedFreightCost.create({
        data: {
          freightMode: p.freightMode,
          incoterm: p.incoterm ?? null,
          originRegion: await resolveRegion(heaviest.manufactureCountryCode ?? null),
          destinationRegion: await resolveRegion(heaviest.destinationCountryCode ?? null),
          weightBand: weightBandFor(totalKg),
          distanceKm: Math.round(avgKm * 10) / 10,
          costPerTonne: Math.round(costPerTonne * 100) / 100,
          costPerTonneKm: Math.round((costPerTonne / avgKm) * 10000) / 10000,
          currency: p.freightCurrency,
          effectiveMonth: truncateToMonth(p.freightPriceLockedAt),
          sourceHash,
        },
      });
      written += 1;
    }
  }
  return { organizationsProcessed: consentedOrgIds.length, rowsWritten: written };
}

/**
 * Service COST aggregation (added 2026-10-25). Services (consultancy, technical assistance, advisory, equipment servicing and the rest of
 * SERVICE_CATEGORIES in @universe/types) are their own category, separate from goods and from freight. One AggregatedServicePrice row per
 * consenting organisation's Services line whose supplier price was locked since `since`: the supplier's price per basis unit (day, month,
 * unit, fixed fee...) BEFORE any margin (supplierUnitPrice; never the sales price or margin fields). Region of delivery only.
 */
export async function runServicePriceAggregationPipeline(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({ where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } }, select: { organizationId: true } });
    return rows.map((r) => r.organizationId);
  });
  let written = 0;
  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);
    const lines = await withTenantContext(organizationId, async (tx) =>
      tx.projectLine.findMany({
        where: { productCategory: "SERVICES", supplierPriceLockedAt: { gte: since }, supplierUnitPrice: { not: null }, supplierPaymentCurrency: { not: null }, serviceCategory: { not: null }, servicePricingBasis: { not: null } },
        select: { supplierUnitPrice: true, supplierPaymentCurrency: true, supplierPriceLockedAt: true, serviceCategory: true, servicePricingBasis: true, quantity: true, destinationCountryCode: true, project: { select: { deliveryCountryCode: true } } },
      }),
    );
    for (const l of lines) {
      if (l.supplierUnitPrice === null || !l.supplierPaymentCurrency || !l.supplierPriceLockedAt || !l.serviceCategory || !l.servicePricingBasis) continue;
      await insightsPrisma.aggregatedServicePrice.create({
        data: {
          serviceCategory: l.serviceCategory,
          pricingBasis: l.servicePricingBasis,
          unitPrice: l.supplierUnitPrice,
          currency: l.supplierPaymentCurrency,
          effectiveMonth: truncateToMonth(l.supplierPriceLockedAt),
          deliveryRegion: await resolveRegion(l.destinationCountryCode?.trim() || l.project?.deliveryCountryCode || null),
          quantity: l.quantity ?? null,
          sourceHash,
        },
      });
      written += 1;
    }
  }
  return { organizationsProcessed: consentedOrgIds.length, rowsWritten: written };
}


/**
 * Daily activity (2026-10-25): per consented organisation and day, how many times each kind of event happened. Counts only, never content. Re-runnable:
 * each (day, metric, organisation hash) row is set to the latest count, so overlapping windows never double-count. The five-organisation floor is
 * applied when the figures are read (src/query.ts getDailyActivity).
 */
export async function runDailyActivityAggregationPipeline(sinceDays = 2) {
  const start = new Date(Date.now() - sinceDays * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  const consentedOrgIds = await withPlatformStaffContext(async (tx) => {
    const rows = await tx.dataSharingConsent.findMany({ where: { revokedAt: null, organization: { isDemo: false, isSimulated: false } }, select: { organizationId: true } });
    return rows.map((r) => r.organizationId);
  });
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  let rowsWritten = 0;
  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);
    const counts = await withTenantContext(organizationId, async (tx) => {
      const [projects, lines, enquiries, batches, tenders, bids] = await Promise.all([
        tx.project.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
        tx.projectLine.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
        tx.supplierEnquiry.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
        tx.productBatch.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
        tx.tender.findMany({ where: { publishedAt: { gte: start } }, select: { publishedAt: true } }),
        tx.tenderBid.findMany({ where: { submittedAt: { gte: start } }, select: { submittedAt: true } }),
      ]);
      return [
        ["PROJECTS_STARTED", projects.map((r) => r.createdAt)],
        ["LINES_ADDED", lines.map((r) => r.createdAt)],
        ["SUPPLIER_ENQUIRIES", enquiries.map((r) => r.createdAt)],
        ["BATCHES_RECORDED", batches.map((r) => r.createdAt)],
        ["TENDERS_PUBLISHED", tenders.map((r) => r.publishedAt as Date)],
        ["BIDS_SUBMITTED", bids.map((r) => r.submittedAt as Date)],
      ] as [string, Date[]][];
    });
    for (const [metric, dates] of counts) {
      const byDay = new Map<string, number>();
      for (const d of dates) { if (d) byDay.set(dayKey(d), (byDay.get(dayKey(d)) ?? 0) + 1); }
      for (const [k, eventCount] of byDay) {
        const day = new Date(`${k}T00:00:00.000Z`);
        await insightsPrisma.aggregatedDailyActivity.upsert({
          where: { day_metric_sourceHash: { day, metric, sourceHash } },
          create: { day, metric, sourceHash, eventCount, isSimulated: false },
          update: { eventCount },
        });
        rowsWritten++;
      }
    }
  }
  return { organizationsProcessed: consentedOrgIds.length, rowsWritten };
}
