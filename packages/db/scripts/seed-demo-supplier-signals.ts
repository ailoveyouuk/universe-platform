import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Simulated supplier signals for Universe Demo (2026-10-24), so the partner scorecard shows real values for
 *  - "Enquiries quoted" and "Quote price against the lowest" (needs supplier enquiries, several suppliers quoting the same line in one currency), and
 *  - "Tender contract performance" (needs closed, scored tender contracts owned by Universe Demo and awarded to a platform organisation that a demo
 *    supplier is linked to through its stakeholder registry entry).
 * Everything is deterministic (no randomness), simulated, and idempotent: part A is skipped if enquiries already exist; part B skips a reference that exists.
 * Part B stubs are archived, unpublished simulated tenders (SIM-PERF-n) so they never appear in tender lists. DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const POOL = Number(process.env.POOL ?? 60);
const LINES_PER = Number(process.env.LINES_PER ?? 25);
const LINKED = Number(process.env.LINKED ?? 12);

const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
/** Stable 0..1 value from two integers. */
const u = (a: number, b: number) => { let x = (a * 374761393 + b * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177; x = x ^ (x >>> 16); return ((x >>> 0) % 10000) / 10000; };
const normalise = (s: string) => s.toLowerCase().replace(/\b(ltd|limited|llc|inc|plc|gmbh|sa|pvt|co|company|corp|corporation)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  const orgId = (await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } })))[0]?.id;
  if (!orgId) throw new Error("Universe Demo not found.");

  // ---- the pool: the demo's busiest priced suppliers ----
  const lineRows = await withTenantContext(orgId, (tx) => tx.projectLine.findMany({
    where: { organizationId: orgId, supplierId: { not: null }, supplierUnitPrice: { not: null }, supplierPaymentCurrency: { not: null } },
    select: { id: true, supplierId: true, supplierUnitPrice: true, supplierPaymentCurrency: true, createdAt: true }, orderBy: { id: "asc" },
  }));
  const bySupplier = new Map<string, typeof lineRows>();
  for (const l of lineRows) (bySupplier.get(l.supplierId!) ?? bySupplier.set(l.supplierId!, []).get(l.supplierId!)!).push(l);
  const poolIds = [...bySupplier.entries()].filter(([, v]) => v.length >= 8).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, POOL).map(([id]) => id);
  console.log(`Priced lines: ${lineRows.length}; suppliers with 8+ priced lines: ${[...bySupplier.values()].filter((v) => v.length >= 8).length}; pool: ${poolIds.length}.`);
  if (poolIds.length < 6) throw new Error("Too few suppliers with priced lines.");
  const idx = new Map(poolIds.map((id, i) => [id, i]));
  const premium = (i: number) => ((i * 37) % 25) / 100 - 0.02;            // -2% .. +22% typical price position
  const quoteRate = (i: number) => 0.6 + ((i * 53) % 35) / 100;           // 60% .. 94% of enquiries get a quote
  const declineRate = (i: number) => 0.05 + ((i * 17) % 8) / 100;         // 5% .. 12%

  // ---- A: enquiries ----
  const existing = await withTenantContext(orgId, (tx) => tx.supplierEnquiry.count({ where: { organizationId: orgId } }));
  const enquiries: { id: string; organizationId: string; projectLineId: string; supplierId: string; dateContacted: Date; responseStatus: string; quotedPrice: number | null; quotedCurrency: string | null; notes: string }[] = [];
  if (existing > 0) console.log(`Part A skipped: ${existing} enquiries already exist.`);
  else {
    const seen = new Set<string>();
    for (const sid of poolIds) {
      const mine = bySupplier.get(sid)!.slice(-LINES_PER);
      for (const line of mine) {
        const lineNo = Number.parseInt(line.id.replace(/\D/g, "").slice(0, 6) || "1", 10);
        const base = Number(line.supplierUnitPrice);
        const cur = line.supplierPaymentCurrency!;
        const rivals = [sid];
        const nRivals = 1 + (u(lineNo, idx.get(sid)!) > 0.5 ? 1 : 0);
        for (let r = 0; r < nRivals; r++) {
          const pick = poolIds[Math.floor(u(lineNo + r * 7919, idx.get(sid)! + 3) * poolIds.length)];
          if (!rivals.includes(pick)) rivals.push(pick);
        }
        for (const s of rivals) {
          const key = `${line.id}|${s}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const i = idx.get(s)!;
          const roll = u(lineNo, i + 11);
          const recent = Date.now() - line.createdAt.getTime() < 21 * 86_400_000;
          let status = roll < quoteRate(i) ? "QUOTED" : roll < quoteRate(i) + declineRate(i) ? "DECLINED" : "NO_RESPONSE";
          if (recent && roll > 0.8) status = "WAITING";
          const jitter = (u(lineNo + 5, i + 29) - 0.5) * 0.06;
          const price = status === "QUOTED" ? Math.round(base * (1 + premium(i) + jitter) * (s === sid ? 1 : 1) * 100) / 100 : null;
          enquiries.push({
            id: randomUUID(), organizationId: orgId, projectLineId: line.id, supplierId: s,
            dateContacted: new Date(line.createdAt.getTime() - (3 + Math.floor(u(lineNo, i) * 12)) * 86_400_000),
            responseStatus: status, quotedPrice: price, quotedCurrency: price === null ? null : cur, notes: "Simulated enquiry (SIM-SIGNALS).",
          });
        }
      }
    }
    const q = enquiries.filter((e) => e.responseStatus === "QUOTED").length;
    console.log(`Part A: ${enquiries.length} enquiries to create (${q} quoted).`);
  }

  // ---- B: closed tender contracts for linked suppliers ----
  const poolPartners = await withTenantContext(orgId, (tx) => tx.partner.findMany({ where: { id: { in: poolIds.slice(0, LINKED) } }, select: { id: true, name: true, countryCode: true, registryEntryId: true } }));
  const simOrgs = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isSimulated: true, isDemo: false }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 400 }));
  const linkedAlready = await withPlatformStaffContext((tx) => tx.stakeholderRegistryEntry.findMany({ where: { linkedOrganizationId: { not: null } }, select: { linkedOrganizationId: true } }));
  const usedOrg = new Set(linkedAlready.map((e) => e.linkedOrganizationId!));
  const freeOrgs = simOrgs.filter((o) => !usedOrg.has(o.id));
  console.log(`Part B: ${poolPartners.length} suppliers to link; ${freeOrgs.length} simulated organisations free to be linked.`);
  if (freeOrgs.length < poolPartners.length) throw new Error("Not enough free simulated organisations to link.");

  if (dryRun) { console.log("DRY RUN: nothing written."); return; }

  if (enquiries.length) {
    for (const group of chunks(enquiries, 400)) await withTenantContext(orgId, (tx) => tx.supplierEnquiry.createMany({ data: group }));
    console.log(`Created ${enquiries.length} enquiries.`);
  }

  let tn = 0;
  for (const [pi, p] of poolPartners.entries()) {
    const org = freeOrgs[pi];
    // link the demo supplier to a platform organisation through the registry
    let regId = p.registryEntryId;
    if (regId) await withPlatformStaffContext((tx) => tx.stakeholderRegistryEntry.update({ where: { id: regId! }, data: { linkedOrganizationId: org.id } }));
    else {
      regId = (await withPlatformStaffContext((tx) => tx.stakeholderRegistryEntry.create({ data: {
        isSimulated: true, normalizedName: normalise(p.name), legalName: p.name, countryCode: p.countryCode, stakeholderTypes: JSON.stringify(["SUPPLIER"]), linkedOrganizationId: org.id,
      } }))).id;
      await withPlatformStaffContext((tx) => tx.partner.update({ where: { id: p.id }, data: { registryEntryId: regId } }));
    }
    // 2-4 closed, scored contracts: quality of the supplier follows its position in the pool
    const n = 2 + Math.floor(u(pi, 91) * 3);
    const level = 96 - (pi * 41) % 38;                                   // 58 .. 96 base score
    for (let k = 0; k < n; k++) {
      tn++;
      const ref = `SIM-PERF-${String(tn).padStart(3, "0")}`;
      await withPlatformStaffContext(async (tx) => {
        if (await tx.tender.findFirst({ where: { referenceNumber: ref, organizationId: orgId } })) { console.log(`${ref}: exists; skipped.`); return; }
        const terminated = level < 66 && k === n - 1;
        const score = Math.max(35, Math.min(99, Math.round(level + (u(pi, k + 3) - 0.5) * 14 - (terminated ? 22 : 0))));
        const band = score >= 85 ? "STRONG" : score >= 70 ? "GOOD" : "WATCH";
        const onTime = Math.max(40, Math.min(100, Math.round(score + (u(pi, k + 7) - 0.4) * 10)));
        const inFull = Math.max(50, Math.min(100, Math.round(score + 4 + (u(pi, k + 9) - 0.5) * 8)));
        const otif = Math.round((onTime * inFull) / 100);
        const months = 3 + Math.floor(u(pi, k + 13) * 20);
        const closed = new Date(Date.now() - months * 30 * 86_400_000);
        const started = new Date(closed.getTime() - 120 * 86_400_000);
        const value = 20000 + Math.round(u(pi, k + 17) * 180000);
        const milestones = 3 + Math.floor(u(pi, k + 19) * 3);
        const done = terminated ? milestones - 1 : milestones;
        const measures = [
          { key: "on_time", label: "On-time delivery", group: "DELIVERY", weight: 20, display: `${onTime}%`, score: onTime, status: onTime >= 90 ? "good" : onTime >= 75 ? "warning" : "critical", detail: "Simulated.", benchmark: null, href: null },
          { key: "in_full", label: "In-full delivery", group: "DELIVERY", weight: 15, display: `${inFull}%`, score: inFull, status: inFull >= 90 ? "good" : inFull >= 75 ? "warning" : "critical", detail: "Simulated.", benchmark: null, href: null },
          { key: "otif", label: "On-time in-full (OTIF)", group: "DELIVERY", weight: 10, display: `${otif}%`, score: otif, status: otif >= 85 ? "good" : otif >= 70 ? "warning" : "critical", detail: "Simulated.", benchmark: null, href: null },
        ];
        const tender = await tx.tender.create({ data: { organizationId: orgId, referenceNumber: ref, title: `Simulated closed supply contract ${tn}`, status: "CONTRACTED", isPublished: false, isSimulated: true, archivedAt: new Date(), currency: "USD", awardedAt: started, contractStartDate: started } });
        const contract = await tx.tenderContract.create({ data: { organizationId: orgId, awardedOrganizationId: org.id, tenderId: tender.id, awardId: randomUUID(), reference: `CON-${ref}-1`, title: `Contract for simulated supply ${tn}`, status: terminated ? "TERMINATED" : "COMPLETED", currency: "USD", totalValue: value, startDate: started, endDate: closed, executedAt: started, closedAt: closed, closeNote: "Simulated closed contract." } });
        for (let m = 0; m < milestones; m++) await tx.tenderContractMilestone.create({ data: { organizationId: orgId, awardedOrganizationId: org.id, tenderId: tender.id, contractId: contract.id, title: `Delivery ${m + 1}`, status: m < done ? "DONE" : "PENDING", dueDate: new Date(started.getTime() + (m + 1) * 25 * 86_400_000), completedAt: m < done ? new Date(started.getTime() + (m + 1) * 25 * 86_400_000 + (u(pi, m + k) > 0.8 ? 4 : -1) * 86_400_000) : null, sortOrder: m } });
        await tx.tenderPerformanceRecord.create({ data: {
          organizationId: orgId, awardedOrganizationId: org.id, tenderId: tender.id, contractId: contract.id, outcome: terminated ? "TERMINATED" : "COMPLETED", closedAt: closed, measuresJson: JSON.stringify(measures),
          overallScore: score, band, coverage: 100, milestonesTotal: milestones, milestonesOnTime: Math.min(done, Math.round((onTime / 100) * milestones)), onTimePercent: onTime, inFullPercent: inFull, otifPercent: otif,
          feedbackJson: JSON.stringify({ quality: Math.max(1, Math.round(score / 20)), communication: 4, documentation: 4, flexibility: 4, wouldUseAgain: score >= 70 ? 5 : 2, reasons: {}, comment: "Simulated feedback." }),
          feedbackAverage: Math.round(Math.max(1, Math.min(5, score / 20)) * 100) / 100, replyDeadline: new Date(closed.getTime() + 14 * 86_400_000),
        } });
      });
    }
    console.log(`${p.name}: linked to ${org.name}; ${n} closed contract(s).`);
  }
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
