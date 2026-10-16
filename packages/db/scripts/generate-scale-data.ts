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
 * sourceStandard "SIM-SCALE". Same SEED + PROFILE => identical data.
 *
 * Usage: PROFILE=small|full SEED=1 tsx scripts/generate-scale-data.ts
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
}

export const PROFILES: Record<string, Profile> = {
  // Quick smoke profile for tests of the generator itself.
  small: { orgs: 12, users: 80, partners: 300, products: 600, projects: 120, linesPerProject: 3, risks: 80, batches: 120, auditRows: 600 },
  // The target from the 2026-10-16 conversation: hundreds of accounts,
  // thousands of users, tens of thousands of products.
  full: { orgs: 300, users: 3000, partners: 12000, products: 30000, projects: 6000, linesPerProject: 4, risks: 4000, batches: 6000, auditRows: 40000 },
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
  lap(`organisations: ${orgs.length}`);
  const roles = await withPlatformStaffContext((tx) => tx.role.findMany({ where: { organizationId: { in: orgs.map((o) => o.id) } }, select: { id: true, organizationId: true } }));
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
    users.push({ id, organizationId: org.id, email: `${forename}.${surname}.${i + 1}@sim.example`.toLowerCase(), forename, surname, status: r() < 0.82 ? "ACTIVE" : r() < 0.7 ? "INVITED" : "DEACTIVATED" });
    const orgRoles = rolesByOrg.get(org.id) ?? [];
    if (orgRoles.length) userRoles.push({ userId: id, roleId: pick(orgRoles) });
    usersByOrg.set(org.id, [...(usersByOrg.get(org.id) ?? []), id]);
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
      name: `${pick(PRODUCT_NOUNS)}, ${pick(PRODUCT_SPEC)}, ${pick(PRODUCT_SPEC)} #${i + 1}`,
      category,
      sourceStandard: "SIM-SCALE",
      addedByOrganizationId: pick(orgs).id,
    });
  }
  await insert("productMaster", products, 120);
  lap(`products: ${products.length}`);

  // --- Partners & contacts (concentrated in organisations that run projects) ---
  const buyers = orgs.filter((o) => o.type === "PROCUREMENT_SERVICE_AGENT" || o.type === "TENDERING_PURCHASING_BODY");
  const partners: any[] = [];
  const partnerRoles: any[] = [];
  const contacts: any[] = [];
  const partnersByOrg = new Map<string, string[]>();
  for (let i = 0; i < p.partners; i++) {
    const org = buyers.length && r() < 0.9 ? pick(buyers) : pick(orgs);
    const id = randomUUID();
    const name = `${pick(ORG_A)} ${pick(ORG_B)} ${i + 1}`;
    partners.push({ id, organizationId: org.id, name, normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, "") });
    partnerRoles.push({ partnerId: id, roleType: pick(PARTNER_ROLES) });
    for (let c = 0; c < 2; c++) contacts.push({ organizationId: org.id, partnerId: id, name: `${pick(FORENAMES)} ${pick(SURNAMES)}`, email: `contact${i}-${c}@sim.example` });
    partnersByOrg.set(org.id, [...(partnersByOrg.get(org.id) ?? []), id]);
  }
  await insert("partner", partners);
  await insert("partnerRole", partnerRoles);
  await insert("contact", contacts);
  lap(`partners: ${partners.length}, contacts: ${contacts.length}`);

  // --- Projects & lines ---
  const projects: any[] = [];
  const lines: any[] = [];
  const projectsByOrg = new Map<string, string[]>();
  const counters = new Map<string, number>();
  for (let i = 0; i < p.projects; i++) {
    const org = pick(buyers.length ? buyers : orgs);
    const n = (counters.get(org.id) ?? 0) + 1;
    counters.set(org.id, n);
    const id = randomUUID();
    const clients = partnersByOrg.get(org.id) ?? [];
    projects.push({
      id,
      organizationId: org.id,
      referenceNumber: `SIM-${org.slug.slice(4)}-${String(n).padStart(4, "0")}`,
      title: `${pick(["Supply of", "Procurement of", "Framework for", "Emergency order:"])} ${pick(PRODUCT_NOUNS)}`,
      category: r() < 0.9 ? "PROCUREMENT" : "TECHNICAL_ASSISTANCE",
      projectType: r() < 0.35 ? "PHARMACEUTICAL" : "NON_PHARMACEUTICAL",
      status: weighted(PROJECT_STATUS, PROJECT_STATUS_W),
      clientId: clients.length ? pick(clients) : null,
      dueDate: new Date(Date.now() + (r() - 0.4) * 1000 * 60 * 60 * 24 * 240),
    });
    projectsByOrg.set(org.id, [...(projectsByOrg.get(org.id) ?? []), id]);
    const lineCount = 1 + Math.floor(r() * p.linesPerProject * 1.6);
    const orgPartners = partnersByOrg.get(org.id) ?? [];
    for (let l = 0; l < lineCount; l++) {
      const qty = 50 + Math.floor(r() * 5000);
      const unit = Math.round((0.2 + r() * 40) * 100) / 100;
      lines.push({
        organizationId: org.id,
        projectId: id,
        clientProductDescription: `${pick(PRODUCT_NOUNS)}, ${pick(PRODUCT_SPEC)}`,
        productMasterId: r() < 0.7 ? pick(productIds) : null,
        quantity: qty,
        supplierId: orgPartners.length ? pick(orgPartners) : null,
        supplierUnitPrice: unit,
        supplierPaymentCurrency: "USD",
        supplierTotalPriceReportingCcy: Math.round(unit * qty * 100) / 100,
        salesTotalPriceReportingCcy: Math.round(unit * qty * 1.18 * 100) / 100,
      });
    }
  }
  await insert("project", projects);
  await insert("projectLine", lines, 80);
  lap(`projects: ${projects.length}, lines: ${lines.length}`);

  // --- Risks, batches, audit rows ---
  const allProjectIds = [...projectsByOrg.entries()];
  const risks: any[] = [];
  for (let i = 0; i < p.risks; i++) {
    const [orgId, ids] = pick(allProjectIds);
    risks.push({ organizationId: orgId, subjectType: "PROJECT", subjectId: pick(ids), title: `Risk ${i + 1}: ${pick(["cold-chain gap", "single-source supplier", "customs delay", "currency exposure", "quality documentation"])}`, severity: pick(SEVERITY), likelihood: pick(LIKELIHOOD), reviewDate: new Date(Date.now() + (r() - 0.3) * 1000 * 60 * 60 * 24 * 120) });
  }
  await insert("riskAssessment", risks);
  const batches: any[] = [];
  for (let i = 0; i < p.batches; i++) {
    const org = pick(buyers.length ? buyers : orgs);
    batches.push({ organizationId: org.id, productMasterId: pick(productIds), batchNumber: `B${100000 + i}`, expiryDate: new Date(Date.now() + (r() - 0.2) * 1000 * 60 * 60 * 24 * 900), status: weighted(["ACTIVE", "QUARANTINED", "EXPIRED"], [88, 6, 6]) });
  }
  await insert("productBatch", batches);
  const audit: any[] = [];
  for (let i = 0; i < p.auditRows; i++) {
    const [orgId, ids] = pick(allProjectIds);
    audit.push({ organizationId: orgId, tableName: "projects", recordId: pick(ids), fieldName: pick(["status", "title", "dueDate"]), oldValue: "a", newValue: "b", changedAt: new Date(Date.now() - r() * 1000 * 60 * 60 * 24 * 300) });
  }
  await insert("fieldChangeLog", audit, 150);
  lap(`risks: ${risks.length}, batches: ${batches.length}, audit rows: ${audit.length}`);

  return { orgs: orgs.map((o) => o.id), busiestOrgId: [...projectsByOrg.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? orgs[0].id };
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
