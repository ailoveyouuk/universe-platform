import { prisma, withPlatformStaffContext, withTenantContext, computeLogisticsMetric, type TransportMode } from "../src/index";

/**
 * Enriches the SIMULATED demo data (2026-10-17, agreed with Lewis after the first review of the live demo):
 *  1. Product catalogue: fills GTIN, HS code, UNSPSC code, standard unit and manufacturer part number where they are
 *     empty on simulated entries. Only NULL fields are filled - nothing is overwritten and nothing is deleted.
 *  2. Product source approvals: adds approved/pending/rejected sourcing relationships (in the demo organisation) for more of
 *     the catalogue, so country of manufacture is populated across the product database.
 *  3. Logistics & CO2: in the demo organisation, fills missing delivery country / freight mode / incoterm on simulated
 *     projects, missing manufacture country / weight on lines, then recomputes the logistics metric of EVERY line with the
 *     platform's own calculator (real country-centroid distances, GLEC-aligned factors), so distance, CO2, duration and
 *     efficiency score are present and consistent.
 * DRY_RUN defaults to true. Safe to re-run (idempotent: fills blanks, upserts metrics, adds approvals only for products
 * without one).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const APPROVALS_TARGET = Number(process.env.APPROVALS_TARGET ?? 9000);

// Deterministic pseudo-random from a string so re-runs give identical values.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pickBy = <T>(list: T[], key: string): T => list[hash(key) % list.length];
const chunks = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

interface CatalogueProfile { hs: string[]; unspsc: string[]; units: string[] }
const CATALOGUE: Record<string, CatalogueProfile> = {
  "Laboratory Consumables": { hs: ["392390", "701790", "392690"], unspsc: ["41121500", "41121800", "41122400"], units: ["Box of 100", "Pack of 500", "Each"] },
  Diagnostics: { hs: ["382200", "902780", "300215"], unspsc: ["41116100", "41116200", "41116000"], units: ["Test kit (25 tests)", "Test kit (96 tests)", "Box of 50 tests"] },
  "Medical Devices": { hs: ["901890", "901839", "902190"], unspsc: ["42181500", "42182000", "42192000"], units: ["Each", "Each", "Set"] },
  Pharmaceuticals: { hs: ["300490", "300420", "300439"], unspsc: ["51101500", "51102000", "51111800"], units: ["Blister pack of 10 tablets", "Vial", "Bottle (100 tablets)"] },
  "Personal Protective Equipment": { hs: ["401519", "630790", "621600"], unspsc: ["46181500", "46181800", "46182000"], units: ["Box of 50", "Box of 100 pairs", "Pack of 25"] },
  "Cold Chain": { hs: ["841861", "392310", "842139"], unspsc: ["41104400", "40101700", "24112100"], units: ["Each", "Each", "Case of 6"] },
  Reagents: { hs: ["382200", "382499", "280469"], unspsc: ["41116000", "12161500", "41116100"], units: ["Bottle (500 mL)", "Kit (100 reactions)", "Vial (10 mL)"] },
  "Surgical Supplies": { hs: ["901890", "901832", "300590"], unspsc: ["42291600", "42291700", "42295100"], units: ["Each", "Box of 10", "Pack of 5"] },
  "Wound Care": { hs: ["300510", "300590", "300630"], unspsc: ["42311500", "42312000", "42311700"], units: ["Box of 10", "Box of 50", "Roll"] },
  Imaging: { hs: ["901812", "902214", "902219"], unspsc: ["42201800", "42203000", "42203300"], units: ["Each", "Each", "Pack of 100 sheets"] },
};
const FALLBACK = CATALOGUE["Medical Devices"];

// Realism (Lewis, 2026-10-17): a small, deterministic share of simulated entries keeps some fields blank, as real catalogues do.
const GAP_PERCENT: Record<string, number> = { gtin: 7, hs: 4, unspsc: 6, unit: 3, mpn: 14 };
const isGap = (id: string, field: string) => hash(`${id}:gap:${field}`) % 100 < GAP_PERCENT[field];

function gtin13(n: number): string {
  const body = `506${String(n).padStart(9, "0")}`; // GS1 UK prefix 506 + 9 digits = 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  return body + String((10 - (sum % 10)) % 10);
}

async function enrichCatalogue() {
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, OR: [{ gtin: null }, { hsCode: null }, { unspscCode: null }, { standardUnit: null }, { canonicalManufacturerPartNumber: null }] },
    select: { id: true, category: true },
    orderBy: { id: "asc" },
  });
  console.log(`Catalogue: ${rows.length} simulated entries with at least one empty identifier field`);
  if (dryRun || rows.length === 0) return rows.length;
  let n = 0;
  let seq = 100000;
  for (const group of chunks(rows, 400)) {
    const values = group
      .map((r) => {
        if (!/^[0-9a-f-]{36}$/i.test(r.id)) throw new Error(`Unexpected id ${r.id}`);
        const profile = CATALOGUE[r.category.split(".")[0]] ?? FALLBACK;
        const hs = pickBy(profile.hs, r.id);
        const unspsc = pickBy(profile.unspsc, r.id + "u");
        const unit = pickBy(profile.units, r.id + "s").replace(/'/g, "''");
        seq += 1 + (hash(r.id) % 7);
        const mpn = `MPN-${hash(r.id + "m").toString(36).toUpperCase().padStart(7, "0")}`;
        const q = (v: string, f: string) => (isGap(r.id, f) ? "NULL" : `'${v}'`);
        return `('${r.id}',${q(gtin13(seq + n), "gtin")},${q(hs, "hs")},${q(unspsc, "unspsc")},${q(unit, "unit")},${q(mpn, "mpn")})`;
      })
      .join(",");
    await prisma.$executeRawUnsafe(
      `UPDATE p SET gtin = COALESCE(p.gtin, v.g), hsCode = COALESCE(p.hsCode, v.h), unspscCode = COALESCE(p.unspscCode, v.u), standardUnit = COALESCE(p.standardUnit, v.s), canonicalManufacturerPartNumber = COALESCE(p.canonicalManufacturerPartNumber, v.m)
       FROM product_master p JOIN (VALUES ${values}) AS v(id, g, h, u, s, m) ON p.id = v.id`,
    );
    n += group.length;
    if (n % 4000 === 0) console.log(`  catalogue updated: ${n}`);
  }
  console.log(`Catalogue: filled blanks on ${n} entries`);
  return n;
}

/** Blanks the deterministic "gap" fields on simulated catalogue entries (only entries generated by the scale load). */
async function applyGaps() {
  const rows = await prisma.productMaster.findMany({ where: { isSimulated: true, sourceStandard: "SIM-SCALE" }, select: { id: true }, orderBy: { id: "asc" } });
  const cols: Record<string, string> = { gtin: "gtin", hs: "hsCode", unspsc: "unspscCode", unit: "standardUnit", mpn: "canonicalManufacturerPartNumber" };
  const counts: Record<string, number> = {};
  for (const [field, col] of Object.entries(cols)) {
    const ids = rows.map((r) => r.id).filter((id) => isGap(id, field));
    counts[field] = ids.length;
    if (dryRun) continue;
    for (const group of chunks(ids, 800)) {
      if (group.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Unexpected id");
      await prisma.$executeRawUnsafe(`UPDATE product_master SET ${col} = NULL WHERE id IN (${group.map((g) => `'${g}'`).join(",")}) AND ${col} IS NOT NULL`);
    }
  }
  console.log(`Catalogue gaps ${dryRun ? "(would blank)" : "blanked"}:`, JSON.stringify(counts));
}

async function demoOrgId(): Promise<string> {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  return demo[0].id;
}

async function addApprovals(orgId: string) {
  const { manufacturers, suppliers, approvedProductIds, projectManufacturers } = await withTenantContext(orgId, async (tx) => {
    const manufacturers = await tx.partner.findMany({ where: { roles: { some: { roleType: "MANUFACTURER" } } }, select: { id: true } });
    const suppliers = await tx.partner.findMany({ where: { roles: { some: { roleType: "SUPPLIER" } } }, select: { id: true } });
    const existing = await tx.productSourceApproval.findMany({ select: { productMasterId: true } });
    return { manufacturers, suppliers, approvedProductIds: new Set(existing.map((e) => e.productMasterId)), projectManufacturers: 0 };
  });
  console.log(`Approvals: ${approvedProductIds.size} products already have one; ${manufacturers.length} manufacturers, ${suppliers.length} suppliers available`);
  if (manufacturers.length === 0) {
    console.log("  no manufacturers in the demo organisation - skipping approvals");
    return 0;
  }
  const need = Math.max(0, APPROVALS_TARGET - approvedProductIds.size);
  if (need === 0 || dryRun) {
    console.log(`  would add ${need} approvals`);
    return need;
  }
  const candidates = await prisma.productMaster.findMany({ where: { isSimulated: true }, select: { id: true }, orderBy: { id: "asc" } });
  const todo = candidates.filter((c) => !approvedProductIds.has(c.id) && hash(c.id + "a") % 100 < 45).slice(0, need);
  const day = 86400000;
  const rows = todo.map((c) => {
    const status = ["APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "PENDING", "REJECTED"][hash(c.id + "st") % 8];
    return {
      organizationId: orgId,
      productMasterId: c.id,
      manufacturerId: pickBy(manufacturers, c.id + "mf").id,
      supplierId: hash(c.id + "sp") % 10 < 7 && suppliers.length ? pickBy(suppliers, c.id + "sup").id : null,
      status,
      approvedAt: status === "APPROVED" ? new Date(Date.now() - (hash(c.id + "d") % 400) * day) : null,
      nextReviewDue: status === "APPROVED" && hash(c.id + "r") % 10 < 8 ? new Date(Date.now() + ((hash(c.id + "n") % 300) - 75) * day) : null,
    };
  });
  for (const group of chunks(rows, 150)) {
    await withTenantContext(orgId, (tx) => tx.productSourceApproval.createMany({ data: group }));
  }
  console.log(`Approvals: added ${rows.length}`);
  return rows.length;
}

async function enrichLogistics(orgId: string) {
  const centroids = new Map<string, { lat: number; lng: number }>();
  for (const c of await prisma.country.findMany({ select: { code: true, latitude: true, longitude: true } })) {
    if (c.latitude != null && c.longitude != null) centroids.set(c.code, { lat: c.latitude, lng: c.longitude });
  }
  console.log(`Logistics: ${centroids.size} country centroids available`);
  if (centroids.size < 20) throw new Error("Country centroids are not seeded (run seed:country-centroids first)");
  const destinations = ["KE", "UG", "TZ", "NG", "GH", "ZA", "ET", "MZ", "ZM", "BD", "PK", "IN"].filter((c) => centroids.has(c));
  const origins = ["IN", "CN", "DE", "GB", "FR", "BE", "NL", "TR", "ZA", "KE", "VN", "BD", "PK"].filter((c) => centroids.has(c));

  const projectIds = await withTenantContext(orgId, (tx) => tx.project.findMany({ select: { id: true }, orderBy: { id: "asc" } }));
  console.log(`Logistics: ${projectIds.length} projects in the demo organisation`);
  const stats = { projectsFilled: 0, linesFilled: 0, metrics: 0, skipped: 0, modeAdjusted: 0 };
  for (const group of chunks(projectIds, 40)) {
    if (dryRun) { stats.metrics += group.length; continue; }
    await withTenantContext(orgId, async (tx) => {
      const projects = await tx.project.findMany({ where: { id: { in: group.map((g) => g.id) } }, include: { lines: true } });
      for (const project of projects) {
        const isSim = project.referenceNumber.startsWith("SIM-");
        const patch: Record<string, unknown> = {};
        if (!project.deliveryCountryCode) patch.deliveryCountryCode = pickBy(destinations, project.id);
        if (!project.freightMode) patch.freightMode = ["AIR", "SEA", "SEA", "AIR", "SEA", "LAND"][hash(project.id + "f") % 6];
        if (!project.incoterm) patch.incoterm = pickBy(["EXW", "FCA", "CIF", "DAP", "DDP"], project.id + "i");
        const delivered = project.status === "COMPLETED" || project.status === "AWARDED";

        // Lines first, so the route can be checked against the freight mode.
        const lineUpdates: { id: string; data: Record<string, unknown> }[] = [];
        for (const line of project.lines) {
          const data: Record<string, unknown> = {};
          if (!line.countryOfManufactureCode) data.countryOfManufactureCode = pickBy(origins, line.id);
          if (line.weightKg == null) data.weightKg = 5 + (hash(line.id + "w") % 19950) / 10;
          if (!line.productCategory) data.productCategory = pickBy(Object.keys(CATALOGUE), line.id + "c");
          if (delivered && !line.goodsCollectedDate) {
            const delivery = new Date(Date.now() - (hash(line.id + "dd") % 200) * 86400000);
            data.goodsDeliveredToClientDate = line.goodsDeliveredToClientDate ?? delivery;
            data.goodsCollectedDate = new Date(delivery.getTime() - (5 + (hash(line.id + "cc") % 35)) * 86400000);
          }
          if (Object.keys(data).length) lineUpdates.push({ id: line.id, data });
        }

        // A simulated road shipment between continents is not credible - move those projects to sea freight.
        const mode0 = (patch.freightMode ?? project.freightMode) as string | null;
        const dest = (patch.deliveryCountryCode ?? project.deliveryCountryCode) as string | null;
        if (isSim && mode0 === "LAND" && dest) {
          const far = project.lines.some((l) => {
            const o = centroids.get(((lineUpdates.find((u) => u.id === l.id)?.data.countryOfManufactureCode as string) ?? l.countryOfManufactureCode) ?? "");
            const d = centroids.get(dest);
            return o && d && Math.abs(o.lat - d.lat) + Math.abs(o.lng - d.lng) > 45;
          });
          if (far) { patch.freightMode = "SEA"; stats.modeAdjusted += 1; }
        }

        if (Object.keys(patch).length) {
          await tx.project.update({ where: { id: project.id }, data: patch });
          stats.projectsFilled += 1;
        }
        for (const u of lineUpdates) {
          await tx.projectLine.update({ where: { id: u.id }, data: u.data });
          stats.linesFilled += 1;
        }

        const updatedLines = project.lines.map((l) => ({ ...l, ...(lineUpdates.find((u) => u.id === l.id)?.data ?? {}) })) as typeof project.lines;
        const modeRaw = (patch.freightMode ?? project.freightMode) as string | null;
        const mode: TransportMode | null = modeRaw === "AIR" || modeRaw === "SEA" || modeRaw === "LAND" ? modeRaw : null;
        const deliveryCountry = (patch.deliveryCountryCode ?? project.deliveryCountryCode) as string | null;
        const incoterm = (patch.incoterm ?? project.incoterm) as string | null;
        for (const line of updatedLines) {
          const result = computeLogisticsMetric({
            manufactureCentroid: line.countryOfManufactureCode ? centroids.get(line.countryOfManufactureCode) ?? null : null,
            destinationCentroid: deliveryCountry ? centroids.get(deliveryCountry) ?? null : null,
            transportMode: mode,
            weightKg: line.weightKg != null ? Number(line.weightKg) : null,
            productCategory: line.productCategory,
            goodsCollectedDate: line.goodsCollectedDate,
            goodsDeliveredToClientDate: line.goodsDeliveredToClientDate,
          });
          if (!result) { stats.skipped += 1; continue; }
          const metric = {
            organizationId: orgId,
            projectId: project.id,
            manufactureCountryCode: line.countryOfManufactureCode,
            destinationCountryCode: deliveryCountry,
            transportMode: mode,
            incoterm,
            commodityGroup: line.productCategory,
            weightKgUsed: result.weightKgUsed,
            weightEstimated: result.weightEstimated,
            distanceKm: result.distanceKm,
            co2FactorKgPerTonneKm: result.co2FactorKgPerTonneKm,
            co2TotalKg: result.co2TotalKg,
            durationDays: result.durationDays,
            efficiencyScore: result.efficiencyScore,
            scoreBand: result.scoreBand,
            methodologyVersion: result.methodologyVersion,
          };
          await tx.projectLineLogisticsMetric.upsert({ where: { projectLineId: line.id }, create: { projectLineId: line.id, ...metric }, update: metric });
          stats.metrics += 1;
        }
      }
    });
    if (stats.metrics % 800 < 200) console.log(`  logistics progress: ${JSON.stringify(stats)}`);
  }
  console.log("Logistics:", JSON.stringify(stats));
  return stats;
}

async function summary(orgId: string) {
  const cat = {
    total: await prisma.productMaster.count({ where: { isSimulated: true } }),
    missingGtin: await prisma.productMaster.count({ where: { isSimulated: true, gtin: null } }),
    missingHs: await prisma.productMaster.count({ where: { isSimulated: true, hsCode: null } }),
    missingUnspsc: await prisma.productMaster.count({ where: { isSimulated: true, unspscCode: null } }),
    missingUnit: await prisma.productMaster.count({ where: { isSimulated: true, standardUnit: null } }),
  };
  const org = await withTenantContext(orgId, async (tx) => ({
    lines: await tx.projectLine.count(),
    linesWithMetric: await tx.projectLineLogisticsMetric.count(),
    metricsWithDuration: await tx.projectLineLogisticsMetric.count({ where: { durationDays: { not: null } } }),
    approvals: await tx.productSourceApproval.count(),
    approvedWithCountry: await tx.productSourceApproval.count({ where: { status: "APPROVED" } }),
  }));
  console.log("Summary:", JSON.stringify({ catalogue: cat, demoOrganisation: org }, null, 2));
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "ENRICH"}`);
  // ONLY=catalogue limits the run to the catalogue steps (fill blanks + realistic gaps); the logistics pass takes ~45 minutes.
  const catalogueOnly = process.env.ONLY === "catalogue";
  const orgId = await demoOrgId();
  await summary(orgId);
  await enrichCatalogue();
  await applyGaps();
  if (!catalogueOnly) {
    await addApprovals(orgId);
    await enrichLogistics(orgId);
  }
  if (!dryRun) await summary(orgId);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
