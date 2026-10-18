import { randomUUID } from "node:crypto";
import { NAMING } from "./_catalogue-naming";
import { prisma, withPlatformStaffContext, withTenantContext, computeLogisticsMetric, restrictionKey, type TransportMode } from "../src/index";

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


// ---------------------------------------------------------------------------
// Product record fields (added 2026-10-18, Product Database completion step 1): storage, shelf life, hazard class,
// identity (INN/strength/dosage form/brand/pack), regulatory class, intended use, review date, and a few extra identifiers.
// Only entries that have never been enriched (all those fields empty) are touched; COALESCE-style, nothing overwritten.
// ---------------------------------------------------------------------------
interface RecordProfile {
  storage: (noun: string) => { cls: string; cold: boolean; shelf: number };
  regClass: (noun: string) => string;
  intended: (noun: string) => string;
  hazard?: (noun: string) => string | null;
  brands: string[];
  pack: string[];
}
const lc = (n: string) => n.toLowerCase();
const RECORD_PROFILES: Record<string, RecordProfile> = {
  "Laboratory Consumables": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 60 }), regClass: () => "General laboratory use", intended: (n) => `Collection, handling or storage of laboratory samples (${n}).`, brands: ["LabCore", "Sterilex", "BioPlast", "Cellmark"], pack: ["Pack of 500", "Box of 100", "Case of 10 x 100"] },
  Diagnostics: { storage: (n) => (lc(n).includes("elisa") ? { cls: "REFRIGERATED", cold: true, shelf: 18 } : { cls: "CRT", cold: false, shelf: 24 }), regClass: (n) => (/hiv|malaria|elisa/.test(lc(n)) ? "IVD Class C" : "IVD Class B"), intended: (n) => `In vitro diagnostic use by trained health workers (${n}).`, brands: ["DiagnoPlus", "Medisure", "Quickdx", "Veritas Dx"], pack: ["Kit of 25 tests", "Kit of 50 tests", "Kit of 96 tests"] },
  "Medical Devices": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 60 }), regClass: (n) => (/infusion|oxygen|nebuliser/.test(lc(n)) ? "Class IIb" : "Class IIa"), intended: (n) => `Clinical monitoring or treatment support (${n}).`, brands: ["MediTech", "Healix", "Vitalis", "OxyCare"], pack: ["1 unit", "1 unit with accessories", "Carton of 5"] },
  Pharmaceuticals: { storage: (n) => (/injection/.test(lc(n)) ? { cls: "REFRIGERATED", cold: true, shelf: 24 } : { cls: "CRT", cold: false, shelf: 36 }), regClass: (n) => (/paracetamol|ibuprofen|oral rehydration|zinc/.test(lc(n)) ? "OTC" : "Prescription only"), intended: (n) => `Treatment as indicated in national and WHO guidelines (${n}).`, brands: ["Pharmaco", "Curalis", "Medigen", "AfriPharm"], pack: ["Blister pack of 10", "Bottle of 100", "Box of 10 x 10", "Carton of 25 vials"] },
  "Personal Protective Equipment": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 60 }), regClass: (n) => (/respirator/.test(lc(n)) ? "PPE Category III (FFP2/N95)" : "PPE Category I"), intended: (n) => `Protection of health workers against infection and contamination (${n}).`, brands: ["ShieldOne", "SafeGuard", "ProtectaMed", "Barrier+"], pack: ["Box of 100", "Box of 50", "Case of 10 boxes"] },
  "Cold Chain": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 120 }), regClass: () => "WHO PQS category equipment", intended: (n) => `Maintaining the vaccine cold chain (${n}).`, brands: ["ArcticPro", "CoolSafe", "Frostline", "Thermavax"], pack: ["1 unit", "Pack of 4", "Carton of 6"] },
  Reagents: { storage: (n) => (/pcr|master mix/.test(lc(n)) ? { cls: "FROZEN", cold: true, shelf: 12 } : /culture/.test(lc(n)) ? { cls: "REFRIGERATED", cold: true, shelf: 12 } : { cls: "CRT", cold: false, shelf: 24 }), regClass: () => "IVD reagent (general)", intended: (n) => `Laboratory testing and sample preparation (${n}).`, hazard: (n) => (/lysis|staining|gram/.test(lc(n)) ? "UN1993 Class 3 (flammable liquid)" : null), brands: ["ReagentLab", "Biomed Reagents", "Genova", "Clearbuffer"], pack: ["Bottle 500 mL", "Bottle 100 mL", "Kit of 10"] },
  "Surgical Supplies": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 60 }), regClass: (n) => (/suture|catheter|scalpel/.test(lc(n)) ? "Class IIa" : "Class I"), intended: (n) => `Surgical procedures in a sterile environment (${n}).`, brands: ["SurgiPro", "Steriline", "Clinix", "Medicut"], pack: ["Box of 10", "Box of 25", "Pack of 5"] },
  "Wound Care": { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 60 }), regClass: () => "Class I", intended: (n) => `Dressing and protection of wounds (${n}).`, brands: ["WoundWell", "Healsure", "DermaCare", "Careplast"], pack: ["Box of 50", "Box of 10", "Pack of 100"] },
  Imaging: { storage: () => ({ cls: "AMBIENT", cold: false, shelf: 36 }), regClass: (n) => (/contrast/.test(lc(n)) ? "Prescription only" : "Class I"), intended: (n) => `Diagnostic imaging support (${n}).`, brands: ["RadiaMed", "ImageCore", "Sonique", "Lumina"], pack: ["Pack of 100", "1 unit", "Tube of 250 g"] },
};
const PHARMA: Record<string, { inn: string; strength: string; form: string }> = {
  "amoxicillin tablets": { inn: "Amoxicillin", strength: "500 mg", form: "Tablet" },
  "paracetamol tablets": { inn: "Paracetamol", strength: "500 mg", form: "Tablet" },
  "oral rehydration salts": { inn: "Oral rehydration salts", strength: "20.5 g/L sachet", form: "Powder for oral solution" },
  "artemether injection": { inn: "Artemether", strength: "80 mg/mL", form: "Solution for injection" },
  "ibuprofen tablets": { inn: "Ibuprofen", strength: "400 mg", form: "Tablet" },
  "zinc dispersible tablets": { inn: "Zinc sulfate", strength: "20 mg", form: "Dispersible tablet" },
};
const RECORD_GAP_PERCENT = 8; // each optional record field is left blank for ~8% of entries, as real catalogues are
const recGap = (id: string, f: string) => hash(`${id}:rec:${f}`) % 100 < RECORD_GAP_PERCENT;

async function enrichProductRecords() {
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, storageClass: null, regulatoryClass: null, shelfLifeMonths: null, brand: null, intendedUse: null },
    select: { id: true, name: true, category: true },
    orderBy: { id: "asc" },
  });
  console.log(`Product records: ${rows.length} simulated entries not yet enriched`);
  if (dryRun || rows.length === 0) return rows.length;
  const esc = (v: string) => v.replace(/'/g, "''");
  const lit = (v: string | null) => (v === null ? "NULL" : `N'${esc(v)}'`);
  const now = Date.now();
  let n = 0;
  for (const group of chunks(rows, 400)) {
    const values = group
      .map((r) => {
        if (!/^[0-9a-f-]{36}$/i.test(r.id)) throw new Error(`Unexpected id ${r.id}`);
        const top = r.category.split(".")[0];
        const profile = RECORD_PROFILES[top] ?? RECORD_PROFILES["Medical Devices"];
        const noun = r.name.split(",")[0];
        const st = profile.storage(noun);
        const pharma = top === "Pharmaceuticals" ? PHARMA[noun] : undefined;
        const controlled = top === "Pharmaceuticals" && hash(r.id + "cs") % 100 < 4 ? 1 : 0;
        const reviewDays = (hash(r.id + "rv") % 700) - 60; // some overdue, most in the next two years
        const review = new Date(now + reviewDays * 86400000).toISOString().slice(0, 10);
        const g = (f: string, v: string | null) => (recGap(r.id, f) ? null : v);
        return `('${r.id}',${lit(g("storage", st.cls))},${st.cold ? 1 : 0},${g("shelf", String(st.shelf)) === null ? "NULL" : st.shelf},${lit(profile.hazard ? profile.hazard(noun) : null)},${controlled},${lit(g("inn", pharma?.inn ?? null))},${lit(g("strength", pharma?.strength ?? null))},${lit(g("form", pharma?.form ?? null))},${lit(g("brand", pickBy(profile.brands, r.id + "br")))},${lit(g("pack", pickBy(profile.pack, r.id + "pk")))},${lit(g("regclass", profile.regClass(noun)))},${lit(g("intended", profile.intended(noun)))},${lit(g("review", review))})`;
      })
      .join(",");
    await prisma.$executeRawUnsafe(
      `UPDATE p SET storageClass = COALESCE(p.storageClass, v.sc), coldChain = CASE WHEN v.cc = 1 THEN 1 ELSE p.coldChain END, shelfLifeMonths = COALESCE(p.shelfLifeMonths, v.sl), hazardClass = COALESCE(p.hazardClass, v.hz), controlledSubstance = CASE WHEN v.cs = 1 THEN 1 ELSE p.controlledSubstance END, inn = COALESCE(p.inn, v.inn), strength = COALESCE(p.strength, v.st), dosageForm = COALESCE(p.dosageForm, v.df), brand = COALESCE(p.brand, v.br), packSize = COALESCE(p.packSize, v.pk), regulatoryClass = COALESCE(p.regulatoryClass, v.rc), intendedUse = COALESCE(p.intendedUse, v.iu), nextReviewDue = COALESCE(p.nextReviewDue, CAST(v.rv AS DATETIME2))
       FROM product_master p JOIN (VALUES ${values}) AS v(id, sc, cc, sl, hz, cs, inn, st, df, br, pk, rc, iu, rv) ON p.id = v.id`,
    );
    n += group.length;
    if (n % 4000 === 0) console.log(`  product records updated: ${n}`);
  }
  console.log(`Product records: enriched ${n} entries`);
  return n;
}

/** Adds a second GTIN (pack level) to ~25% of entries and a UDI-DI to devices/diagnostics. Skips entries that already have extra identifiers. */
async function enrichIdentifiers() {
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, sourceStandard: "SIM-SCALE", gtin: { not: null }, identifiers: { none: {} } },
    select: { id: true, category: true, gtin: true },
    orderBy: { id: "asc" },
  });
  const todo: { productMasterId: string; identifierType: string; value: string; label: string | null }[] = [];
  let seq = 700000;
  for (const r of rows) {
    const top = r.category.split(".")[0];
    if (hash(r.id + "g2") % 100 < 25) {
      seq += 1 + (hash(r.id) % 5);
      todo.push({ productMasterId: r.id, identifierType: "GTIN", value: gtin13(seq), label: "Outer carton" });
    }
    if ((top === "Medical Devices" || top === "Diagnostics") && hash(r.id + "udi") % 100 < 70) {
      todo.push({ productMasterId: r.id, identifierType: "UDI_DI", value: `(01)${gtin13(seq + 900000 + (hash(r.id) % 9999))}`, label: null });
    }
  }
  console.log(`Identifiers: ${todo.length} to add across ${rows.length} entries without extra identifiers`);
  if (dryRun || todo.length === 0) return todo.length;
  let n = 0;
  for (const group of chunks(todo, 250)) {
    await prisma.productIdentifier.createMany({ data: group });
    n += group.length;
  }
  console.log(`Identifiers: added ${n}`);
  return n;
}


const REG_AUTH: Record<string, string[]> = {
  Pharmaceuticals: ["WHO_PQ", "FDA", "EMA", "MHRA", "NATIONAL"],
  "Medical Devices": ["EU_MDR", "FDA", "EU_CE", "NATIONAL"],
  Diagnostics: ["EU_IVDR", "WHO_PQ", "FDA", "NATIONAL"],
};
const REG_SCHEME: Record<string, string> = { WHO_PQ: "WHO prequalification", FDA: "510(k) / NDA", EMA: "Centralised procedure", MHRA: "UK marketing authorisation", EU_MDR: "Regulation (EU) 2017/745", EU_IVDR: "Regulation (EU) 2017/746", EU_CE: "CE marking", NATIONAL: "National registration", SRA: "Stringent regulatory authority" };
const REG_COUNTRY: Record<string, string | null> = { WHO_PQ: null, FDA: "US", EMA: "DE", MHRA: "GB", EU_MDR: "DE", EU_IVDR: "FR", EU_CE: "NL", NATIONAL: "KE", SRA: "CH" };
const REG_REFERENCE: Record<string, (n: number) => string> = {
  WHO_PQ: (n) => `PQ-${1000 + (n % 8999)}`, FDA: (n) => `K${200000 + (n % 799999)}`, EMA: (n) => `EU/1/${20 + (n % 5)}/${1000 + (n % 8999)}`,
  MHRA: (n) => `PLGB ${10000 + (n % 89999)}/${1000 + ((n >> 4) % 8999)}`, EU_MDR: (n) => `MDR-${100000 + (n % 899999)}`, EU_IVDR: (n) => `IVDR-${100000 + (n % 899999)}`,
  EU_CE: (n) => `CE-${100000 + (n % 899999)}`, NATIONAL: (n) => `REG/${2018 + (n % 8)}/${10000 + (n % 89999)}`, SRA: (n) => `SRA-${10000 + (n % 89999)}`,
};

/** Structured regulatory registrations for simulated catalogue entries (Product Database step 2). ~65% of products get 1-2; a realistic tail is expired, expiring or suspended. */
async function enrichRegistrations() {
  const day = 86400000;
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, sourceStandard: "SIM-SCALE", registrations: { none: {} } },
    select: { id: true, category: true },
    orderBy: { id: "asc" },
  });
  const todo: Parameters<typeof prisma.productRegulatoryRegistration.createMany>[0]["data"] = [] as never;
  const list = todo as unknown as Record<string, unknown>[];
  for (const r of rows) {
    if (hash(r.id + "reg") % 100 >= 65) continue;
    const top = r.category.split(".")[0];
    const auths = REG_AUTH[top] ?? ["NATIONAL", "EU_CE", "SRA"];
    const count = hash(r.id + "rc") % 100 < 30 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const authority = auths[hash(`${r.id}:a${i}`) % auths.length];
      const k = hash(`${r.id}:s${i}`) % 100;
      const status = k < 2 ? "SUSPENDED" : k < 3 ? "WITHDRAWN" : "ACTIVE";
      const expiryOffset = k >= 3 && k < 8 ? -(10 + (hash(`${r.id}:e${i}`) % 300)) : k >= 8 && k < 16 ? 5 + (hash(`${r.id}:e${i}`) % 85) : 120 + (hash(`${r.id}:e${i}`) % 1500);
      const issue = new Date(Date.now() + expiryOffset * day - (1095 + (hash(`${r.id}:i${i}`) % 700)) * day);
      list.push({
        productMasterId: r.id, authority, scheme: REG_SCHEME[authority] ?? null, referenceNumber: REG_REFERENCE[authority](hash(`${r.id}:n${i}`)),
        regulatoryClass: top === "Medical Devices" ? ["I", "IIa", "IIb"][hash(r.id + "cl") % 3] : null, countryCode: REG_COUNTRY[authority] ?? null,
        holderName: null, issueDate: issue, expiryDate: new Date(Date.now() + expiryOffset * day), status,
        sourceUrl: null, notes: status === "ACTIVE" ? null : "Status reported by the issuing authority (simulated).",
        verificationLevel: hash(`${r.id}:v${i}`) % 100 < 35 ? "SOURCE_VERIFIED" : "CONTRIBUTED",
        contributedByOrganizationName: "Universe reference data", isSimulated: true,
      });
    }
  }
  console.log(`Registrations: ${list.length} to add across ${rows.length} entries without registrations`);
  if (dryRun || list.length === 0) return list.length;
  let n = 0;
  for (const group of chunks(list, 100)) {
    await prisma.productRegulatoryRegistration.createMany({ data: group as never });
    n += group.length;
  }
  console.log(`Registrations: added ${n}`);
  return n;
}

/** The demo organisation's own "checked and verified" records on ~40% of simulated registrations. */
async function enrichVerifications(orgId: string) {
  const user = await withPlatformStaffContext((tx) => tx.user.findFirst({ where: { organizationId: orgId, isSimulated: false }, select: { id: true } }));
  if (!user) { console.log("Verifications: no demo-organisation user found, skipped"); return 0; }
  const regs = await prisma.productRegulatoryRegistration.findMany({ where: { isSimulated: true, isArchived: false }, select: { id: true, status: true }, orderBy: { id: "asc" } });
  const done = await withTenantContext(orgId, (tx) => tx.productRegistrationVerification.findMany({ where: { organizationId: orgId }, select: { registrationId: true } }));
  const have = new Set(done.map((d) => d.registrationId));
  const day = 86400000;
  const todo = regs.filter((r) => !have.has(r.id) && hash(r.id + "ver") % 100 < 40).map((r) => {
    const k = hash(r.id + "vo") % 100;
    const outcome = r.status !== "ACTIVE" ? "ISSUE_FOUND" : k < 88 ? "VERIFIED" : k < 96 ? "NOT_APPLICABLE" : "ISSUE_FOUND";
    return {
      organizationId: orgId, registrationId: r.id, outcome, jurisdiction: ["United Kingdom", "Kenya", "Uganda", "Nigeria", "Ethiopia"][hash(r.id + "j") % 5],
      notes: outcome === "VERIFIED" ? null : outcome === "NOT_APPLICABLE" ? "Registration relates to a market we do not supply." : "Registration status queried with the issuing authority; supplier asked to confirm.",
      nextReverificationDue: new Date(Date.now() + ((hash(r.id + "rv2") % 500) - 40) * day), verifiedById: user.id,
      verifiedAt: new Date(Date.now() - (hash(r.id + "vd") % 300) * day),
    };
  });
  console.log(`Verifications: ${todo.length} to add`);
  if (dryRun || todo.length === 0) return todo.length;
  for (const group of chunks(todo, 150)) {
    await withTenantContext(orgId, (tx) => tx.productRegistrationVerification.createMany({ data: group }));
  }
  console.log(`Verifications: added ${todo.length}`);
  return todo.length;
}


/** Controlled product documents for products the demo organisation actually uses (records only, no stored files). */
async function enrichProductDocuments(orgId: string) {
  const day = 86400000;
  const users = await withPlatformStaffContext((tx) => tx.user.findMany({ where: { organizationId: orgId, isSimulated: false }, select: { id: true }, orderBy: { id: "asc" }, take: 3 }));
  if (users.length === 0) { console.log("Documents: no demo-organisation user, skipped"); return 0; }
  const used = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 3000 }));
  const ids = used.map((u) => u.productMasterId as string);
  const have = await withTenantContext(orgId, (tx) => tx.productDocument.findMany({ where: { organizationId: orgId }, distinct: ["productMasterId"], select: { productMasterId: true } }));
  const haveSet = new Set(have.map((h) => h.productMasterId));
  const products = await prisma.productMaster.findMany({ where: { id: { in: ids.filter((i) => !haveSet.has(i)).slice(0, 2000) } }, select: { id: true, category: true, name: true } });
  const todo: Record<string, unknown>[] = [];
  for (const p of products) {
    const top = p.category.split(".")[0];
    const kinds = top === "Medical Devices" ? [["CERTIFICATE", "CE certificate"], ["IFU", "Instructions for use"]] : top === "Pharmaceuticals" ? [["CERTIFICATE", "Certificate of analysis template"], ["SPECIFICATION", "Product specification"]] : top === "Diagnostics" ? [["CERTIFICATE", "Performance evaluation certificate"], ["IFU", "Instructions for use"]] : [["SPECIFICATION", "Product specification"], ["SDS", "Safety data sheet"]];
    kinds.forEach(([docType, label], i) => {
      if (hash(`${p.id}:doc${i}`) % 100 >= (i === 0 ? 80 : 55)) return;
      const k = hash(`${p.id}:ds${i}`) % 100;
      const status = k < 78 ? "APPROVED" : "DRAFT";
      const uploader = users[hash(`${p.id}:du${i}`) % users.length].id;
      const approver = users.find((u) => u.id !== uploader)?.id ?? uploader;
      const expOffset = docType === "CERTIFICATE" ? (k < 6 ? -(5 + (hash(`${p.id}:de${i}`) % 200)) : k < 16 ? 5 + (hash(`${p.id}:de${i}`) % 80) : 120 + (hash(`${p.id}:de${i}`) % 900)) : null;
      const created = new Date(Date.now() - (30 + (hash(`${p.id}:dc${i}`) % 500)) * day);
      todo.push({
        organizationId: orgId, productMasterId: p.id, docType, title: `${label} - ${p.name.split(",")[0]}`, version: `${1 + (hash(`${p.id}:dv${i}`) % 3)}.0`, status,
        effectiveDate: created, expiryDate: expOffset === null ? null : new Date(Date.now() + expOffset * day), reviewDueDate: new Date(created.getTime() + 365 * day),
        fileName: null, scanStatus: "NOT_SCANNED", notes: "Simulated record (no file stored).", uploadedById: uploader,
        approvedById: status === "APPROVED" ? approver : null, approvedAt: status === "APPROVED" ? new Date(created.getTime() + 2 * day) : null, isSimulated: true,
      });
    });
  }
  console.log(`Documents: ${todo.length} to add across ${products.length} products`);
  if (dryRun || todo.length === 0) return todo.length;
  for (const group of chunks(todo, 80)) await withTenantContext(orgId, (tx) => tx.productDocument.createMany({ data: group as never }));
  console.log(`Documents: added ${todo.length}`);
  return todo.length;
}


const SERIES = ["Classic", "Plus", "Pro", "Lite", "Advance", "Essential", "Select", "Care", "Prime", "Core", "Flex", "One", "Vita", "Medi", "Safe", "Ultra", "Pure", "Nova", "Apex", "Aura", "Beacon", "Bright", "Clear", "Comfort", "Delta", "Eco", "Elite", "First", "Guard", "Harbour", "Ideal", "Journey", "Keystone", "Lumen", "Meridian", "Native", "Optima", "Pioneer", "Quest", "Reliant", "Sterling", "Trust", "Unity", "Vanguard", "Wellspring", "Zenith", "Allied", "Summit"];
const capital = (t: string) => (t.length ? t[0].toUpperCase() + t.slice(1) : t);

/**
 * Product families (step 3b, 2026-10-18). Regroups the simulated catalogue into families with variants and replaces the
 * generated "noun, spec, spec #N" names with "Brand Series noun, variant" names (no "#N", no pack details in the family
 * name). A family is (category, noun, brand, series); a variant label is its two specs, made unique within the family.
 * Idempotent: only entries with no family and a "#N" suffix are touched. Simulated entries only.
 */
async function enrichFamilies() {
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, sourceStandard: "SIM-SCALE", productFamilyId: null, name: { contains: "#" } },
    select: { id: true, name: true, category: true, brand: true, inn: true, regulatoryClass: true, intendedUse: true, packSize: true },
    orderBy: { id: "asc" },
  });
  type Member = { id: string; label: string };
  const groups = new Map<string, { name: string; category: string; brand: string | null; inn: string | null; regulatoryClass: string | null; intendedUse: string | null; members: Member[]; used: Set<string> }>();
  for (const r of rows) {
    const m = /^([^,]+),\s*([^,]+),\s*([^#]+?)\s*#\d+$/.exec(r.name);
    if (!m) continue;
    const noun = m[1].trim();
    const spec1 = m[2].trim();
    let spec2 = m[3].trim();
    const top = r.category.split(".")[0];
    const naming = NAMING[top];
    const series = SERIES[hash(`${r.id}:series`) % SERIES.length];
    const key = `${r.category}|${noun}|${r.brand ?? ""}|${series}`;
    let g = groups.get(key);
    if (!g) {
      g = { name: `${capital(`${r.brand ?? "Generic"} ${series} ${noun}`)}`, category: r.category, brand: r.brand, inn: r.inn, regulatoryClass: r.regulatoryClass, intendedUse: r.intendedUse, members: [], used: new Set() };
      groups.set(key, g);
    }
    let label = `${spec1}, ${spec2}`;
    // keep variant labels distinct inside the family: rotate the second spec, then fall back to pack size
    if (g.used.has(label) && naming) {
      for (const alt of naming.specs) { if (alt !== spec1 && !g.used.has(`${spec1}, ${alt}`)) { spec2 = alt; label = `${spec1}, ${alt}`; break; } }
    }
    if (g.used.has(label) && r.packSize) label = `${label}, ${r.packSize}`;
    g.used.add(label);
    g.members.push({ id: r.id, label });
    if (!g.inn && r.inn) g.inn = r.inn;
    if (!g.regulatoryClass && r.regulatoryClass) g.regulatoryClass = r.regulatoryClass;
    if (!g.intendedUse && r.intendedUse) g.intendedUse = r.intendedUse;
  }
  const families = [...groups.values()].map((g) => ({ id: randomUUID(), ...g }));
  console.log(`Families: ${families.length} to create covering ${rows.length} products (avg ${(rows.length / Math.max(families.length, 1)).toFixed(1)} variants)`);
  if (dryRun || families.length === 0) return families.length;
  for (const group of chunks(families, 100)) {
    await prisma.productFamily.createMany({
      data: group.map((f) => ({ id: f.id, name: f.name, category: f.category, brand: f.brand, inn: f.inn, regulatoryClass: f.regulatoryClass, intendedUse: f.intendedUse, isSimulated: true, addedByOrganizationName: "Universe reference data" })),
    });
  }
  const links = families.flatMap((f) => f.members.map((m) => ({ id: m.id, familyId: f.id, label: m.label, name: `${f.name}, ${m.label}` })));
  for (const group of chunks(links, 300)) {
    const values = group.map((l) => {
      if (!/^[0-9a-f-]{36}$/i.test(l.id) || !/^[0-9a-f-]{36}$/i.test(l.familyId)) throw new Error("Unexpected id");
      return `('${l.id}','${l.familyId}',N'${l.label.replace(/'/g, "''")}',N'${l.name.replace(/'/g, "''")}')`;
    });
    await prisma.$executeRawUnsafe(`UPDATE p SET productFamilyId = v.f, variantLabel = v.l, name = v.n FROM product_master p JOIN (VALUES ${values.join(",")}) AS v(id, f, l, n) ON p.id = v.id`);
  }
  console.log(`Families: created ${families.length}, linked ${links.length} variants`);
  return families.length;
}

/**
 * Variant relabelling (step 3b follow-up, 2026-10-18). The labels produced when families were first created came from the old
 * generated names and read oddly ("pack of 100, blister pack of 10"). A variant label is now built from the product's own
 * clean fields (strength, pack size), made unique within the family with the last four digits of its GTIN, and the full name
 * is "<family>, <label>". Idempotent: only rows whose label or name would change are written. Simulated entries only.
 */
async function relabelVariants() {
  const fams = new Map((await prisma.productFamily.findMany({ where: { isSimulated: true }, select: { id: true, name: true } })).map((f) => [f.id, f.name]));
  const rows = await prisma.productMaster.findMany({
    where: { isSimulated: true, productFamilyId: { not: null } },
    select: { id: true, name: true, variantLabel: true, productFamilyId: true, strength: true, packSize: true, gtin: true },
    orderBy: { id: "asc" },
  });
  const used = new Map<string, Set<string>>();
  const changes: { id: string; label: string; name: string }[] = [];
  for (const r of rows) {
    const famName = fams.get(r.productFamilyId as string);
    if (!famName) continue;
    const base = [r.strength, r.packSize].filter((v): v is string => Boolean(v && v.trim())).join(", ");
    let label = base || r.variantLabel || "Standard";
    const set = used.get(r.productFamilyId as string) ?? new Set<string>();
    used.set(r.productFamilyId as string, set);
    if (set.has(label.toLowerCase())) label = `${label} (GTIN …${(r.gtin ?? r.id).slice(-4)})`;
    let n = 2;
    const root = label;
    while (set.has(label.toLowerCase())) label = `${root} #${n++}`.replace(" #", " v");
    set.add(label.toLowerCase());
    const name = `${famName}, ${label}`;
    if (label !== r.variantLabel || name !== r.name) changes.push({ id: r.id, label, name });
  }
  console.log(`Variant labels: ${changes.length} to rewrite across ${rows.length} variants`);
  if (dryRun || changes.length === 0) return changes.length;
  for (const group of chunks(changes, 300)) {
    const values = group.map((l) => {
      if (!/^[0-9a-f-]{36}$/i.test(l.id)) throw new Error("Unexpected id");
      return `('${l.id}',N'${l.label.replace(/'/g, "''")}',N'${l.name.replace(/'/g, "''")}')`;
    });
    await prisma.$executeRawUnsafe(`UPDATE p SET variantLabel = v.l, name = v.n FROM product_master p JOIN (VALUES ${values.join(",")}) AS v(id, l, n) ON p.id = v.id`);
  }
  console.log(`Variant labels: rewrote ${changes.length}`);
  return changes.length;
}

/** Family-level registrations for about 55% of simulated families (apply to every variant). */
async function enrichFamilyRegistrations() {
  const day = 86400000;
  const fams = await prisma.productFamily.findMany({ where: { isSimulated: true, registrations: { none: {} } }, select: { id: true, category: true }, orderBy: { id: "asc" } });
  const list: Record<string, unknown>[] = [];
  for (const f of fams) {
    if (hash(f.id + "freg") % 100 >= 55) continue;
    const top = f.category.split(".")[0];
    const auths = REG_AUTH[top] ?? ["NATIONAL", "EU_CE", "SRA"];
    const count = hash(f.id + "frc") % 100 < 35 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const authority = auths[hash(`${f.id}:fa${i}`) % auths.length];
      const k = hash(`${f.id}:fs${i}`) % 100;
      const status = k < 2 ? "SUSPENDED" : k < 3 ? "WITHDRAWN" : "ACTIVE";
      const expiryOffset = k >= 3 && k < 7 ? -(10 + (hash(`${f.id}:fe${i}`) % 300)) : k >= 7 && k < 14 ? 5 + (hash(`${f.id}:fe${i}`) % 85) : 120 + (hash(`${f.id}:fe${i}`) % 1500);
      list.push({
        productFamilyId: f.id, productMasterId: null, authority, scheme: REG_SCHEME[authority] ?? null, referenceNumber: REG_REFERENCE[authority](hash(`${f.id}:fn${i}`)),
        regulatoryClass: top === "Medical Devices" ? ["I", "IIa", "IIb"][hash(f.id + "fcl") % 3] : null, countryCode: REG_COUNTRY[authority] ?? null,
        issueDate: new Date(Date.now() + expiryOffset * day - (1095 + (hash(`${f.id}:fi${i}`) % 700)) * day), expiryDate: new Date(Date.now() + expiryOffset * day), status,
        notes: status === "ACTIVE" ? "Covers all variants in the family (simulated)." : "Status reported by the issuing authority (simulated).",
        verificationLevel: hash(`${f.id}:fv${i}`) % 100 < 40 ? "SOURCE_VERIFIED" : "CONTRIBUTED", contributedByOrganizationName: "Universe reference data", isSimulated: true,
      });
    }
  }
  console.log(`Family registrations: ${list.length} to add across ${fams.length} families without registrations`);
  if (dryRun || list.length === 0) return list.length;
  for (const group of chunks(list, 100)) await prisma.productRegulatoryRegistration.createMany({ data: group as never });
  console.log(`Family registrations: added ${list.length}`);
  return list.length;
}

/** Packaging level on existing extra identifiers (outer-carton GTINs, UDI-DIs), with units per pack. */
async function enrichPackagingLevels() {
  const rows = await prisma.productIdentifier.findMany({ where: { packagingLevel: null }, select: { id: true, identifierType: true, label: true } });
  const todo = rows.map((r) => ({
    id: r.id,
    level: r.identifierType === "UDI_DI" ? "UNIT" : /carton/i.test(r.label ?? "") ? "OUTER" : "UNIT",
    units: /carton/i.test(r.label ?? "") ? [10, 12, 20, 24, 50, 100][hash(r.id + "u") % 6] : r.identifierType === "UDI_DI" ? 1 : "NULL",
  }));
  console.log(`Packaging levels: ${todo.length} identifiers to classify`);
  if (dryRun || todo.length === 0) return todo.length;
  for (const group of chunks(todo, 400)) {
    const values = group.map((t) => {
      if (!/^[0-9a-f-]{36}$/i.test(t.id)) throw new Error("Unexpected id");
      return `('${t.id}','${t.level}',${t.units})`;
    });
    await prisma.$executeRawUnsafe(`UPDATE i SET packagingLevel = v.lv, unitsPerPack = v.u FROM product_identifiers i JOIN (VALUES ${values.join(",")}) AS v(id, lv, u) ON i.id = v.id`);
  }
  console.log(`Packaging levels: classified ${todo.length}`);
  return todo.length;
}

/** The demo organisation's own family-level controlled documents for families whose variants it uses. */
async function enrichFamilyDocuments(orgId: string) {
  const day = 86400000;
  const users = await withPlatformStaffContext((tx) => tx.user.findMany({ where: { organizationId: orgId, isSimulated: false }, select: { id: true }, orderBy: { id: "asc" }, take: 3 }));
  if (users.length === 0) return 0;
  const used = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 3000 }));
  const famSet = new Set<string>();
  for (const g of chunks(used.map((u) => u.productMasterId as string), 500)) {
    for (const p of await prisma.productMaster.findMany({ where: { id: { in: g }, productFamilyId: { not: null } }, select: { productFamilyId: true } })) famSet.add(p.productFamilyId as string);
  }
  const famIds = [...famSet];
  const have = new Set((await withTenantContext(orgId, (tx) => tx.productDocument.findMany({ where: { organizationId: orgId, productFamilyId: { not: null } }, select: { productFamilyId: true } }))).map((h) => h.productFamilyId));
  const fams: { id: string; name: string; category: string }[] = [];
  for (const g of chunks(famIds.filter((i) => !have.has(i)), 500)) fams.push(...(await prisma.productFamily.findMany({ where: { id: { in: g } }, select: { id: true, name: true, category: true } })));
  const todo: Record<string, unknown>[] = [];
  for (const f of fams) {
    if (hash(f.id + "fdoc") % 100 >= 55) continue;
    const top = f.category.split(".")[0];
    const [docType, label] = top === "Pharmaceuticals" ? ["SPECIFICATION", "Product specification"] : top === "Medical Devices" || top === "Diagnostics" ? ["TECHNICAL_FILE", "Technical file summary"] : ["SDS", "Safety data sheet"];
    const k = hash(f.id + "fds") % 100;
    const status = k < 80 ? "APPROVED" : "DRAFT";
    const uploader = users[hash(f.id + "fdu") % users.length].id;
    const approver = users.find((u) => u.id !== uploader)?.id ?? uploader;
    const created = new Date(Date.now() - (30 + (hash(f.id + "fdc") % 500)) * day);
    todo.push({
      organizationId: orgId, productFamilyId: f.id, productMasterId: null, docType, title: `${label} - ${f.name}`, version: `${1 + (hash(f.id + "fdv") % 3)}.0`, status,
      effectiveDate: created, expiryDate: docType === "TECHNICAL_FILE" ? new Date(Date.now() + (k < 8 ? -(5 + (hash(f.id + "fde") % 150)) : 90 + (hash(f.id + "fde") % 800)) * day) : null,
      reviewDueDate: new Date(created.getTime() + 365 * day), scanStatus: "NOT_SCANNED", notes: "Simulated record (no file stored).", uploadedById: uploader,
      approvedById: status === "APPROVED" ? approver : null, approvedAt: status === "APPROVED" ? new Date(created.getTime() + 2 * day) : null, isSimulated: true,
    });
  }
  console.log(`Family documents: ${todo.length} to add`);
  if (dryRun || todo.length === 0) return todo.length;
  for (const group of chunks(todo, 80)) await withTenantContext(orgId, (tx) => tx.productDocument.createMany({ data: group as never }));
  console.log(`Family documents: added ${todo.length}`);
  return todo.length;
}

/**
 * Simulated safety notices and recalls (Product Database step 4). About 70% attach to variants the demo organisation uses on
 * project lines (so line flags and the review queue have realistic content), the rest to other simulated variants and a few
 * to families. Mostly closed or advisory; a handful open, with two critical. The demo organisation has reviewed about half of
 * the open ones. Idempotent: does nothing when simulated notices already exist.
 */
async function enrichSafetyNotices(orgId: string) {
  const day = 86400000;
  if ((await prisma.productSafetyNotice.count({ where: { isSimulated: true } })) > 0) { console.log("Safety notices: simulated notices already present, skipped"); return 0; }
  const users = await withPlatformStaffContext((tx) => tx.user.findMany({ where: { organizationId: orgId, isSimulated: false }, select: { id: true }, orderBy: { id: "asc" }, take: 2 }));
  const used = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 3000 }));
  const usedIds = used.map((u) => u.productMasterId as string).sort();
  const others = await prisma.productMaster.findMany({ where: { isSimulated: true, isArchived: false, id: { notIn: usedIds.slice(0, 400) } }, select: { id: true }, orderBy: { id: "asc" }, take: 400 });
  const fams = await prisma.productFamily.findMany({ where: { isSimulated: true, isArchived: false }, select: { id: true }, orderBy: { id: "asc" }, take: 200 });
  const pick = (ids: string[], n: number, salt: string) => [...ids].sort((a, b) => hash(a + salt) - hash(b + salt)).slice(0, n);
  const targets: { productMasterId: string | null; productFamilyId: string | null }[] = [
    ...pick(usedIds, 30, "sn-used").map((id) => ({ productMasterId: id, productFamilyId: null })),
    ...pick(others.map((o) => o.id), 10, "sn-oth").map((id) => ({ productMasterId: id, productFamilyId: null })),
    ...pick(fams.map((f) => f.id), 6, "sn-fam").map((id) => ({ productMasterId: null, productFamilyId: id })),
  ];
  const TEMPLATES = [
    { noticeType: "RECALL", severity: "CRITICAL", authority: "FDA", title: "Class I recall: sterility assurance failure", summary: "The manufacturer identified a sterile barrier breach on units from specific lots. Affected units may not be sterile.", action: "Stop use and distribution. Quarantine affected lots and return to the supplier.", ref: (n: number) => `Z-${1000 + (n % 8000)}-2026` },
    { noticeType: "RECALL", severity: "HIGH", authority: "MHRA", title: "Class II recall: labelling error on outer carton", summary: "The expiry date printed on the outer carton does not match the primary pack for affected lots.", action: "Check stock against the affected lots and relabel or return.", ref: (n: number) => `EL(26)A/${10 + (n % 80)}` },
    { noticeType: "FIELD_SAFETY_NOTICE", severity: "HIGH", authority: "MANUFACTURER", title: "Field safety notice: software update required", summary: "A software issue may cause delayed alarms. A corrective update is available from the manufacturer.", action: "Apply the update and confirm completion to the manufacturer.", ref: (n: number) => `FSCA-${2600 + (n % 300)}` },
    { noticeType: "SAFETY_ALERT", severity: "MEDIUM", authority: "WHO_PQ", title: "Safety alert: storage instruction clarification", summary: "Revised storage guidance published: product must not be exposed to temperatures above 25 C during transit.", action: "Update storage and transport instructions; review recent shipments.", ref: (n: number) => `WHO/PQ/SA/${100 + (n % 400)}` },
    { noticeType: "FALSIFIED_ALERT", severity: "HIGH", authority: "WHO_PQ", title: "Falsified product alert: counterfeit packs in circulation", summary: "Falsified packs bearing the genuine brand name were detected in several markets. Packs may not contain the stated active ingredient.", action: "Verify batch numbers and supplier chain of custody before receipt.", ref: (n: number) => `WHO MPA ${1 + (n % 12)}/2026` },
    { noticeType: "SAFETY_ALERT", severity: "LOW", authority: "EMA", title: "Advisory: updated product information", summary: "Product information updated with additional guidance on handling. No change to benefit-risk balance.", action: "Circulate the revised information to users.", ref: (n: number) => `EMA/DHPC/${300 + (n % 500)}` },
    { noticeType: "SUPPLY_ALERT", severity: "MEDIUM", authority: "NATIONAL", title: "Supply alert: manufacturing delay", summary: "The manufacturer reports a delay at its filling site. Supply may be constrained for several weeks.", action: "Review open orders and consider alternative approved sources.", ref: (n: number) => `NS-${n % 900}` },
  ];
  const list: Record<string, unknown>[] = [];
  targets.forEach((t, i) => {
    const key = t.productMasterId ?? t.productFamilyId ?? "";
    const tpl = TEMPLATES[hash(key + "tpl") % TEMPLATES.length];
    // Two fixed critical open recalls on used products; otherwise severity as templated, ~35% still open.
    const critical = i === 0 || i === 1;
    const t0 = critical ? TEMPLATES[0] : tpl;
    const open = critical || hash(key + "open") % 100 < 35;
    const issued = new Date(Date.now() - (critical ? 4 + i * 6 : 8 + (hash(key + "iss") % 330)) * day);
    list.push({
      ...t, noticeType: t0.noticeType, severity: t0.severity, authority: t0.authority, referenceNumber: t0.ref(hash(key + "ref")), title: t0.title, summary: t0.summary,
      actionRequired: t0.action, affectedBatches: t0.noticeType === "SUPPLY_ALERT" ? null : `L${2600 + (hash(key + "b1") % 400)}, L${3000 + (hash(key + "b2") % 400)}`,
      countryCodes: hash(key + "cc") % 3 === 0 ? null : ["GB", "KE,UG", "NG,GH", "ET", "US,GB"][hash(key + "cc2") % 5],
      issueDate: issued, status: open ? "OPEN" : "CLOSED", closedDate: open ? null : new Date(issued.getTime() + (14 + (hash(key + "cl") % 60)) * day),
      closedReason: open ? null : "Corrective action completed by the manufacturer; affected lots reconciled.",
      verificationLevel: hash(key + "sv") % 100 < 50 ? "SOURCE_VERIFIED" : "CONTRIBUTED", contributedByOrganizationName: "Universe reference data", isSimulated: true,
    });
  });
  console.log(`Safety notices: ${list.length} to add`);
  if (dryRun || list.length === 0) return list.length;
  const created: { id: string; status: string }[] = [];
  for (const row of list) created.push(await prisma.productSafetyNotice.create({ data: row as never, select: { id: true, status: true } }));
  if (users.length > 0) {
    const reviews = created
      .filter((n) => n.status === "OPEN" ? hash(n.id + "rv") % 100 < 50 : hash(n.id + "rv") % 100 < 80)
      .map((n) => {
        const k = hash(n.id + "ro") % 100;
        const outcome = k < 55 ? "CHECKED_NO_IMPACT" : k < 75 ? "NOT_APPLICABLE" : k < 92 ? "ACTION_TAKEN" : "AFFECTED";
        return { organizationId: orgId, noticeId: n.id, outcome, notes: outcome === "CHECKED_NO_IMPACT" ? null : outcome === "NOT_APPLICABLE" ? "Affected lots were not supplied to our projects." : outcome === "ACTION_TAKEN" ? "Stock quarantined and supplier contacted; replacement requested." : "Affected lot held in the in-country warehouse; recall coordinated with the supplier.", reviewedById: users[hash(n.id + "ru") % users.length].id, reviewedAt: new Date(Date.now() - (hash(n.id + "rd") % 30) * day) };
      });
    for (const group of chunks(reviews, 100)) await withTenantContext(orgId, (tx) => tx.productSafetyNoticeReview.createMany({ data: group }));
    console.log(`Safety notice reviews: added ${reviews.length}`);
  }
  console.log(`Safety notices: added ${created.length}`);
  return created.length;
}

/**
 * Simulated regulatory-watch content for the demo organisation (Product Database step 4b): a week of run records per source,
 * a dozen regulator-style items and advisory matches to simulated products (most pending, two dismissed). All flagged
 * isSimulated, so real organisations never see them and the real daily job never matches against them. Idempotent.
 */
async function enrichRegulatoryWatch(orgId: string) {
  const day = 86400000;
  if ((await prisma.regulatoryWatchItem.count({ where: { isSimulated: true } })) > 0) { console.log("Regulatory watch: simulated content already present, skipped"); return 0; }
  const used = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 3000 }));
  const ids = used.map((u) => u.productMasterId as string).sort((a, b) => hash(a + "w") - hash(b + "w")).slice(0, 12);
  const products = await prisma.productMaster.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, strength: true, gtin: true } });
  const SRC = [
    { source: "OPENFDA_DEVICE", authority: "FDA", severity: "HIGH", noticeType: "RECALL", title: (n: string) => `Class II recall: ${n}`, reason: "Packaging seal may be compromised on specific lots, which could affect sterility." },
    { source: "OPENFDA_DRUG", authority: "FDA", severity: "CRITICAL", noticeType: "RECALL", title: (n: string) => `Class I recall: ${n}`, reason: "Contamination found during routine testing of the affected lots." },
    { source: "MHRA_ALERTS", authority: "MHRA", severity: "MEDIUM", noticeType: "SAFETY_ALERT", title: (n: string) => `Medicines / device safety alert: ${n}`, reason: "Updated safety information and handling advice published by the MHRA." },
  ];
  const items: { id: string; productId: string }[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const t = SRC[i % SRC.length];
    const created = await prisma.regulatoryWatchItem.create({
      data: {
        source: t.source, sourceReference: `SIM-${t.authority}-${2600 + i}`, authority: t.authority, noticeType: t.noticeType, severity: t.severity, title: t.title(p.name).slice(0, 280),
        summary: t.reason, actionRequired: "Check stock against the affected lots and follow the notice instructions.", affectedText: `${p.name}${p.gtin ? ` GTIN ${p.gtin}` : ""} Lot L${3100 + i}`,
        firmName: "Simulated manufacturer", countryCodes: t.authority === "MHRA" ? "GB" : null, issueDate: new Date(Date.now() - (2 + i * 3) * day), status: "OPEN", url: null,
        rawHash: `sim-${i}`, isSimulated: true,
      },
    });
    items.push({ id: created.id, productId: p.id });
    await prisma.regulatoryWatchMatch.create({
      data: {
        itemId: created.id, productMasterId: p.id, confidence: p.gtin && i % 2 === 0 ? 0.95 : 0.6, matchBasis: p.gtin && i % 2 === 0 ? "IDENTIFIER" : "NAME",
        matchDetail: p.gtin && i % 2 === 0 ? `Identifier ${p.gtin} appears in the notice` : `Name and strength ${p.strength ?? ""} appear in the notice`,
        ...(i >= products.length - 2 ? { status: "DISMISSED", reviewedByName: "Platform admin", reviewedAt: new Date(Date.now() - day), reviewNotes: "Different manufacturer; lots not supplied to any project." } : {}),
      },
    });
  }
  for (const source of ["OPENFDA_DEVICE", "OPENFDA_DRUG", "MHRA_ALERTS"]) {
    for (let d = 7; d >= 0; d--) {
      const started = new Date(Date.now() - d * day - 3 * 3600000);
      const failed = source === "MHRA_ALERTS" && d === 5;
      await prisma.regulatoryWatchRun.create({ data: { source, startedAt: started, finishedAt: new Date(started.getTime() + 20000), status: failed ? "FAILED" : "SUCCESS", fetched: failed ? 0 : 20 + hash(source + d) % 60, newItems: failed ? 0 : hash(source + d + "n") % 6, changedItems: failed ? 0 : hash(source + d + "c") % 3, newMatches: failed ? 0 : hash(source + d + "m") % 2, error: failed ? "GOV.UK search returned HTTP 503 (simulated)" : null, isSimulated: true } });
    }
  }
  console.log(`Regulatory watch: added ${items.length} simulated items with matches, and 24 run records`);
  return items.length;
}

/** Renames scale-generated catalogue entries whose noun does not belong to their category. Keeps the "#N" suffix. Names only. */
/**
 * Export / hoarding restrictions (2026-10-18). The real UK list is loaded by the daily job and will not match simulated products,
 * so the demo needs a few clearly labelled SIMULATED entries to show the origin-to-destination check on project lines. Each entry is
 * for a pharmaceutical product that a demo project line sources from a supplier in the restricting country and delivers elsewhere
 * (the UK where such lines exist, otherwise the supplier's own country). Visible only inside a demo organisation. Idempotent.
 */
async function enrichExportRestrictions(orgId: string) {
  if ((await prisma.exportRestriction.count({ where: { isSimulated: true } })) > 0) { console.log("Export restrictions: simulated entries already present, skipped"); return 0; }
  const lines = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({
    where: { archivedAt: null, productMasterId: { not: null }, supplierId: { not: null }, project: { deliveryCountryCode: { not: null } } },
    select: { productMasterId: true, supplier: { select: { countryCode: true } }, project: { select: { deliveryCountryCode: true } } },
    take: 6000,
  }));
  const route = lines.filter((l) => l.supplier?.countryCode && l.project.deliveryCountryCode && l.supplier.countryCode.toUpperCase() !== l.project.deliveryCountryCode.toUpperCase());
  const ids = [...new Set(route.map((l) => l.productMasterId as string))];
  const pharma = await prisma.productMaster.findMany({ where: { id: { in: ids.slice(0, 3000) }, isSimulated: true, inn: { not: null }, category: { startsWith: "Pharmaceuticals" } }, select: { id: true, inn: true, strength: true, dosageForm: true } });
  const originOf = new Map<string, string>();
  for (const l of route) if (!originOf.has(l.productMasterId as string) || l.supplier?.countryCode?.toUpperCase() === "GB") originOf.set(l.productMasterId as string, (l.supplier?.countryCode as string).toUpperCase());
  const picks = pharma.sort((a, b) => (originOf.get(b.id) === "GB" ? 1 : 0) - (originOf.get(a.id) === "GB" ? 1 : 0) || hash(a.id + "x") - hash(b.id + "x")).slice(0, 6);
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const p of picks) {
    const name = (p.inn as string).trim();
    const key = restrictionKey(name, p.strength, p.dosageForm);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      restrictingCountryCode: originOf.get(p.id) as string, source: "MANUAL", sourceKey: `sim|${key}`, medicineName: name, strength: p.strength, form: p.dosageForm, scope: "EXPORT",
      restrictionDate: new Date(Date.now() - (10 + (hash(p.id) % 60)) * 86400000), status: "ACTIVE", sourceUrl: null,
      notes: "Simulated demonstration entry; not a real restriction.", addedByName: "Demo data", isSimulated: true,
    });
  }
  console.log(`Export restrictions: ${rows.length} simulated entries to add`);
  if (dryRun || rows.length === 0) return rows.length;
  await prisma.exportRestriction.createMany({ data: rows as never });
  console.log(`Export restrictions: added ${rows.length}`);
  return rows.length;
}

/** Sample export requests for the demo organisation (pending, approved, rejected, downloaded) so the Data exports page is populated. Idempotent. */
async function enrichExportRequests(orgId: string) {
  const existing = await withTenantContext(orgId, (tx) => tx.dataExportRequest.count({ where: { organizationId: orgId } }));
  if (existing > 0) { console.log("Export requests: already present, skipped"); return 0; }
  const users = await withPlatformStaffContext((tx) => tx.user.findMany({ where: { organizationId: orgId, isSimulated: false }, select: { id: true }, orderBy: { id: "asc" }, take: 3 }));
  if (users.length === 0) { console.log("Export requests: no demo-organisation user, skipped"); return 0; }
  const decider = users.find((u) => u.id !== users[0].id)?.id ?? users[0].id;
  const day = 86400000;
  const rows = [
    { scope: "CATALOGUE", filters: JSON.stringify({ category: "Pharmaceuticals" }), reason: "Benchmarking our medicines range against the wider market ahead of a tender.", status: "PENDING", createdAt: new Date(Date.now() - 1 * day) },
    { scope: "REGISTRATIONS", filters: null, reason: "Checking registration coverage across suppliers before renewing framework agreements.", status: "APPROVED", decidedById: decider, decidedAt: new Date(Date.now() - 2 * day), decisionNote: "Approved for the tender review.", approvedUntil: new Date(Date.now() + 5 * day), createdAt: new Date(Date.now() - 3 * day) },
    { scope: "CATALOGUE", filters: null, reason: "Want a copy of the whole catalogue for our own analysis.", status: "REJECTED", decidedById: decider, decidedAt: new Date(Date.now() - 9 * day), decisionNote: "The whole catalogue is not released. Please request a filtered extract with a specific purpose.", createdAt: new Date(Date.now() - 10 * day) },
    { scope: "CATALOGUE", filters: JSON.stringify({ q: "glove" }), reason: "Compare glove specifications for the new PPE procurement.", status: "DOWNLOADED", decidedById: decider, decidedAt: new Date(Date.now() - 19 * day), decisionNote: "OK.", approvedUntil: new Date(Date.now() - 12 * day), downloadedAt: new Date(Date.now() - 18 * day), rowCount: 1240, createdAt: new Date(Date.now() - 20 * day) },
  ];
  console.log(`Export requests: ${rows.length} to add`);
  if (dryRun) return rows.length;
  await withTenantContext(orgId, (tx) => tx.dataExportRequest.createMany({ data: rows.map((r, i) => ({ organizationId: orgId, requestedById: users[i % users.length].id, ...r })) as never }));
  console.log(`Export requests: added ${rows.length}`);
  return rows.length;
}

async function fixNames() {
  const rows = await prisma.productMaster.findMany({ where: { isSimulated: true, sourceStandard: "SIM-SCALE" }, select: { id: true, name: true, category: true }, orderBy: { id: "asc" } });
  const todo: { id: string; name: string }[] = [];
  for (const r of rows) {
    const naming = NAMING[r.category.split(".")[0]];
    const suffix = /#(\d+)$/.exec(r.name)?.[1];
    if (!naming || !suffix) continue;
    const noun = r.name.split(",")[0];
    if (naming.nouns.includes(noun)) continue; // already consistent (also makes re-runs a no-op)
    const spec1 = pickBy(naming.specs, r.id + "n1");
    let spec2 = pickBy(naming.specs, r.id + "n2");
    if (spec2 === spec1) spec2 = naming.specs[(naming.specs.indexOf(spec1) + 1) % naming.specs.length];
    todo.push({ id: r.id, name: `${pickBy(naming.nouns, r.id + "n0")}, ${spec1}, ${spec2} #${suffix}` });
  }
  console.log(`Names: ${todo.length} entries to rename (of ${rows.length})`);
  if (dryRun) return;
  for (const group of chunks(todo, 400)) {
    const values = group.map((t) => {
      if (!/^[0-9a-f-]{36}$/i.test(t.id)) throw new Error("Unexpected id");
      return `('${t.id}',N'${t.name.replace(/'/g, "''")}')`;
    });
    await prisma.$executeRawUnsafe(`UPDATE p SET name = v.n FROM product_master p JOIN (VALUES ${values.join(",")}) AS v(id, n) ON p.id = v.id`);
  }
  console.log(`Names: renamed ${todo.length}`);
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
  await fixNames();
  await enrichProductRecords();
  await enrichIdentifiers();
  await enrichRegistrations();
  await enrichVerifications(orgId);
  await enrichProductDocuments(orgId);
  await enrichFamilies();
  await relabelVariants();
  await enrichFamilyRegistrations();
  await enrichPackagingLevels();
  await enrichFamilyDocuments(orgId);
  await enrichSafetyNotices(orgId);
  await enrichRegulatoryWatch(orgId);
  await enrichExportRestrictions(orgId);
  await enrichExportRequests(orgId);
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
