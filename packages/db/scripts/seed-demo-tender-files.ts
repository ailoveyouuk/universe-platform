import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Simulated tender files (2026-10-24, requested by Lewis): real PDF files, stored where the app stores them, with matching database rows.
 *   Tender documents  : for every open or closed simulated tender, "Instructions to bidders" and "Technical specification" (one of them in two
 *                       versions, the first superseded), kept in the issuer's container as tender-docs/<tenderId>/<uuid>-<name>.pdf
 *   Bid files         : a wholesale/manufacturing licence certificate on each submitted simulated bid that has none, linked to the licence gate,
 *                       kept in the bidder's container as tender-bids/<tenderId>/<uuid>-<name>.pdf
 *   Contract files    : a signed contract copy on each active or completed contract of those tenders, kept in the issuer's container as
 *                       tender-contracts/<contractId>/<uuid>-<name>.pdf
 * Containers are the same private per-organisation containers the API uses (org-<organizationId>). Every file is plainly marked simulated.
 * Needs AZURE_STORAGE_CONNECTION_STRING (the workflow fetches it after the Azure login). Idempotent: skips tenders, bids and contracts that already have
 * files. DRY_RUN defaults to true and then needs no storage access.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;

/** A small, valid, single-page PDF with plain text lines (Helvetica, A4). */
function makePdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
  const body: string[] = ["BT", "/F1 16 Tf", "56 790 Td", `(${esc(title)}) Tj`, "/F1 10 Tf", "0 -26 Td", "14 TL"];
  for (const l of lines.slice(0, 48)) body.push(`(${esc(l.slice(0, 100))}) Tj T*`);
  body.push("ET");
  const stream = body.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n"; const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "-");

async function main() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!dryRun && !conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  const svc = !dryRun ? BlobServiceClient.fromConnectionString(conn!) : null;
  const ensured = new Set<string>();
  const upload = async (orgId: string, blobName: string, data: Buffer) => {
    const c = svc!.getContainerClient(`org-${orgId}`);
    if (!ensured.has(orgId)) { await c.createIfNotExists(); ensured.add(orgId); }
    await c.getBlockBlobClient(blobName).uploadData(data, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
  };

  await withPlatformStaffContext(async (tx) => {
    const tenders = await tx.tender.findMany({
      where: { isSimulated: true, isPublished: true, archivedAt: null, NOT: { referenceNumber: { startsWith: "SIM-PERF" } } },
      orderBy: [{ referenceNumber: "asc" }],
      include: { lines: { orderBy: { lineNumber: "asc" } }, criteria: { orderBy: { sortOrder: "asc" } } },
    });
    console.log(`${tenders.length} simulated published tenders in scope.`);
    let docs = 0, bidFiles = 0, contractFiles = 0;

    for (const t of tenders) {
      const hasDocs = (await tx.tenderDocument.count({ where: { tenderId: t.id } })) > 0;
      if (!hasDocs) {
        const published = t.publishedAt ?? t.createdAt;
        const header = [`Reference: ${t.referenceNumber}`, `Tender: ${t.title}`, `Issued by organisation id ${t.organizationId.slice(0, 8)} (simulated)`, "", "SIMULATED DOCUMENT - generated for demonstration only. Not a real tender."];
        const lineList = t.lines.map((l) => `  ${l.lineNumber}. ${l.description} - ${l.quantity ?? ""} ${l.unit ?? ""} to ${l.destinationCountryCode ?? ""}`);
        const critList = t.criteria.map((c) => `  - ${c.title}${c.weight ? ` (${c.weight}%)` : c.kind === "GATE" ? " (pass/fail)" : ""}`);
        const specs = [
          { title: "Instructions to bidders", docType: "TERMS", name: "instructions-to-bidders.pdf", description: "How to bid, deadlines, evaluation and award.", versions: 2,
            lines: (v: number) => [...header, "", `Version ${v}${v === 1 ? " (superseded)" : ""}`, "", "1. Purpose", "   This request invites bids for the items listed in the technical specification.", "2. Timetable",
              `   Published: ${published.toISOString().slice(0, 10)}`, `   Questions by: ${t.clarificationDeadline?.toISOString().slice(0, 10) ?? "see tender"}`, `   Closing: ${t.closingAt?.toISOString().slice(0, 10) ?? "see tender"}`,
              "3. Evaluation criteria", ...critList, "4. Bid validity", `   Bids remain valid for ${t.bidValidityDays ?? 90} days.`, "5. Integrity", "   Bidders accept the integrity pledge and declare any exclusion grounds when expressing interest."] },
          { title: "Technical specification", docType: "SPECIFICATION", name: "technical-specification.pdf", description: "Items, quantities, destinations and quality requirements.", versions: 1,
            lines: () => [...header, "", "Items required", ...lineList, "", "Quality requirements", "  - Minimum remaining shelf life at delivery as stated on each line", "  - Valid registration in the destination country", "  - Certificate of analysis for every batch", t.tenderType === "FRAMEWORK" ? `  - Framework term ${t.frameworkTermMonths ?? 24} months, call-off method ${t.frameworkCallOffMethod ?? "ROTATION"}` : "  - Incoterm " + (t.incoterm ?? "DAP")] },
        ];
        for (const s of specs) {
          let key: string | null = null;
          for (let v = 1; v <= s.versions; v++) {
            const blobName = `tender-docs/${t.id}/${randomUUID()}-${safe(s.name)}`;
            const buf = makePdf(s.title, s.lines(v));
            const at = new Date((published.getTime()) + (v - 1) * DAY);
            if (!dryRun) await upload(t.organizationId, blobName, buf);
            const superseded = v < s.versions;
            if (!dryRun) {
              const row: { id: string } = await tx.tenderDocument.create({ data: { organizationId: t.organizationId, tenderId: t.id, title: s.title, docType: s.docType, description: s.description, blobName, fileName: s.name, fileSizeBytes: buf.length, mimeType: "application/pdf", uploadedAt: at, version: v, documentKey: key, supersededAt: superseded ? new Date(at.getTime() + DAY) : null } });
              if (!key) { key = row.id; await tx.tenderDocument.update({ where: { id: row.id }, data: { documentKey: row.id } }); }
            }
            docs++;
          }
        }
      }

      // bid files on submitted bids
      const gate = t.criteria.find((c) => c.kind === "GATE");
      const bids = await tx.tenderBid.findMany({ where: { tenderId: t.id, status: "SUBMITTED" }, select: { id: true, organizationId: true, submittedAt: true } });
      for (const b of bids) {
        if ((await tx.tenderBidFile.count({ where: { bidId: b.id } })) > 0) continue;
        const name = "wholesale-licence.pdf";
        const blobName = `tender-bids/${t.id}/${randomUUID()}-${name}`;
        const buf = makePdf("Wholesale distribution licence", [`Bid for ${t.referenceNumber}`, "", "Licence holder: bidding organisation (simulated)", `Licence number: WDA-${b.id.replace(/\D/g, "").slice(0, 6) || "100200"}`, "Issued by: national medicines regulator (simulated)", "Valid to: 2028-12-31", "", "SIMULATED DOCUMENT - generated for demonstration only."]);
        if (!dryRun) {
          await upload(b.organizationId, blobName, buf);
          await tx.tenderBidFile.create({ data: { organizationId: b.organizationId, issuerOrganizationId: t.organizationId, bidId: b.id, tenderId: t.id, criterionId: gate?.id ?? null, fileName: name, blobName, mimeType: "application/pdf", fileSizeBytes: buf.length, uploadedAt: b.submittedAt ?? new Date() } });
        }
        bidFiles++;
      }

      // signed contract copies
      const contracts = await tx.tenderContract.findMany({ where: { tenderId: t.id, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { id: true, reference: true, title: true, awardedOrganizationId: true, startDate: true, totalValue: true, currency: true } });
      for (const c of contracts) {
        if ((await tx.tenderContractFile.count({ where: { contractId: c.id } })) > 0) continue;
        const name = `${safe(c.reference)}-signed.pdf`;
        const blobName = `tender-contracts/${c.id}/${randomUUID()}-${name}`;
        const buf = makePdf("Contract (signed copy)", [`Contract: ${c.reference}`, c.title, `Value: ${c.totalValue ?? ""} ${c.currency ?? ""}`, `Start: ${c.startDate?.toISOString().slice(0, 10) ?? ""}`, "", "Signed for the issuer and the supplier (simulated signatures).", "", "SIMULATED DOCUMENT - generated for demonstration only."]);
        if (!dryRun) {
          await upload(t.organizationId, blobName, buf);
          await tx.tenderContractFile.create({ data: { organizationId: t.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: t.id, contractId: c.id, kind: "SIGNED", version: 1, title: "Signed contract", fileName: name, blobName, mimeType: "application/pdf", fileSizeBytes: buf.length, uploadedByOrganizationId: t.organizationId, note: "Simulated signed copy." } });
        }
        contractFiles++;
      }
    }
    console.log(`${dryRun ? "DRY RUN: would create" : "Created"} ${docs} tender documents, ${bidFiles} bid files, ${contractFiles} contract files.`);
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
