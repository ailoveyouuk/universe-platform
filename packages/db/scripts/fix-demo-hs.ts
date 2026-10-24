import { prisma } from "../src/index";
import { imagingHs } from "./_catalogue-naming";

/**
 * Demo-data fixes found by check-hs-mapping (2026-10-24, agreed with Lewis). Simulated products only; nothing deleted. DRY_RUN defaults to true. Idempotent.
 *  1. Imaging: the generated names are consumables and accessories, but all carried equipment HS codes. Each now takes the code for its noun.
 *  2. The 14 hand-entered products whose HS code did not fit their category: gloves, tubes, cryovial, microcentrifuge tube, shoe covers and cotton roll get a
 *     code that fits; suture kits and rapid diagnostic tests keep their (correct) code and move to the category it belongs to (Surgical Supplies, Diagnostics).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const HS_BY_ID: Record<string, string> = {
  "0de48321-391a-4eb3-af72-b1d2540bfc08": "401519", // examination gloves (was 902190)
  "1879a958-2f56-44b9-9add-8579a43c5d90": "401519", // nitrile gloves (was 901890)
  "591e783d-5407-4003-8942-ca37dfd169c6": "392690", // blood collection tube (was 9018.39)
  "8d8cad98-bc97-4549-9622-6c75011ede22": "392690", // capillary blood collection tube
  "70cfe72b-fc34-4340-89c4-893cdbb1943c": "392390", // cryovial (was 901839)
  "ff6bf336-033d-4a83-bd6b-e0b84dd799f3": "392390", // microcentrifuge tube (was 901890)
  "ebbfc1aa-68f5-4d4d-8518-16c4ab29435d": "630790", // shoe covers (was 3926.90)
  "edc8892e-3899-48f9-ac4c-dd5d8e7fb132": "300590", // cotton roll (was 901890)
};
const GROUP_BY_ID: Record<string, string> = {
  "586d5720-0724-41c4-82f6-a0a271174e9a": "Surgical Supplies", "d12ae764-51c8-4382-92d9-c48d889ff910": "Surgical Supplies",
  "5e6d85ed-925e-49d4-bb3b-f1e0654f7b91": "Diagnostics", "e3c46d5e-418c-45e1-b18c-6443539e2b79": "Diagnostics", "e593b6e1-483a-4089-9c3d-a31a2dcff87a": "Diagnostics", "f63fd13c-09ae-486d-ae5a-fd33524bda73": "Diagnostics",
};

async function main() {
  const imaging = await prisma.productMaster.findMany({ where: { isSimulated: true, category: { startsWith: "Imaging" } }, select: { id: true, name: true, hsCode: true } });
  let nImg = 0; const byCode = new Map<string, number>();
  for (const p of imaging) {
    const hs = imagingHs(p.name);
    if (!hs || p.hsCode === hs) continue;
    if (p.hsCode === null) continue; // a deliberate gap stays a gap
    nImg++; byCode.set(hs, (byCode.get(hs) ?? 0) + 1);
    if (!dryRun) await prisma.productMaster.update({ where: { id: p.id }, data: { hsCode: hs } });
  }
  console.log(`${dryRun ? "DRY RUN " : ""}Imaging: ${imaging.length} products, ${nImg} recoded. ${[...byCode].map(([k, n]) => `${k}=${n}`).join(", ")}`);
  let nHs = 0, nCat = 0;
  for (const [id, hs] of Object.entries(HS_BY_ID)) {
    const p = await prisma.productMaster.findFirst({ where: { id, isSimulated: true }, select: { name: true, hsCode: true } });
    if (!p || p.hsCode === hs) continue;
    nHs++; console.log(`hs: ${p.name}: ${p.hsCode} -> ${hs}`);
    if (!dryRun) await prisma.productMaster.update({ where: { id }, data: { hsCode: hs } });
  }
  for (const [id, group] of Object.entries(GROUP_BY_ID)) {
    const p = await prisma.productMaster.findFirst({ where: { id, isSimulated: true }, select: { name: true, category: true } });
    if (!p || p.category.split(".")[0] === group) continue;
    const next = [group, ...p.category.split(".").slice(1)].join(".");
    nCat++; console.log(`category: ${p.name}: ${p.category} -> ${next}`);
    if (!dryRun) await prisma.productMaster.update({ where: { id }, data: { category: next } });
  }
  // Simulated published tenders whose evaluation or award dates fall before closing (SIM-TND-004 was seeded with a later closing time): move them after it.
  const tenders = await prisma.tender.findMany({ where: { isSimulated: true, status: "PUBLISHED", closingAt: { not: null } }, select: { id: true, referenceNumber: true, closingAt: true, evaluationDueAt: true, awardDueAt: true } });
  console.log(`tenders checked: ${tenders.map((t) => t.referenceNumber).join(", ")}`);
  for (const t of tenders) {
    const close = t.closingAt!.getTime();
    if ((t.evaluationDueAt && t.evaluationDueAt.getTime() <= close) || (t.awardDueAt && t.awardDueAt.getTime() <= close)) {
      console.log(`dates: ${t.referenceNumber}: evaluation ${t.evaluationDueAt?.toISOString()} / award ${t.awardDueAt?.toISOString()} -> after closing ${t.closingAt!.toISOString()}`);
      if (!dryRun) await prisma.tender.update({ where: { id: t.id }, data: { evaluationDueAt: new Date(close + 7 * 86400000), awardDueAt: new Date(close + 13 * 86400000) } });
    }
  }
  console.log(`${dryRun ? "DRY RUN " : ""}hand-entered: ${nHs} HS codes, ${nCat} categories`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
