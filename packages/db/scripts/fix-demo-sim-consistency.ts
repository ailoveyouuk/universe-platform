import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Makes the simulated demo data internally consistent (2026-10-20, agreed with Lewis):
 *  1. Lines of simulated projects (SIM-...): the product, product category and description now match what the project title says it
 *     is for (for example "Supply of examination gloves" carries personal protective equipment), and the product is one the line's
 *     manufacturer is approved for where such an approval exists.
 *  2. SIM-CMP complaints are re-linked to match their line: product, stakeholder, and a title and description that fit the product
 *     (temperature complaints are moved to temperature-sensitive products).
 * DRY_RUN defaults to true. Updates only simulated records in the demo organisation. Nothing is deleted.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = <T,>(l: T[], k: string): T => l[hash(k) % l.length];
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const NOUN_CATEGORY: Record<string, string> = {
  "examination gloves": "Personal Protective Equipment", "face mask": "Personal Protective Equipment",
  syringe: "Medical Devices", "infusion set": "Medical Devices", thermometer: "Medical Devices", "pulse oximeter": "Medical Devices", catheter: "Surgical Supplies", "sharps container": "Surgical Supplies", "sterilisation pouch": "Surgical Supplies",
  cryovial: "Laboratory Consumables", "pipette tip": "Laboratory Consumables", "specimen container": "Laboratory Consumables", "centrifuge tube": "Laboratory Consumables", "blood collection tube": "Laboratory Consumables",
  "rapid test kit": "Diagnostics", "culture medium": "Reagents", swab: "Wound Care", bandage: "Wound Care",
};
const TEMP_SENSITIVE = ["Cold Chain", "Pharmaceuticals", "Diagnostics", "Reagents"];
const ISSUES: Record<string, string[]> = {
  PRODUCT_QUALITY: ["Defects found on inspection", "Packaging damaged on arrival", "Failed the incoming quality check"],
  DELIVERY: ["Delivered after the agreed date", "Short shipment against the packing list", "Wrong item delivered"],
  DOCUMENTATION: ["Certificate of analysis missing", "Batch numbers do not match the paperwork", "Import documents incomplete"],
  COLD_CHAIN: ["Temperature logger alarm on receipt", "Cold chain break reported in transit"],
  SERVICE: ["No response to an order query", "Invoice disputed after delivery"],
  SAFETY: ["Adverse event reported with the product", "Suspected counterfeit packaging"],
};

async function demoOrgId(): Promise<string> {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  return demo[0].id;
}
const shortName = (n: string) => n.split(",")[0].slice(0, 80);

async function fixLines(orgId: string) {
  const products = await prisma.productMaster.findMany({ where: { isArchived: false, isSimulated: true }, select: { id: true, name: true, category: true }, orderBy: { id: "asc" } });
  const byCat = new Map<string, typeof products>();
  for (const p of products) { const top = p.category.split(".")[0]; byCat.set(top, [...(byCat.get(top) ?? []), p]); }
  console.log(`Lines: ${products.length} simulated products in ${byCat.size} categories`);
  const approvals = await prisma.productSourceApproval.findMany({ where: { organizationId: orgId, isArchived: false }, select: { productMasterId: true, manufacturerId: true } });
  const approvedBy = new Map<string, Set<string>>();
  for (const a of approvals) { if (!approvedBy.has(a.manufacturerId)) approvedBy.set(a.manufacturerId, new Set()); approvedBy.get(a.manufacturerId)!.add(a.productMasterId); }
  const prodCat = new Map(products.map((p) => [p.id, p.category.split(".")[0]]));
  const prodById = new Map(products.map((p) => [p.id, p]));

  const projects = await withTenantContext(orgId, (tx) => tx.project.findMany({ where: { referenceNumber: { startsWith: "SIM-" } }, select: { id: true, title: true }, orderBy: { id: "asc" } }));
  const themed = projects.map((p) => { const noun = Object.keys(NOUN_CATEGORY).find((n) => p.title.toLowerCase().includes(n)); return { ...p, noun, category: noun ? NOUN_CATEGORY[noun] : null }; });
  console.log(`Lines: ${projects.length} simulated projects, ${themed.filter((p) => p.category).length} with a recognisable product in the title`);
  let changed = 0, matchedApproval = 0, checked = 0;
  for (const group of chunks(themed.filter((p) => p.category), 40)) {
    await withTenantContext(orgId, async (tx) => {
      const lines = await tx.projectLine.findMany({ where: { projectId: { in: group.map((g) => g.id) } }, select: { id: true, projectId: true, manufacturerId: true, productMasterId: true } });
      const cat = new Map(group.map((g) => [g.id, g.category!]));
      for (const l of lines) {
        checked++;
        const want = cat.get(l.projectId)!;
        if (l.productMasterId && prodCat.get(l.productMasterId) === want) continue;
        const pool = byCat.get(want) ?? [];
        if (!pool.length) continue;
        const approved = l.manufacturerId ? pool.filter((p) => approvedBy.get(l.manufacturerId!)?.has(p.id)) : [];
        const chosen = approved.length ? pick(approved, l.id + "ap") : pick(pool, l.id + "pp");
        if (approved.length) matchedApproval++;
        changed++;
        if (dryRun) continue;
        await tx.projectLine.update({ where: { id: l.id }, data: { productMasterId: chosen.id, productCategory: want, clientProductDescription: chosen.name.slice(0, 250) } });
      }
    });
  }
  console.log(`Lines: checked ${checked}, ${dryRun ? "would change" : "changed"} ${changed} (${matchedApproval} on a product the manufacturer is approved for)`);
  return { prodCat, prodById };
}

async function fixComplaints(orgId: string, ctx: { prodCat: Map<string, string>; prodById: Map<string, { id: string; name: string; category: string }> }) {
  let changed = 0, moved = 0, approvalsAdded = 0;
  await withTenantContext(orgId, async (tx) => {
    const cs = await tx.qualityComplaint.findMany({ where: { organizationId: orgId, referenceNumber: { startsWith: "SIM-CMP-" } }, select: { id: true, referenceNumber: true, direction: true, category: true, outcome: true, isSerious: true, flagTemperatureExcursion: true, flagSuspectedFalsified: true, partnerId: true, projectLineId: true, projectId: true, project: { select: { freightForwarderId: true } } } });
    const candidates = await tx.projectLine.findMany({ where: { project: { referenceNumber: { startsWith: "SIM-" }, status: { in: ["COMPLETED", "AWARDED"] }, freightForwarderId: { not: null } }, productMasterId: { not: null } }, select: { id: true, projectId: true, productMasterId: true, manufacturerId: true, supplierId: true, project: { select: { clientId: true, freightForwarderId: true } } }, orderBy: { id: "asc" }, take: 2000 });
    for (const c of cs) {
      let line = c.projectLineId ? await tx.projectLine.findUnique({ where: { id: c.projectLineId }, select: { id: true, projectId: true, productMasterId: true, manufacturerId: true, supplierId: true, project: { select: { clientId: true, freightForwarderId: true } } } }) : null;
      const needsTemp = c.category === "COLD_CHAIN" || c.flagTemperatureExcursion;
      const catOf = (pid?: string | null) => (pid ? ctx.prodCat.get(pid) : undefined);
      if (!line || (needsTemp && !TEMP_SENSITIVE.includes(catOf(line.productMasterId) ?? ""))) {
        const pool = candidates.filter((l) => !needsTemp || TEMP_SENSITIVE.includes(catOf(l.productMasterId) ?? ""));
        if (!pool.length) continue;
        line = pick(pool, c.id + "ln"); moved++;
      }
      const prod = line.productMasterId ? ctx.prodById.get(line.productMasterId) : undefined;
      if (!prod) continue;
      const forwarder = c.partnerId && line.project.freightForwarderId === c.partnerId || (c.direction === "OUTBOUND_SUPPLY_CHAIN" && c.projectLineId == null && false);
      const isFwd = c.referenceNumber >= "SIM-CMP-061";
      const partnerId = c.direction === "INBOUND_CLIENT" ? line.project.clientId : isFwd ? line.project.freightForwarderId : (line.manufacturerId ?? line.supplierId);
      const cat = c.category ?? "PRODUCT_QUALITY";
      const issue = c.flagSuspectedFalsified ? "Suspected counterfeit packaging" : pick(ISSUES[cat] ?? ISSUES.PRODUCT_QUALITY, c.id + "is");
      const title = `${issue}: ${shortName(prod.name)}`;
      void forwarder;
      if (c.direction === "OUTBOUND_SUPPLY_CHAIN" && !isFwd && ["UPHELD", "PARTLY_UPHELD"].includes(c.outcome ?? "") && line.manufacturerId) {
        const has = await tx.productSourceApproval.findFirst({ where: { organizationId: orgId, productMasterId: prod.id, manufacturerId: line.manufacturerId, isArchived: false }, select: { id: true } });
        if (!has) {
          approvalsAdded++;
          if (!dryRun) await tx.productSourceApproval.create({ data: { organizationId: orgId, productMasterId: prod.id, manufacturerId: line.manufacturerId, supplierId: line.supplierId, status: "APPROVED", approvedAt: new Date(Date.now() - 200 * 86400000), nextReviewDue: new Date(Date.now() + 160 * 86400000), notes: "Simulated approval so that the complaint's source-review links can be shown." } });
        }
      }
      changed++;
      if (dryRun) continue;
      await tx.qualityComplaint.update({ where: { id: c.id }, data: { title: title.slice(0, 300), description: `Simulated complaint for the demonstration: ${issue.toLowerCase()} on ${prod.name}.`, projectId: line.projectId, projectLineId: line.id, productMasterId: prod.id, partnerId } });
    }
  });
  console.log(`Complaints: ${dryRun ? "would update" : "updated"} ${changed} (${moved} moved to a more fitting line); source approvals ${dryRun ? "to add" : "added"}: ${approvalsAdded}`);
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "FIX"}`);
  const orgId = await demoOrgId();
  const ctx = await fixLines(orgId);
  await fixComplaints(orgId, ctx);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
