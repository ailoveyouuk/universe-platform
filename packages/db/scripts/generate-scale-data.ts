import { NAMING } from "./_catalogue-naming";
import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "../src/index";

/**
 * Deterministic scale-data generator (2026-10-17). Produces a large, believable,
 * entirely simulated dataset — hundreds of organisations, thousands of users,
 * tens of thousands of products — for two purposes (Lewis, 2026-10-17):
 *   1. speed-testing every list/search/rollup in a throwaway database (CI), and
 *   2. later loading the same data into the live demo so every screen shows
 *      realistic volume.
 *
 * Everything it creates is recognisable and removable: organisation slugs
 * start with "sim-", user emails end in "@sim.example", shared products carry
 * sourceStandard "SIM-SCALE", and rows inside an existing organisation carry a
 * marker (partner normalizedName starts "simscale", project references start
 * "SIM-", batch numbers start "SIMB", risk titles start "[SIM]", contacts use
 * @sim.example). Same SEED + PROFILE => identical data.
 *
 * Profiles: small / full fill many organisations (for speed testing in a
 * throwaway database). demo (2026-10-17, agreed with Lewis) is the streamlined
 * live-demo load: the large portfolio goes into the existing demo organisation
 * (Organization.isDemo), the other organisations get users only (what Admin
 * shows), and the shared catalogue gets the full product count; nothing is
 * generated that no screen could show.
 *
 * Usage: PROFILE=small|full|demo SEED=1 tsx scripts/generate-scale-data.ts
 */

export interface Profile {
  orgs: number;
  users: number;
  partners: number;
  products: number;
  projects: number;
  linesPerProject: number;
  risks: number;
  batches: number;
  auditRows: number;
  /** Product source approvals (QA / sourcing). */
  approvals: number;
  /** Share of partners left PENDING approval (feeds the QA queue). */
  pendingRate: number;
  /** Demo mode: the portfolio goes into the existing demo organisation instead of the sim organisations. */
  demo?: { users: number };
}

export const PROFILES: Record<string, Profile> = {
  // Quick smoke profile for tests of the generator itself.
  small: { orgs: 12, users: 80, partners: 300, products: 600, projects: 120, linesPerProject: 3, risks: 80, batches: 120, auditRows: 600, approvals: 60, pendingRate: 0.05 },
  // The target from the 2026-10-16 conversation: hundreds of accounts,
  // thousands of users, tens of thousands of products.
  full: { orgs: 300, users: 3000, partners: 12000, products: 30000, projects: 6000, linesPerProject: 4, risks: 4000, batches: 6000, auditRows: 40000, approvals: 3000, pendingRate: 0.04 },
  // The live-demo load: one large portfolio inside the demo organisation, users-only sim organisations,
  // and the full shared catalogue.
  demo: { orgs: 299, users: 3000, partners: 3000, products: 30000, projects: 1500, linesPerProject: 4, risks: 1200, batches: 1500, auditRows: 8000, approvals: 800, pendingRate: 0.04, demo: { users: 120 } },
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FORENAMES = ["Amara", "Ben", "Chen", "Dalia", "Emeka", "Farah", "Gita", "Hugo", "Imani", "Jonas", "Kofi", "Leila", "Mateo", "Nadia", "Omar", "Priya", "Quentin", "Rosa", "Sanjay", "Thandi", "Uma", "Viktor", "Wanjiru", "Xin", "Yusuf", "Zara"];
const SURNAMES = ["Adeyemi", "Banerjee", "Castillo", "Dlamini", "Eriksen", "Fofanah", "Garcia", "Haddad", "Ibrahim", "Jovanovic", "Kamau", "Lindqvist", "Mwangi", "Nakamura", "Okafor", "Patel", "Quispe", "Rahman", "Sithole", "Tanaka", "Umar", "Vargas", "Wekesa", "Xu", "Yilmaz", "Zulu"];
const ORG_A = ["Global", "Pan-African", "Meridian", "Northern", "Coastal", "Highland", "Unity", "Horizon", "Apex", "Evergreen", "Sahel", "Pacific", "Andean", "Nile", "Baltic", "Lakeshore"];
const ORG_B = ["Health Supply", "Medical Logistics", "Procurement Partners", "Pharma Sourcing", "Diagnostics", "Laboratory Services", "Medical Devices", "Care Alliance", "Health Trust", "Supply Network"];
const PRODUCT_CATEGORIES = ["Laboratory Consumables", "Diagnostics", "Medical Devices", "Pharmaceuticals", "Personal Protective Equipment", "Cold Chain", "Reagents", "Surgical Supplies", "Wound Care", "Imaging"];
const PRODUCT_NOUNS = ["examination gloves", "syringe", "cryovial", "rapid test kit", "face mask", "pipette tip", "specimen container", "infusion set", "thermometer", "blood collection tube", "swab", "sharps container", "catheter", "bandage", "centrifuge tube", "culture medium", "pulse oximeter", "sterilisation pouch"];
const PRODUCT_SPEC = ["sterile", "non-sterile", "single-use", "powder-free", "latex-free", "2 mL", "5 mL", "10 mL", "size S", "size M", "size L", "pack of 100", "pack of 50", "box of 25", "WHO-PQ", "ISO 13485"];
const PARTNER_ROLES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER"];
const PROJECT_STATUS = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED", "AWARDED", "COMPLETED", "UNAWARDED", "DECLINED", "CANCELLED"];
const PROJECT_STATUS_W = [8, 22, 12, 14, 30, 6, 5, 3];
const SEVERITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const LIKELIHOOD = ["RARE", "UNLIKELY", "POSSIBLE", "LIKELY"];
const ORG_TYPES = ["PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY", "MANUFACTURER", "SUPPLIER", "FUNDER_DONOR", "DATA_INSIGHTS_USER"] as const;
const ORG_TYPE_W = [40, 10, 15, 25, 5, 5];

function chunks<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export async function generateScaleData(profileName = "small", seed = 1, log: (m: string) => void = console.log) {
  const p = PROFILES[profileName];
  if (!p) throw new Error(`Unknown profile ${profileName}`);
  const r = rng(seed);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
  const weighted = <T>(arr: readonly T[], w: number[]): T => {
    const total = w.reduce((a, b) => a + b, 0);
    let x = r() * total;
    for (let i = 0; i < arr.length; i++) {
      x -= w[i];
      if (x <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  };
  const t0 = Date.now();
  const lap = (what: string) => log(`${what} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  const insert = async (model: string, rows: unknown[], size = 150) => {
    for (const c of chunks(rows, size)) {
      await withPlatformStaffContext((tx) => (tx as any)[model].createMany({ data: c }));
    }
  };

  // --- Organisations (default roles via the real provisioning path) ---
  const orgs: { id: string; type: string; slug: string }[] = [];
  for (let i = 0; i < p.orgs; i++) {
    const type = weighted(ORG_TYPES, ORG_TYPE_W);
    const slug = `sim-${String(i + 1).padStart(4, "0")}`;
    const org = await createOrganizationWithDefaultRoles({ name: `${pick(ORG_A)} ${pick(ORG_B)} ${i + 1}`, slug, type });
    orgs.push({ id: org.id, type, slug });
  }
  await withPlatformStaffContext((tx) => tx.organization.updateMany({ where: { slug: { startsWith: "sim-" } }, data: { isSimulated: true } }));
  lap(`organisations: ${orgs.length}`);

  // Demo mode: the portfolio lives in the existing demo organisation.
  let demoOrg: { id: string; slug: string } | null = null;
  if (p.demo) {
    const found = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true, slug: true } }));
    if (found.length !== 1) throw new Error(`Demo profile needs exactly one organisation with isDemo=true, found ${found.length}`);
    demoOrg = found[0];
  }
  const roleOrgIds = [...orgs.map((o) => o.id), ...(demoOrg ? [demoOrg.id] : [])];
  const roles = await withPlatformStaffContext((tx) => tx.role.findMany({ where: { organizationId: { in: roleOrgIds } }, select: { id: true, organizationId: true } }));
  const rolesByOrg = new Map<string, string[]>();
  for (const role of roles) rolesByOrg.set(role.organizationId!, [...(rolesByOrg.get(role.organizationId!) ?? []), role.id]);

  // --- Users (skewed: bigger orgs get more) ---
  const orgWeights = orgs.map(() => 0.3 + r() * r() * 6);
  const users: any[] = [];
  const userRoles: any[] = [];
  const usersByOrg = new Map<string, string[]>();
  for (let i = 0; i < p.users; i++) {
    const org = weighted(orgs, orgWeights);
    const id = randomUUID();
    const forename = pick(FORENAMES);
    const surname = pick(SURNAMES);
    users.push({ id, organizationId: org.id, isSimulated: true, email: `${forename}.${surname}.${i + 1}@sim.example`.toLowerCase(), forename, surname, status: r() < 0.82 ? "ACTIVE" : r() < 0.7 ? "INVITED" : "DEACTIVATED" });
    const orgRoles = rolesByOrg.get(org.id) ?? [];
    if (orgRoles.length) userRoles.push({ userId: id, roleId: pick(orgRoles) });
    usersByOrg.set(org.id, [...(usersByOrg.get(org.id) ?? []), id]);
  }
  if (demoOrg && p.demo) {
    // Extra colleagues inside the demo organisation so its Users screen shows scale too.
    for (let i = 0; i < p.demo.users; i++) {
      const id = randomUUID();
      const forename = pick(FORENAMES);
      const surname = pick(SURNAMES);
      users.push({ id, organizationId: demoOrg.id, isSimulated: true, email: `${forename}.${surname}.d${i + 1}@sim.example`.toLowerCase(), forename, surname, status: r() < 0.85 ? "ACTIVE" : "INVITED" });
      const orgRoles = rolesByOrg.get(demoOrg.id) ?? [];
      if (orgRoles.length) userRoles.push({ userId: id, roleId: pick(orgRoles) });
      usersByOrg.set(demoOrg.id, [...(usersByOrg.get(demoOrg.id) ?? []), id]);
    }
  }
  await insert("user", users);
  await insert("userRole", userRoles);
  lap(`users: ${users.length}`);

  // --- Shared product catalogue ---
  const products: any[] = [];
  const productIds: string[] = [];
  for (let i = 0; i < p.products; i++) {
    const id = randomUUID();
    productIds.push(id);
    const category = pick(PRODUCT_CATEGORIES);
    products.push({
      id,
      name: (() => {
        const naming = NAMING[category];
        return naming ? `${pick(naming.nouns)}, ${pick(naming.specs)}, ${pick(naming.specs)} #${i + 1}` : `${pick(PRODUCT_NOUNS)}, ${pick(PRODUCT_SPEC)} #${i + 1}`;
      })(),
      category,
      sourceStandard: "SIM-SCALE",
      isSimulated: true,
      addedByOrganizationId: pick(orgs).id,
    });
  }
  await insert("productMaster", products, 120);
  lap(`products: ${products.length}`);

  // --- Partners & contacts (concentrated in organisations that run projects) ---
  const buyers = demoOrg ? [{ id: demoOrg.id, type: "PROCUREMENT_SERVICE_AGENT", slug: demoOrg.slug }] : orgs.filter((o) => o.type === "PROCUREMENT_SERVICE_AGENT" || o.type === "TENDERING_PURCHASING_BODY");
  // One large organisation (a quarter of all partners and projects) so the per-tenant worst case is exercised, not just averages.
  const whale = buyers[0] ?? orgs[0];
  const COUNTRIES = ["KE", "UG", "TZ", "NG", "GH", "ZA", "IN", "CN", "DE", "GB", "FR", "BE", "NL", "TR", "PK", "BD", "VN", "ET", "MZ", "ZM"];
  const MODES = ["AIR", "SEA", "LAND"];
  const INCOTERMS = ["EXW", "FCA", "CIF", "DAP", "DDP"];
  const MODE_FACTOR: Record<string, number> = { AIR: 0.602, SEA: 0.016, LAND: 0.096 };
  const day = 1000 * 60 * 60 * 24;
  const partners: any[] = [];
  const partnerRoles: any[] = [];
  const contacts: any[] = [];
  const partnersByOrg = new Map<string, string[]>();
  const byOrgRole = new Map<string, string[]>(); // `${orgId}:${role}` -> partner ids
  const partnerCountry = new Map<string, string>();
  const PARTNER_ROLE_W = [15, 30, 40, 15];
  for (let i = 0; i < p.partners; i++) {
    const org = demoOrg ? whale : r() < 0.25 ? whale : buyers.length && r() < 0.9 ? pick(buyers) : pick(orgs);
    const id = randomUUID();
    const name = `${pick(ORG_A)} ${pick(ORG_B)} ${i + 1}`;
    const role = weighted(PARTNER_ROLES, PARTNER_ROLE_W);
    const country = pick(COUNTRIES);
    partnerCountry.set(id, country);
    const approvalStatus = r() < p.pendingRate ? "PENDING" : r() < 0.06 ? "REJECTED" : "APPROVED";
    partners.push({ id, organizationId: org.id, name, normalizedName: "simscale" + name.toLowerCase().replace(/[^a-z0-9]/g, ""), countryCode: country, approvalStatus, riskTier: weighted(["LOW", "MEDIUM", "HIGH"], [60, 30, 10]) });
    partnerRoles.push({ partnerId: id, roleType: role });
    for (let c = 0; c < 2; c++) contacts.push({ organizationId: org.id, partnerId: id, name: `${pick(FORENAMES)} ${pick(SURNAMES)}`, email: `contact${i}-${c}@sim.example` });
    partnersByOrg.set(org.id, [...(partnersByOrg.get(org.id) ?? []), id]);
    const key = `${org.id}:${role}`;
    byOrgRole.set(key, [...(byOrgRole.get(key) ?? []), id]);
  }
  await insert("partner", partners);
  await insert("partnerRole", partnerRoles);
  await insert("contact", contacts);
  lap(`partners: ${partners.length}, contacts: ${contacts.length}`);
  const ofRole = (orgId: string, role: string) => byOrgRole.get(`${orgId}:${role}`) ?? [];
  const pickOr = (list: string[], fallback: string[]) => (list.length ? pick(list) : fallback.length ? pick(fallback) : null);

  // --- Projects, lines & logistics metrics ---
  const projects: any[] = [];
  const lines: any[] = [];
  const metrics: any[] = [];
  const projectsByOrg = new Map<string, string[]>();
  const counters = new Map<string, number>();
  const slugOf = (o: { slug: string }) => (demoOrg ? "DEMO" : o.slug.slice(4));
  for (let i = 0; i < p.projects; i++) {
    const org = demoOrg ? whale : r() < 0.25 ? whale : pick(buyers.length ? buyers : orgs);
    const n = (counters.get(org.id) ?? 0) + 1;
    counters.set(org.id, n);
    const id = randomUUID();
    const clients = ofRole(org.id, "CLIENT");
    const orgPartners = partnersByOrg.get(org.id) ?? [];
    const status = weighted(PROJECT_STATUS, PROJECT_STATUS_W);
    const delivered = status === "COMPLETED" || status === "AWARDED";
    const destination = pick(COUNTRIES);
    const mode = pick(MODES);
    const incoterm = pick(INCOTERMS);
    projects.push({
      id,
      organizationId: org.id,
      referenceNumber: `SIM-${slugOf(org)}-${String(n).padStart(4, "0")}`,
      title: `${pick(["Supply of", "Procurement of", "Framework for", "Emergency order:"])} ${pick(PRODUCT_NOUNS)}`,
      category: r() < 0.9 ? "PROCUREMENT" : "TECHNICAL_ASSISTANCE",
      projectType: r() < 0.35 ? "PHARMACEUTICAL" : "NON_PHARMACEUTICAL",
      status,
      clientId: pickOr(clients, orgPartners),
      deliveryCountryCode: destination,
      freightMode: mode,
      incoterm,
      freightForwarderId: pickOr(ofRole(org.id, "FREIGHT_FORWARDER"), []),
      dueDate: new Date(Date.now() + (r() - 0.4) * day * 240),
    });
    projectsByOrg.set(org.id, [...(projectsByOrg.get(org.id) ?? []), id]);
    const lineCount = 1 + Math.floor(r() * p.linesPerProject * 1.6);
    for (let l = 0; l < lineCount; l++) {
      const lineId = randomUUID();
      const qty = 50 + Math.floor(r() * 5000);
      const unit = Math.round((0.2 + r() * 40) * 100) / 100;
      const manufacturerId = pickOr(ofRole(org.id, "MANUFACTURER"), orgPartners);
      const supplierId = pickOr(ofRole(org.id, "SUPPLIER"), orgPartners);
      const originCountry = (manufacturerId && partnerCountry.get(manufacturerId)) || pick(COUNTRIES);
      const weightKg = Math.round((5 + r() * 2000) * 10) / 10;
      const line: any = {
        id: lineId,
        organizationId: org.id,
        projectId: id,
        clientProductDescription: `${pick(PRODUCT_NOUNS)}, ${pick(PRODUCT_SPEC)}`,
        productMasterId: r() < 0.7 ? pick(productIds) : null,
        productCategory: pick(PRODUCT_CATEGORIES),
        quantity: qty,
        weightKg,
        countryOfManufactureCode: originCountry,
        manufacturerId,
        supplierId,
        supplierUnitPrice: unit,
        supplierPaymentCurrency: "USD",
        supplierTotalPriceReportingCcy: Math.round(unit * qty * 100) / 100,
        salesTotalPriceReportingCcy: Math.round(unit * qty * 1.18 * 100) / 100,
      };
      if (delivered) {
        const projected = new Date(Date.now() - r() * day * 200);
        const late = r() < 0.22;
        const collected = new Date(projected.getTime() - (5 + r() * 25) * day);
        const actual = new Date(projected.getTime() + (late ? 1 + r() * 20 : -r() * 4) * day);
        const inFull = r() > 0.12;
        line.projectedDeliveryDate = projected;
        line.goodsCollectedDate = collected;
        line.goodsDeliveredToClientDate = actual;
        line.actualDeliveryDate = actual;
        line.internalOnTime = !late;
        line.supplierOnTime = r() > 0.18;
        line.quantityReceived = inFull ? qty : Math.floor(qty * (0.7 + r() * 0.25));
        line.supplierInFull = inFull;
        line.projectedDeliveryDate = projected;
      }
      lines.push(line);
      if (r() < 0.6) {
        const base = 800 + r() * 9000;
        const distanceKm = Math.round(base * (mode === "AIR" ? 1.05 : mode === "SEA" ? 1.3 : 1.2) * 10) / 10;
        const factor = MODE_FACTOR[mode];
        const score = Math.max(1, Math.min(10, Math.round(10 - factor * 9 - distanceKm / 6000 + r())));
        metrics.push({
          organizationId: org.id,
          projectId: id,
          projectLineId: lineId,
          manufactureCountryCode: originCountry,
          destinationCountryCode: destination,
          transportMode: mode,
          incoterm,
          commodityGroup: line.productCategory,
          weightKgUsed: weightKg,
          weightEstimated: false,
          distanceKm,
          co2FactorKgPerTonneKm: factor,
          co2TotalKg: Math.round(distanceKm * (weightKg / 1000) * factor * 100) / 100,
          durationDays: delivered ? Math.round(5 + r() * 40) : null,
          efficiencyScore: score,
          scoreBand: score <= 3 ? "RED" : score <= 5 ? "AMBER" : score <= 7 ? "YELLOW" : "GREEN",
        });
      }
    }
  }
  await insert("project", projects);
  await insert("projectLine", lines, 60);
  await insert("projectLineLogisticsMetric", metrics, 100);
  lap(`projects: ${projects.length}, lines: ${lines.length}, logistics metrics: ${metrics.length}`);

  // --- Product source approvals (QA / sourcing) ---
  const approvals: any[] = [];
  for (let i = 0; i < p.approvals; i++) {
    const org = demoOrg ? whale : pick(buyers.length ? buyers : orgs);
    const manufacturerId = pickOr(ofRole(org.id, "MANUFACTURER"), []);
    if (!manufacturerId) continue;
    const status = weighted(["PENDING", "APPROVED", "REJECTED"], [18, 70, 12]);
    approvals.push({
      organizationId: org.id,
      productMasterId: pick(productIds),
      manufacturerId,
      supplierId: r() < 0.7 ? pickOr(ofRole(org.id, "SUPPLIER"), []) : null,
      status,
      approvedAt: status === "APPROVED" ? new Date(Date.now() - r() * day * 400) : null,
      nextReviewDue: status === "APPROVED" && r() < 0.8 ? new Date(Date.now() + (r() - 0.25) * day * 300) : null,
      createdAt: new Date(Date.now() - r() * day * 500),
    });
  }
  await insert("productSourceApproval", approvals);
  lap(`product source approvals: ${approvals.length}`);

  // --- Risks, batches, audit rows ---
  const allProjectIds = [...projectsByOrg.entries()];
  const risks: any[] = [];
  for (let i = 0; i < p.risks; i++) {
    const [orgId, ids] = pick(allProjectIds);
    risks.push({ organizationId: orgId, subjectType: "PROJECT", subjectId: pick(ids), title: `[SIM] Risk ${i + 1}: ${pick(["cold-chain gap", "single-source supplier", "customs delay", "currency exposure", "quality documentation"])}`, severity: pick(SEVERITY), likelihood: pick(LIKELIHOOD), reviewDate: new Date(Date.now() + (r() - 0.3) * day * 120) });
  }
  await insert("riskAssessment", risks);
  const batches: any[] = [];
  for (let i = 0; i < p.batches; i++) {
    const org = demoOrg ? whale : pick(buyers.length ? buyers : orgs);
    batches.push({ organizationId: org.id, productMasterId: pick(productIds), manufacturerId: pickOr(ofRole(org.id, "MANUFACTURER"), []), batchNumber: `SIMB${100000 + i}`, manufacturedDate: new Date(Date.now() - r() * day * 500), expiryDate: new Date(Date.now() + (r() - 0.2) * day * 900), status: weighted(["ACTIVE", "QUARANTINED", "EXPIRED"], [88, 6, 6]) });
  }
  await insert("productBatch", batches);
  const audit: any[] = [];
  for (let i = 0; i < p.auditRows; i++) {
    const [orgId, ids] = pick(allProjectIds);
    audit.push({ organizationId: orgId, tableName: "projects", recordId: pick(ids), fieldName: pick(["status", "title", "dueDate"]), oldValue: "a", newValue: "b", changedAt: new Date(Date.now() - r() * day * 300) });
  }
  await insert("fieldChangeLog", audit, 150);
  lap(`risks: ${risks.length}, batches: ${batches.length}, audit rows: ${audit.length}`);

  return { orgs: orgs.map((o) => o.id), demoOrganizationId: demoOrg?.id ?? null, whaleOrgId: whale.id, busiestOrgId: [...projectsByOrg.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? orgs[0].id };
}

if (require.main === module) {
  generateScaleData(process.env.PROFILE ?? "small", Number(process.env.SEED ?? 1))
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
