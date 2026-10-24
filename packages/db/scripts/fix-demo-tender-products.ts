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
      const chosen = [0, 1, 2].map((k) => pool[(slot[n] * 7 + k * 5) % pool.length]);
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
    console.log(dryRun ? "DRY RUN: nothing written." : "Written.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
