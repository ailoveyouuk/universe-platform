import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "../src/index";

/**
 * Simulated buyer-side organisations (2026-10-27, requested by Lewis: "yes please create some"). Simulated data only.
 * Tops each of the three buyer-side kinds up to TARGET simulated organisations (tendering and purchasing bodies, procurement service agents, funders and
 * donors), with invented names, then gives every simulated organisation of those kinds what is missing: its type profile, countries of operation and a
 * published directory profile (the thing "Add from Universe" and the network panel need before an organisation can be seen by name). Fictional names only.
 * Idempotent: existing organisations and rows are left alone. DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const TARGET = 20;
const DAY = 86400000;
const hashStr = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pick = <T,>(arr: readonly T[], seed: number, k: number): T[] => { const out: T[] = []; for (let i = 0; out.length < Math.min(k, arr.length) && i < 80; i++) { const v = arr[(seed * 7 + i * 13 + i * i) % arr.length]; if (!out.includes(v)) out.push(v); } return out; };
const COUNTRIES = ["KE", "UG", "TZ", "ET", "RW", "NG", "GH", "ZM", "MW", "MZ", "ML", "SN", "CD", "ZA", "ZW", "IN", "BD", "NP", "GB", "DE", "CH", "NL", "DK", "SE", "US"];
const PLACES = ["Kilima", "Zambezi Valley", "Lake Region", "Savanna", "Highlands", "Coastal Belt", "Sahel", "Northern Province", "Riverine", "Eastern Province", "Delta", "Rift", "Meridian", "Baobab", "Acacia", "Harmattan", "Monsoon", "Atlas", "Karoo", "Serengeti Plains", "Lakeshore", "Evergreen", "Unity", "Horizon"];
const NAMES: Record<string, string[]> = {
  TENDERING_PURCHASING_BODY: ["Central Medical Stores", "Ministry of Health Procurement Unit", "Mission Health Network", "Community Health Partners", "Regional Health Programme", "Public Health Supply Authority"],
  PROCUREMENT_SERVICE_AGENT: ["Procurement Partners", "Health Sourcing Agency", "Supply Services", "Pooled Procurement Office", "Procurement Collective"],
  FUNDER_DONOR: ["Health Foundation", "Health Trust", "Health Fund", "Global Health Partnership", "Medical Aid Foundation"],
};
const FOCUS = ["Malaria", "HIV and AIDS", "Tuberculosis", "Maternal and child health", "Immunisation", "Nutrition", "Neglected tropical diseases", "Health systems strengthening", "Emergency response", "Laboratory strengthening"];
const GROUPS = ["Pharmaceuticals", "Diagnostics", "Reagents", "Laboratory Consumables", "Medical Devices", "Surgical Supplies", "Wound Care", "Personal Protective Equipment", "Cold Chain", "Reproductive Health", "Nutrition"];

async function main() {
  const countries = new Set((await withPlatformStaffContext((tx) => tx.country.findMany({ select: { code: true } }))).map((c) => c.code));
  const known = COUNTRIES.filter((c) => countries.has(c));
  const types = Object.keys(NAMES) as ("TENDERING_PURCHASING_BODY" | "PROCUREMENT_SERVICE_AGENT" | "FUNDER_DONOR")[];
  const existing = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isSimulated: true, isDemo: false, type: { in: types } }, select: { name: true, slug: true, type: true } }));
  const usedNames = new Set(existing.map((o) => o.name));
  for (const t of types) {
    const have = existing.filter((o) => o.type === t).length;
    const need = Math.max(0, TARGET - have);
    console.log(`${t}: ${have} simulated organisations; ${dryRun ? "[dry run] would create" : "creating"} ${need}`);
    if (dryRun) continue;
    let made = 0;
    for (let i = 0; made < need && i < 400; i++) {
      const name = `${PLACES[(hashStr(t) + i * 5) % PLACES.length]} ${NAMES[t][(i + hashStr(t)) % NAMES[t].length]}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      const org = await createOrganizationWithDefaultRoles({ name, slug: `sim-buyer-${slug(t).slice(0, 8)}-${slug(name)}`, type: t, countryOfRegistrationCode: known[hashStr(name) % known.length] });
      await withPlatformStaffContext((tx) => tx.organization.update({ where: { id: org.id }, data: { isSimulated: true } }));
      made++;
    }
  }

  await withPlatformStaffContext(async (tx) => {
    const orgs = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, type: { in: types }, status: { not: "SUSPENDED" } }, select: { id: true, name: true, type: true, countryOfRegistrationCode: true }, orderBy: { name: "asc" } });
    const ids = orgs.map((o) => o.id);
    const [sp, fp, bp, ap, cp] = await Promise.all([
      tx.supplierProfile.findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } }),
      tx.funderProfile.findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } }),
      tx.tenderingBodyProfile.findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } }),
      tx.procurementAgentProfile.findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } }),
      tx.organizationCountryPresence.findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } }),
    ]);
    const has = (rows: { organizationId: string }[]) => new Set(rows.map((r) => r.organizationId));
    const [hSp, hFp, hBp, hAp, hCp] = [has(sp), has(fp), has(bp), has(ap), has(cp)];
    const now = Date.now();
    const rows = { supplierProfile: [] as any[], funderProfile: [] as any[], tenderingBodyProfile: [] as any[], procurementAgentProfile: [] as any[], organizationCountryPresence: [] as any[] };
    const regFix: { id: string; code: string }[] = [];
    for (const o of orgs) {
      const h = hashStr(o.id);
      const home = o.countryOfRegistrationCode && countries.has(o.countryOfRegistrationCode) ? o.countryOfRegistrationCode : known[h % known.length];
      if (!o.countryOfRegistrationCode) regFix.push({ id: o.id, code: home });
      const domain = `${slug(o.name)}.example.com`;
      if (!hCp.has(o.id)) for (const c of new Set([home, ...pick(known, h, 2)])) rows.organizationCountryPresence.push({ id: randomUUID(), organizationId: o.id, countryCode: c });
      if (!hSp.has(o.id)) rows.supplierProfile.push({ id: randomUUID(), organizationId: o.id, description: `${o.name} (simulated profile). ${o.type === "FUNDER_DONOR" ? "Funds health programmes and commodity purchases" : o.type === "TENDERING_PURCHASING_BODY" ? "Buys health commodities for public and not-for-profit facilities" : "Buys health commodities on behalf of governments, NGOs and donor programmes"}.`, website: `https://www.${domain}`, contactName: "Programme office (simulated)", contactEmail: `office@${domain}`, publishedAt: new Date(now - (20 + (h % 280)) * DAY), yearsInOperation: 4 + (h % 26) });
      if (o.type === "FUNDER_DONOR" && !hFp.has(o.id)) rows.funderProfile.push({ id: randomUUID(), organizationId: o.id, fundingFocusAreas: JSON.stringify(pick(FOCUS, h, 3)), notes: "Simulated funder profile." });
      if (o.type === "TENDERING_PURCHASING_BODY" && !hBp.has(o.id)) rows.tenderingBodyProfile.push({ id: randomUUID(), organizationId: o.id, bodyType: ["GOVERNMENT", "FAITH_BASED_NETWORK", "NGO_IMPLEMENTING_PARTNER", "MULTILATERAL"][h % 4], fundingSources: JSON.stringify(pick(["Domestic budget", "Global Fund", "Gavi", "World Bank", "Bilateral donors"], h, 2)), hasDirectProcurementAuthority: h % 10 < 7, usesExternalProcurementAgent: false, diseaseProgramAreas: JSON.stringify(pick(FOCUS, h + 1, 3)), scaleServedSummary: `Serves roughly ${(1 + (h % 30)) * 100} health facilities (simulated).` });
      if (o.type === "PROCUREMENT_SERVICE_AGENT" && !hAp.has(o.id)) rows.procurementAgentProfile.push({ id: randomUUID(), organizationId: o.id, fundersProgramsOperatedUnder: JSON.stringify(pick(["Global Fund", "Gavi", "USAID", "FCDO", "UNICEF programmes", "World Bank"], h, 2)), productCategoriesProcured: JSON.stringify(pick(GROUPS, h, 4)), clientTypesServed: JSON.stringify(pick(["Ministries of health", "NGOs", "Faith-based networks", "Donor programmes"], h, 2)), accreditations: JSON.stringify(pick(["ISO 9001", "WHO GDP", "ISO 14001"], h, 2)), logisticsCapability: ["OWN", "SUBCONTRACTED", "MIXED"][h % 3], yearsOperatingInRole: 4 + (h % 22), insuranceCoverSummary: "Goods-in-transit and professional indemnity (simulated)", insuranceExpiryDate: new Date(now + (30 + (h % 300)) * DAY), trackRecordSummary: `${20 + (h % 180)} procurements completed (simulated).` });
    }
    console.log(`${orgs.length} simulated buyer-side organisations; ${dryRun ? "[dry run] would add" : "adding"}: ` + Object.entries(rows).map(([k, v]) => `${k} ${v.length}`).join(", ") + `, registration country ${regFix.length}`);
    if (dryRun) return;
    for (const [model, data] of Object.entries(rows)) if (data.length) await (tx as any)[model].createMany({ data });
    for (const r of regFix) await tx.organization.update({ where: { id: r.id }, data: { countryOfRegistrationCode: r.code } });
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
