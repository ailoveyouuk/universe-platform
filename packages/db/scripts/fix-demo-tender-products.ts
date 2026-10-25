import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { prisma, withPlatformStaffContext } from "../src/index";
import { makePdf } from "./_pdf";

/**
 * Corrective (2026-10-24): the first run of the tender ecosystem seed picked products by position, so a WASH tender listed paracetamol. This re-points
 * every SIM-ECO tender's three lines at products from the catalogue group the tender is about, and issues a new version of its technical specification
 * (the old version stays as history, superseded) so the file matches the lines. Nothing is deleted. DRY_RUN defaults to true; needs
 * AZURE_STORAGE_CONNECTION_STRING to write the new specification file.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const GROUPS: Record<number, string> = { 1: "Pharmaceuticals", 2: "Diagnostics", 3: "Immunisation", 4: "Reproductive Health", 5: "Water, Sanitation and Hygiene", 6: "Vector Control", 7: "Pharmaceuticals", 8: "Kits and Emergency Supplies", 9: "Nutrition", 10: "Surgical Supplies" };
/** What each line of the tender is about, so the three lines are different products rather than three pack sizes of one. */
const KEYWORDS: Record<number, string[]> = { 1: ["rehydration", "zinc", "salbutamol"], 2: ["HIV", "malaria", "pregnancy"], 3: ["vaccine", "syringe", "safety box"], 4: ["condom", "contraceptive", "oxytocin"], 5: ["tablet", "soap", "kit"], 6: ["net", "residual", "larvicide"], 7: ["amoxicillin", "paracetamol", "ciprofloxacin"], 8: ["emergency health kit", "dignity kit", "kit"], 9: ["therapeutic food", "iron", "formula"], 10: ["scalpel", "forceps", "suture"] };
const slot: Record<number, number> = { 1: 3, 2: 9, 3: 15, 4: 21, 5: 27, 6: 5, 7: 12, 8: 18, 9: 24, 10: 30 };

async function main() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!dryRun && !conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  const svc = !dryRun ? BlobServiceClient.fromConnectionString(conn!) : null;
  await withPlatformStaffContext(async (tx) => {
    const tenders = await tx.tender.findMany({ where: { referenceNumber: { startsWith: "SIM-ECO-" } }, orderBy: { referenceNumber: "asc" }, include: { lines: { orderBy: { lineNumber: "asc" } }, criteria: true } });
    for (const t of tenders) {
      const n = Number(t.referenceNumber.slice(-2));
      const group = GROUPS[n];
      if (!group) continue;
      const pool = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false, category: { startsWith: group } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 60, select: { id: true, name: true } });
      if (pool.length < 3) { console.log(`${t.referenceNumber}: not enough ${group} products; skipped.`); continue; }
      const chosen: { id: string; name: string }[] = [];
      for (let k = 0; k < 3; k++) {
        const hits = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false, category: { startsWith: group }, name: { contains: KEYWORDS[n][k] } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 40, select: { id: true, name: true } });
        const options = hits.filter((h) => !chosen.some((c) => c.id === h.id));
        chosen.push((options.length ? options : pool)[(slot[n] + k) % (options.length || pool.length)]);
      }
      const same = t.lines.every((l, i) => l.productMasterId === chosen[i].id);
      console.log(`${t.referenceNumber} (${group}): ${same ? "already correct" : chosen.map((c) => c.name).join(" | ")}`);
      if (same || dryRun) continue;
      for (let i = 0; i < t.lines.length; i++) await tx.tenderLine.update({ where: { id: t.lines[i].id }, data: { productMasterId: chosen[i].id, description: chosen[i].name } });
      const cur = await tx.tenderDocument.findFirst({ where: { tenderId: t.id, title: "Technical specification", supersededAt: null, archivedAt: null } });
      if (!cur) continue;
      const lineList = t.lines.map((l, i) => `  ${l.lineNumber}. ${chosen[i].name} - ${l.quantity ?? ""} ${l.unit ?? ""} to ${l.destinationCountryCode ?? ""}`);
      const buf = makePdf("Technical specification", [`Reference: ${t.referenceNumber}`, `Tender: ${t.title}`, "", "Version 2 - items corrected to match the tender", "", "SIMULATED DOCUMENT - generated for demonstration only. Not a real tender.", "", "Items required", ...lineList, "", "Quality requirements", "  - Minimum remaining shelf life at delivery as stated on each line", "  - Valid registration in the destination country", "  - Certificate of analysis for every batch", t.tenderType === "FRAMEWORK" ? `  - Framework term ${t.frameworkTermMonths ?? 24} months, call-off method ${t.frameworkCallOffMethod ?? "ROTATION"}` : `  - Incoterm ${t.incoterm ?? "DAP"}`]);
      const blobName = `tender-docs/${t.id}/${randomUUID()}-technical-specification.pdf`;
      const c = svc!.getContainerClient(`org-${t.organizationId}`);
      await c.createIfNotExists();
      await c.getBlockBlobClient(blobName).uploadData(buf, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
      const key = cur.documentKey ?? cur.id;
      await tx.tenderDocument.update({ where: { id: cur.id }, data: { supersededAt: new Date(), documentKey: key } });
      await tx.tenderDocument.create({ data: { organizationId: t.organizationId, tenderId: t.id, title: "Technical specification", docType: "SPECIFICATION", description: cur.description, blobName, fileName: "technical-specification.pdf", fileSizeBytes: buf.length, mimeType: "application/pdf", version: cur.version + 1, documentKey: key } });
    }
    // The published clarification on SIM-ECO-05 referred to a product that is no longer on the tender.
    const stale = await tx.tenderClarification.findMany({ where: { question: { contains: "sodium hypochlorite for line 2" }, tender: { referenceNumber: "SIM-ECO-05" } } });
    console.log(`${stale.length} clarification(s) to reword.`);
    if (!dryRun) for (const c of stale) await tx.tenderClarification.update({ where: { id: c.id }, data: { question: "Are other chlorine-based purification tablets acceptable in place of line 1, if they deliver the same available chlorine per litre?", answer: "Yes, provided they deliver the stated available chlorine per litre and carry the same registration in the destination country." } });
    // The two later frameworks were created with whatever products came first alphabetically; give each three distinct products that suit its title.
    const FWK: Record<string, { group: string; words: string[] }> = {
      "SIM-FWK-002": { group: "Pharmaceuticals", words: ["artemether", "paracetamol", "amoxicillin"] },
      "SIM-FWK-003": { group: "Pharmaceuticals", words: ["rehydration", "zinc", "ciprofloxacin"] },
    };
    for (const [ref, spec] of Object.entries(FWK)) {
      const ft = await tx.tender.findFirst({ where: { referenceNumber: ref, isSimulated: true }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
      if (!ft || ft.lines.length < 3) continue;
      const picks: { id: string; name: string }[] = [];
      for (const w of spec.words) {
        const hits = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false, category: { startsWith: spec.group }, name: { contains: w } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 20, select: { id: true, name: true } });
        const h = hits.find((x) => !picks.some((p) => p.id === x.id));
        if (h) picks.push(h);
      }
      if (picks.length < 3) { console.log(`${ref}: not enough matching products.`); continue; }
      const same = ft.lines.slice(0, 3).every((l, i) => l.productMasterId === picks[i].id);
      console.log(`${ref}: ${same ? "already correct" : picks.map((x) => x.name).join(" | ")}`);
      if (!same && !dryRun) for (let i = 0; i < 3; i++) await tx.tenderLine.update({ where: { id: ft.lines[i].id }, data: { productMasterId: picks[i].id, description: picks[i].name } });
    }
    // SIM-FWK-002 was created with a title that did not match its (medicine) lines.
    const fwk = await tx.tender.findMany({ where: { referenceNumber: "SIM-FWK-002", title: { contains: "nutrition and sanitation" } }, select: { id: true } });
    console.log(`${fwk.length} framework title(s) to correct.`);
    if (!dryRun) for (const f of fwk) await tx.tender.update({ where: { id: f.id }, data: { title: "Framework for antimalarial and analgesic supplies (simulated)" } });
    console.log(dryRun ? "DRY RUN: nothing written." : "Written.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
