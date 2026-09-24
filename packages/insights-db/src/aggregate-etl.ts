import crypto from "node:crypto";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { insightsPrisma } from "./index";

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
 * APPEND-ONLY BY DESIGN: each run only reads ProductPriceHistory rows
 * created since the last run (default: the last 24 hours) and appends new
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
      where: { revokedAt: null },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  });

  let written = 0;

  for (const organizationId of consentedOrgIds) {
    const sourceHash = hashOrganizationId(organizationId);

    const priceRows = await withTenantContext(organizationId, async (tx) =>
      tx.productPriceHistory.findMany({
        where: { createdAt: { gte: since }, productMasterId: { not: null } },
        include: {
          productMaster: { select: { category: true } },
          productLine: { select: { unitOfSupply: true } },
          projectLine: {
            select: {
              attributes: true,
              productMasterId: true,
              countryOfManufactureCode: true,
              incoterm: true,
              freightMode: true,
              quantity: true,
              project: { select: { deliveryCountryCode: true } },
            },
          },
        },
      }),
    );

    for (const row of priceRows) {
      if (!row.productMaster) continue; // productMasterId set but the row is gone — skip rather than guess

      // Every consented org's row is written unconditionally, even a single
      // org's single entry — see the model's own doc comment in
      // prisma/schema.prisma ("WRITE vs READ anonymization") for why. The
      // cohort-size floor lives entirely in src/query.ts, never here.
      const manufactureRegion = await resolveRegion(row.projectLine?.countryOfManufactureCode ?? null);
      const destinationRegion = await resolveRegion(row.projectLine?.project?.deliveryCountryCode ?? null);
      const attributes = await sanitizeAttributes(row.productMaster.category, row.projectLine?.attributes ?? null);

      await insightsPrisma.aggregatedProductPrice.create({
        data: {
          category: row.productMaster.category,
          attributes,
          unitPrice: row.unitPrice,
          currency: row.currency,
          effectiveMonth: truncateToMonth(row.effectiveDate),
          manufactureRegion,
          destinationRegion,
          incoterm: row.projectLine?.incoterm ?? null,
          freightMode: row.projectLine?.freightMode ?? null,
          quantity: row.projectLine?.quantity ?? null,
          unitOfSupply: row.productLine?.unitOfSupply ?? null,
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
