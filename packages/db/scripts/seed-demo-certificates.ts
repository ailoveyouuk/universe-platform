import { createHash, randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { prisma, withPlatformStaffContext } from "../src/index";
import { makePdf } from "./_pdf";

/**
 * Simulated partner certificates for Universe Demo (2026-10-27, requested by Lewis: the CRM tags "GDP certified", "WHO prequalified" and "ISO 13485"
 * were empty because the demo stakeholders held no certificates, so the demo needs evidence behind them).
 *   Manufacturers          : ISO 13485 (most), GMP (about half), WHO prequalification (about one in five)
 *   Suppliers, warehousing, freight forwarders, logistics : Good Distribution Practice (GDP) certificates
 * Only the approved stakeholders the CRM seed made active (they have an owner). Each certificate is a CURRENT PartnerCertification with an issuing body,
 * reference, issue and expiry dates (a few expire within 60 days), a verification record for most, and a real simulated PDF stored in the organisation's
 * private container as standalone/<uuid>-<name>.pdf with a matching document row. Every file and reference is plainly marked simulated.
 * Then the CRM tags are applied to those relationships (only where missing). Idempotent: skips a partner that already holds that certificate type.
 * Needs AZURE_STORAGE_CONNECTION_STRING (the workflow supplies it). DRY_RUN defaults to true and then needs no storage access.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(now.getTime() + n * DAY);
function rng(seed: string) { let h = createHash("sha256").update(seed).digest().readUInt32LE(0); return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const chunk = <T,>(a: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "-");

type Spec = { type: string; label: string; file: string; bodies: string[]; ref: (n: number) => string; bodyLines: string[] };
const SPECS: Record<string, Spec> = {
  ISO_13485: { type: "ISO_13485", label: "ISO 13485 certificate (simulated)", file: "iso-13485-certificate.pdf", bodies: ["Simulated Certification Body A", "Simulated Certification Body B", "Simulated Notified Body C"], ref: (n) => `SIM-ISO13485-${n}`, bodyLines: ["Quality management systems for medical devices (ISO 13485:2016)", "Scope: design, manufacture and distribution of medical devices"] },
  GMP: { type: "GMP", label: "GMP certificate (simulated)", file: "gmp-certificate.pdf", bodies: ["Simulated Medicines Authority", "Simulated GMP Inspectorate"], ref: (n) => `SIM-GMP-${n}`, bodyLines: ["Certificate of Good Manufacturing Practice", "Scope: manufacture and release of finished products"] },
  WHO_PREQUALIFICATION: { type: "WHO_PREQUALIFICATION", label: "WHO prequalification letter (simulated)", file: "who-prequalification.pdf", bodies: ["Simulated WHO Prequalification Team"], ref: (n) => `SIM-WHOPQ-${n}`, bodyLines: ["Notice of prequalification (simulated, not a real WHO document)", "Products listed on the simulated prequalified list"] },
  GDP: { type: "GDP", label: "GDP certificate (simulated)", file: "gdp-certificate.pdf", bodies: ["Simulated Medicines Authority", "Simulated Wholesale Licensing Office", "Simulated Distribution Inspectorate"], ref: (n) => `SIM-GDP-${n}`, bodyLines: ["Certificate of Good Distribution Practice", "Scope: storage, transport and distribution of medicinal products"] },
};

async function main() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!dryRun && !conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  const svc = !dryRun ? BlobServiceClient.fromConnectionString(conn!) : null;

  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const container = svc?.getContainerClient(`org-${org}`);
    if (container) await container.createIfNotExists();
    const admin = await tx.user.findFirst({ where: { organizationId: org, archivedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!admin) throw new Error("Universe Demo has no users.");

    const rels = await tx.crmRelationship.findMany({ where: { organizationId: org, partnerId: { not: null }, ownerUserId: { not: null }, archivedAt: null, status: { in: ["ACTIVE", "DORMANT", "ON_HOLD"] } }, select: { id: true, partnerId: true } });
    const partnerIds = rels.map((r) => r.partnerId!);
    const partners = new Map<string, { id: string; name: string; countryCode: string | null; approvalStatus: string }>();
    const roles = new Map<string, Set<string>>();
    const held = new Map<string, Set<string>>();
    for (const part of chunk(partnerIds, 1000)) {
      for (const p of await tx.partner.findMany({ where: { organizationId: org, id: { in: part }, approvalStatus: "APPROVED" }, select: { id: true, name: true, countryCode: true, approvalStatus: true } })) partners.set(p.id, p);
      for (const x of await tx.partnerRole.findMany({ where: { partnerId: { in: part }, isActive: true }, select: { partnerId: true, roleType: true } })) { const s = roles.get(x.partnerId) ?? new Set<string>(); s.add(x.roleType); roles.set(x.partnerId, s); }
      for (const c of await tx.partnerCertification.findMany({ where: { organizationId: org, partnerId: { in: part }, status: "CURRENT" }, select: { partnerId: true, type: true } })) { const s = held.get(c.partnerId) ?? new Set<string>(); s.add(c.type); held.set(c.partnerId, s); }
    }

    type Plan = { pid: string; name: string; spec: Spec; seq: number; r: () => number };
    const plans: Plan[] = []; let seq = 1;
    for (const pid of [...partners.keys()].sort()) {
      const p = partners.get(pid)!; const rs = roles.get(pid) ?? new Set<string>(); const r = rng(`cert:${pid}`); const h = held.get(pid) ?? new Set<string>();
      const add = (key: string, chance: number) => { const s = SPECS[key]; if (!h.has(s.type) && r() < chance) plans.push({ pid, name: p.name, spec: s, seq: seq++, r: rng(`cert:${pid}:${key}`) }); };
      if (rs.has("MANUFACTURER")) { add("ISO_13485", 0.82); add("GMP", 0.5); add("WHO_PREQUALIFICATION", 0.2); }
      if (rs.has("SUPPLIER")) add("GDP", 0.5);
      if (rs.has("WAREHOUSING")) add("GDP", 0.75);
      if (rs.has("FREIGHT_FORWARDER") || rs.has("LOGISTICS")) add("GDP", 0.55);
    }
    const byType = plans.reduce<Record<string, number>>((m, x) => { m[x.spec.type] = (m[x.spec.type] ?? 0) + 1; return m; }, {});
    console.log(`${dryRun ? "[dry run] would add" : "adding"} ${plans.length} certificates for ${new Set(plans.map((x) => x.pid)).size} stakeholders`, byType);

    let docs = 0;
    if (!dryRun) {
      for (const x of plans) {
        const issued = daysAgo(120 + Math.floor(x.r() * 700));
        const soon = x.r() < 0.06;
        const expiry = soon ? daysAhead(10 + Math.floor(x.r() * 50)) : daysAhead(120 + Math.floor(x.r() * 900));
        const body = pick(x.r, x.spec.bodies); const ref = x.spec.ref(10000 + x.seq);
        const pdf = makePdf(x.spec.label, [`Holder: ${x.name}`, `Reference: ${ref}`, `Issued by: ${body}`, `Issued: ${issued.toISOString().slice(0, 10)}`, `Expires: ${expiry.toISOString().slice(0, 10)}`, "", ...x.spec.bodyLines, "", "SIMULATED DOCUMENT - generated for demonstration only.", "Not a real certificate. No real organisation or authority is named."]);
        const blobName = `standalone/${randomUUID()}-${safe(x.spec.file)}`;
        await container!.getBlockBlobClient(blobName).uploadData(pdf, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
        const doc = await tx.projectDocument.create({ data: { organizationId: org, projectId: null, type: "OTHER", title: `${x.spec.label} - ${x.name}`.slice(0, 250), url: container!.getBlockBlobClient(blobName).url, blobName, fileName: x.spec.file, fileSizeBytes: pdf.length, mimeType: "application/pdf", uploadedById: admin.id, uploadedAt: issued } });
        const verified = x.r() < 0.85;
        await tx.partnerCertification.create({ data: { organizationId: org, partnerId: x.pid, type: x.spec.type, referenceNumber: ref, issuingBody: body, issuedDate: issued, expiryDate: expiry, verifiedAt: verified ? new Date(issued.getTime() + 20 * DAY) : null, verifiedById: verified ? admin.id : null, status: "CURRENT", notes: "Simulated certificate for the demo.", documentId: doc.id } });
        docs++;
      }
    }
    console.log(`${dryRun ? "[dry run] would store" : "stored"} ${dryRun ? plans.length : docs} simulated certificate files`);

    // ---- CRM tags for those relationships (only where missing)
    const wanted: Record<string, string> = { ISO_13485: "iso 13485", GDP: "gdp certified", WHO_PREQUALIFICATION: "who prequalified" };
    const tagRows = await tx.crmTag.findMany({ where: { organizationId: org }, select: { id: true, normalizedName: true } });
    const tagId = new Map(tagRows.map((t) => [t.normalizedName, t.id]));
    const relOf = new Map(rels.map((r) => [r.partnerId!, r.id]));
    const certNow = new Map<string, Set<string>>();
    for (const part of chunk([...partners.keys()], 1000)) for (const c of await tx.partnerCertification.findMany({ where: { organizationId: org, partnerId: { in: part }, status: "CURRENT" }, select: { partnerId: true, type: true } })) { const s = certNow.get(c.partnerId) ?? new Set<string>(); s.add(c.type); certNow.set(c.partnerId, s); }
    const existing = new Set((await tx.crmRelationshipTag.findMany({ where: { organizationId: org }, select: { relationshipId: true, tagId: true } })).map((l) => `${l.relationshipId}|${l.tagId}`));
    const toLink: { relationshipId: string; tagId: string }[] = [];
    const source = dryRun ? new Map(plans.map((x) => [x.pid, new Set<string>()])) : certNow;
    if (dryRun) for (const x of plans) source.get(x.pid)!.add(x.spec.type);
    for (const [pid, types] of source) for (const t of types) { const name = wanted[t]; const id = name ? tagId.get(name) : undefined; const rid = relOf.get(pid); if (id && rid && !existing.has(`${rid}|${id}`)) { existing.add(`${rid}|${id}`); toLink.push({ relationshipId: rid, tagId: id }); } }
    console.log(`${dryRun ? "[dry run] would add" : "added"} ${toLink.length} tag applications`);
    if (!dryRun) for (const part of chunk(toLink, 200)) await tx.crmRelationshipTag.createMany({ data: part.map((l) => ({ ...l, organizationId: org, addedById: admin.id, addedAt: daysAgo(1) })) });
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
