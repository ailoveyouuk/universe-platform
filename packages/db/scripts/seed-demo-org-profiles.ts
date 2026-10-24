import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";
import { scopeSubsForProduct } from "../../types/src/supplier-scope";

/**
 * Simulated organisation directory profiles (2026-10-24, requested by Lewis): gives the ~300 simulated platform organisations the profile data
 * the network directory, "Find suppliers", the organisation card and tender eligibility read.
 *   SUPPLIER / MANUFACTURER : directory profile (most published), countries of operation and supply, 4 to 9 listed products, scope of supply
 *                             derived from those products, 1 to 3 certifications (some expiring, a few expired); manufacturers also get the
 *                             manufacturer profile (WHO PQ, SRA approvals, registrations, export markets) and 1 to 3 sites
 *   FUNDER_DONOR            : funder profile      TENDERING_PURCHASING_BODY : tendering body profile      PROCUREMENT_SERVICE_AGENT : agent profile
 *   every other type        : countries of operation and a quality certification
 * Only fills gaps: an organisation or table that already has rows is left alone. Deterministic, simulated, never deletes. DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
const u = (a: number, b: number) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177; x = x ^ (x >>> 16); return ((x >>> 0) % 10000) / 10000; };
const hashStr = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const pick = <T,>(arr: readonly T[], seed: number, k: number): T[] => { const out: T[] = []; for (let i = 0; out.length < Math.min(k, arr.length) && i < 60; i++) { const v = arr[Math.floor(u(seed, i + 1) * arr.length)]; if (!out.includes(v)) out.push(v); } return out; };

const AFRICA = ["KE", "UG", "TZ", "ET", "RW", "NG", "GH", "ZM", "MW", "MZ", "ML", "SN", "CD", "SS", "ZA", "ZW"];
const ASIA = ["IN", "CN", "PK", "BD", "VN", "ID", "TH", "NP"];
const EUROPE = ["GB", "DE", "FR", "NL", "CH", "BE", "IT", "ES", "DK", "SE"];
const OTHER = ["TR", "AE", "US", "JO", "BR", "MX"];
const ALL_C = [...AFRICA, ...ASIA, ...EUROPE, ...OTHER];
const SRAS = ["EMA", "US_FDA", "MHRA", "HEALTH_CANADA", "SWISSMEDIC", "TGA", "PMDA"];
const FOCUS = ["Malaria", "HIV and AIDS", "Tuberculosis", "Maternal and child health", "Immunisation", "Nutrition", "Neglected tropical diseases", "Health systems strengthening", "Emergency response", "Laboratory strengthening", "Water, sanitation and hygiene", "Reproductive health"];
const GROUPS = ["Pharmaceuticals", "Diagnostics", "Reagents", "Laboratory Consumables", "Medical Devices", "Surgical Supplies", "Wound Care", "Personal Protective Equipment", "Cold Chain", "Reproductive Health", "Nutrition", "Vector Control", "Water, Sanitation and Hygiene", "Immunisation", "Kits and Emergency Supplies"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const orgs = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, type: true, countryOfRegistrationCode: true } });
    const products = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, select: { id: true, name: true, category: true, hsCode: true, gtin: true } });
    const countries = new Set((await tx.country.findMany({ select: { code: true } })).map((c) => c.code));
    const byGroup = new Map<string, typeof products>();
    for (const p of products) { const g = p.category.split(".")[0]; (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(p); }
    const groups = GROUPS.filter((g) => (byGroup.get(g)?.length ?? 0) >= 4);
    const types: Record<string, number> = {}; for (const o of orgs) types[o.type] = (types[o.type] ?? 0) + 1;
    console.log(`${orgs.length} simulated organisations; ${products.length} products in ${groups.length} groups. Types: ${JSON.stringify(types)}`);

    const has = async (model: string, ids: string[]) => new Set((await (tx as any)[model].findMany({ where: { organizationId: { in: ids } }, select: { organizationId: true } })).map((r: any) => r.organizationId as string));
    const ids = orgs.map((o) => o.id);
    const [sup, mfr, fun, bod, agt, pres, spres, prod, scope, cert, site] = await Promise.all([
      has("supplierProfile", ids), has("manufacturerProfile", ids), has("funderProfile", ids), has("tenderingBodyProfile", ids), has("procurementAgentProfile", ids),
      has("organizationCountryPresence", ids), has("supplierCountryPresence", ids), has("supplierProduct", ids), has("organizationScope", ids), has("organizationCertification", ids), has("organizationManufacturerSite", ids),
    ]);

    const rows: Record<string, any[]> = { supplierProfile: [], manufacturerProfile: [], funderProfile: [], tenderingBodyProfile: [], procurementAgentProfile: [], organizationCountryPresence: [], supplierCountryPresence: [], supplierProduct: [], organizationScope: [], organizationCertification: [], organizationManufacturerSite: [] };
    const regFix: { id: string; code: string }[] = [];
    const now = Date.now();

    for (const o of orgs) {
      const h = hashStr(o.id);
      const known = ALL_C.filter((c) => countries.has(c)); const home = o.countryOfRegistrationCode && countries.has(o.countryOfRegistrationCode) ? o.countryOfRegistrationCode : known[h % known.length];
      if (!o.countryOfRegistrationCode) regFix.push({ id: o.id, code: home });
      const isMfr = o.type === "MANUFACTURER", isSup = o.type === "SUPPLIER";
      const domain = `${slug(o.name)}.example.com`;

      // countries of operation
      if (!pres.has(o.id)) {
        const extra = pick(ALL_C.filter((c) => countries.has(c)), h, isSup || isMfr ? 2 : 1);
        for (const c of new Set([home, ...extra])) rows.organizationCountryPresence.push({ id: randomUUID(), organizationId: o.id, countryCode: c });
      }

      if (isSup || isMfr) {
        if (!sup.has(o.id)) rows.supplierProfile.push({
          id: randomUUID(), organizationId: o.id, description: `${o.name} supplies quality-assured health commodities to public-sector and NGO buyers across ${pick(AFRICA, h, 3).join(", ")} (simulated profile).`,
          website: `https://www.${domain}`, contactName: "Sales desk (simulated)", contactEmail: `sales@${domain}`, contactPhone: `+${40 + (h % 40)} 20 ${String(1000 + (h % 8999))} ${String(1000 + ((h >> 4) % 8999))}`,
          publishedAt: u(h, 3) < 0.85 ? new Date(now - Math.floor(u(h, 4) * 300) * DAY) : null,
          principalManufacturersRepresented: isSup ? JSON.stringify(pick(orgs.filter((x) => x.type === "MANUFACTURER").map((x) => x.name), h, 3)) : null,
          wholesaleDistributionLicense: isSup ? `WDA-${String(100000 + (h % 899999))}` : null, warehousingCapability: isSup ? ["Ambient warehouse, 2,000 pallets", "Ambient and 2-8°C, 3,500 pallets", "Bonded warehouse with cold room, 5,000 pallets"][h % 3] : null,
          yearsInOperation: 3 + (h % 28),
        });
        if (!spres.has(o.id)) for (const c of new Set([home, ...pick(AFRICA.filter((c) => countries.has(c)), h + 1, 3 + (h % 4))])) rows.supplierCountryPresence.push({ id: randomUUID(), organizationId: o.id, countryCode: c });

        // products and scope
        const myGroups = pick(groups, h + 2, 1 + (h % 3));
        const picked: typeof products = [];
        for (const g of myGroups) picked.push(...pick(byGroup.get(g)!, h + hashStr(g), 3 + (h % 3)));
        if (!prod.has(o.id)) picked.forEach((p, i) => rows.supplierProduct.push({ id: randomUUID(), organizationId: o.id, name: p.name, description: `Listed by ${o.name} (simulated).`, productMasterId: p.id, gtin: p.gtin ?? null, manufacturerPartNumber: `MPN-${String(h % 9999).padStart(4, "0")}-${i + 1}`, isPublished: u(h, 20 + i) < 0.85 }));
        if (!scope.has(o.id)) {
          const subs = new Set<string>();
          for (const p of picked) for (const s of scopeSubsForProduct({ category: p.category, hsCode: p.hsCode, name: p.name })) subs.add(s);
          [...subs].slice(0, 6).forEach((s) => rows.organizationScope.push({ id: randomUUID(), organizationId: o.id, scopeSubId: s }));
        }

        if (isMfr && !mfr.has(o.id)) {
          const pq = u(h, 30) < 0.3;
          rows.manufacturerProfile.push({
            id: randomUUID(), organizationId: o.id, productCategoriesManufactured: JSON.stringify(myGroups), whoPrequalified: pq,
            sraApprovals: JSON.stringify(u(h, 31) < 0.35 ? pick(SRAS, h, 1 + (h % 2)) : []),
            nationalRegistrations: JSON.stringify(pick(ALL_C.filter((c) => countries.has(c)), h + 5, 3 + (h % 5))), otherCertifications: JSON.stringify(pick(["ISO_9001", "ISO_13485", "PICS_GMP", "WHO_GDP"], h, 2)),
            productionCapacitySummary: `Approx. ${(2 + (h % 40)) * 5} million units per year across ${myGroups.join(", ")} (simulated).`,
            currentExportMarkets: JSON.stringify(pick(AFRICA.filter((c) => countries.has(c)), h + 6, 4 + (h % 4))), isLocalManufacturer: u(h, 32) < 0.2,
          });
        }
        if (isMfr && !site.has(o.id)) for (let k = 0; k < 1 + (h % 3); k++) rows.organizationManufacturerSite.push({ id: randomUUID(), organizationId: o.id, locationCountryCode: k === 0 ? home : pick(ALL_C.filter((c) => countries.has(c)), h + k, 1)[0], locationDetail: `Plant ${k + 1}, industrial zone (simulated)`, gmpCertified: u(h, 40 + k) < 0.75, gmpCertificationDetail: u(h, 40 + k) < 0.75 ? "GMP certificate on file (simulated)" : null });
      } else if (o.type === "FUNDER_DONOR" && !fun.has(o.id)) {
        rows.funderProfile.push({ id: randomUUID(), organizationId: o.id, fundingFocusAreas: JSON.stringify(pick(FOCUS, h, 3)), notes: "Simulated funder profile." });
      } else if (o.type === "TENDERING_PURCHASING_BODY" && !bod.has(o.id)) {
        rows.tenderingBodyProfile.push({ id: randomUUID(), organizationId: o.id, bodyType: ["GOVERNMENT", "FAITH_BASED_NETWORK", "NGO_IMPLEMENTING_PARTNER", "MULTILATERAL"][h % 4], fundingSources: JSON.stringify(pick(["Domestic budget", "Global Fund", "Gavi", "World Bank", "Bilateral donors"], h, 2)), hasDirectProcurementAuthority: u(h, 50) < 0.7, usesExternalProcurementAgent: false, diseaseProgramAreas: JSON.stringify(pick(FOCUS, h + 1, 3)), scaleServedSummary: `Serves roughly ${(1 + (h % 30)) * 100} health facilities (simulated).` });
      } else if (o.type === "PROCUREMENT_SERVICE_AGENT" && !agt.has(o.id)) {
        rows.procurementAgentProfile.push({ id: randomUUID(), organizationId: o.id, fundersProgramsOperatedUnder: JSON.stringify(pick(["Global Fund", "Gavi", "USAID", "FCDO", "UNICEF programmes", "World Bank"], h, 2)), productCategoriesProcured: JSON.stringify(pick(groups, h, 4)), clientTypesServed: JSON.stringify(pick(["Ministries of health", "NGOs", "Faith-based networks", "Donor programmes"], h, 2)), accreditations: JSON.stringify(pick(["ISO 9001", "WHO GDP", "ISO 14001"], h, 2)), logisticsCapability: ["OWN", "SUBCONTRACTED", "MIXED"][hashStr(o.id) % 3], yearsOperatingInRole: 4 + (h % 22), insuranceCoverSummary: "Goods-in-transit and professional indemnity (simulated)", insuranceExpiryDate: new Date(now + (30 + (h % 300)) * DAY), trackRecordSummary: `${20 + (h % 180)} procurements completed (simulated).` });
      }

      // certifications
      if (!cert.has(o.id)) {
        const opts = isMfr ? ["GMP", "ISO_13485", "ISO_9001", "MIA"] : isSup ? ["GDP", "WDA", "ISO_9001", "COMPANY_REGISTRATION"] : ["ISO_9001", "COMPANY_REGISTRATION", "BUSINESS_INSURANCE"];
        pick(opts, h + 9, 1 + (h % 3)).forEach((type, i) => {
          const r = u(h, 60 + i);
          const expiresOn = new Date(now + (r < 0.1 ? -((10 + (h % 120)) * DAY) : r < 0.28 ? (5 + (h % 70)) * DAY : (100 + (h % 900)) * DAY));
          rows.organizationCertification.push({ id: randomUUID(), organizationId: o.id, type, title: null, reference: `${type.slice(0, 4)}-${String(10000 + ((h + i * 77) % 89999))}`, issuingBody: ["Bureau Veritas (simulated)", "SGS (simulated)", "National regulator (simulated)", "TÜV (simulated)"][(h + i) % 4], issuedOn: new Date(expiresOn.getTime() - 3 * 365 * DAY), expiresOn, notes: "Simulated certificate." });
        });
      }
    }
    for (const [k, v] of Object.entries(rows)) console.log(`${k}: ${v.length} rows`);
    console.log(`Organisations missing a registration country: ${regFix.length}`);
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }

    const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
    for (const [model, list] of Object.entries(rows)) for (const part of chunk(list, 400)) await (tx as any)[model].createMany({ data: part });
    for (const f of regFix) await tx.organization.update({ where: { id: f.id }, data: { countryOfRegistrationCode: f.code } });
    console.log("Written.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
