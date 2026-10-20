import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Coherence pass over the SIMULATED demo data (2026-10-20, agreed with Lewis: "make it relational ... for complete accuracy").
 * Works in place on simulated (SIM-) projects of the demo organisation, so every id, complaint, risk and audit link survives; nothing is deleted.
 * For every line it sets, deterministically from the line id:
 *  - references: internal PO, client PO, warehouse reference, invoice number (project and line numbers appear in them);
 *  - the product source approval for the line's product + manufacturer (+ supplier) when it does not exist yet;
 *  - the country of manufacture = the manufacturer's country;
 *  - one timeline: client PO received -> internal PO placed -> manufactured -> collected -> delivered -> invoiced -> paid;
 *  - a product batch (product, manufacturer, manufactured and expiry dates, storage) linked from the line, plus a temperature log for
 *    temperature-sensitive products (a few with excursions);
 * and on projects: start and due dates that bracket their lines. Complaints that pre-date their line's delivery are moved to a fitting line,
 * and every complaint is linked to its line's batch.
 * DRY_RUN defaults to true. Safe to re-run.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = <T,>(l: T[], k: string): T => l[hash(k) % l.length];
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const TEMP_SENSITIVE = ["Cold Chain", "Pharmaceuticals", "Diagnostics", "Reagents"];
const LEAD: Record<string, number> = { Pharmaceuticals: 45, Diagnostics: 35, "Medical Devices": 40, "Personal Protective Equipment": 28, "Laboratory Consumables": 30, "Cold Chain": 40, Reagents: 35, "Surgical Supplies": 32, "Wound Care": 28, Imaging: 50 };
const noPad = (s: string) => s.replace(/^SIM-[A-Z]+-/, "");

async function demoOrgId(): Promise<string> {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  return demo[0].id;
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "RECOHERE"}`);
  const orgId = await demoOrgId();
  const now = Date.now();
  const stats: Record<string, number> = {};
  const bump = (k: string, n = 1) => { stats[k] = (stats[k] ?? 0) + n; };

  const products = new Map((await prisma.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, select: { id: true, category: true, name: true } })).map((p) => [p.id, { category: p.category.split(".")[0], name: p.name }]));
  const partners = new Map((await prisma.partner.findMany({ where: { organizationId: orgId }, select: { id: true, countryCode: true, roles: { select: { roleType: true } } } })).map((p) => [p.id, p]));
  const suppliers = [...partners.values()].filter((p) => p.roles.some((r) => r.roleType === "SUPPLIER")).map((p) => p.id).sort();
  const existing = await withTenantContext(orgId, (tx) => tx.productSourceApproval.findMany({ where: { organizationId: orgId, isArchived: false }, select: { productMasterId: true, manufacturerId: true } }));
  const approved = new Set(existing.map((a) => `${a.productMasterId}|${a.manufacturerId}`));

  const projects = await withTenantContext(orgId, (tx) => tx.project.findMany({ where: { referenceNumber: { startsWith: "SIM-" } }, select: { id: true, referenceNumber: true, status: true, startDate: true, dueDate: true, createdAt: true }, orderBy: { id: "asc" } }));
  console.log(`Projects: ${projects.length}`);
  const newApprovals: { id: string; organizationId: string; productMasterId: string; manufacturerId: string; supplierId: string | null; status: string; approvedAt: Date; nextReviewDue: Date; notes: string }[] = [];
  const lineDelivery = new Map<string, { actual: Date | null; productMasterId: string | null; batchId: string | null }>();

  for (const group of chunks(projects, 25)) {
    const batchRows: Record<string, unknown>[] = [];
    const tempLogs: Record<string, unknown>[] = [];
    const lineUpdates: { id: string; data: Record<string, unknown> }[] = [];
    await withTenantContext(orgId, async (tx) => {
      const lines = await tx.projectLine.findMany({ where: { projectId: { in: group.map((g) => g.id) } }, orderBy: [{ projectId: "asc" }, { id: "asc" }] });
      const byProject = new Map<string, typeof lines>();
      for (const l of lines) byProject.set(l.projectId, [...(byProject.get(l.projectId) ?? []), l]);
      for (const p of group) {
        const n = noPad(p.referenceNumber);
        const ls = byProject.get(p.id) ?? [];
        let minCpo = Infinity, maxActual = 0;
        for (let k = 0; k < ls.length; k++) {
          const l = ls[k];
          const kk = String(k + 1).padStart(2, "0");
          const prod = l.productMasterId ? products.get(l.productMasterId) : undefined;
          const cat = prod?.category ?? l.productCategory ?? "Medical Devices";
          const data: Record<string, unknown> = {};
          // approval
          if (l.productMasterId && l.manufacturerId) {
            const key = `${l.productMasterId}|${l.manufacturerId}`;
            if (!approved.has(key)) {
              approved.add(key); bump("approvals to add");
              newApprovals.push({ id: randomUUID(), organizationId: orgId, productMasterId: l.productMasterId, manufacturerId: l.manufacturerId, supplierId: l.supplierId, status: "APPROVED", approvedAt: addDays(new Date(now), -(120 + hash(key) % 400)), nextReviewDue: addDays(new Date(now), 60 + hash(key + "r") % 500), notes: "Simulated source approval." });
            }
          }
          const m = l.manufacturerId ? partners.get(l.manufacturerId) : null;
          if (m?.countryCode && l.countryOfManufactureCode !== m.countryCode) { data.countryOfManufactureCode = m.countryCode; bump("country of manufacture aligned"); }
          if (!l.supplierId && suppliers.length) { data.supplierId = pick(suppliers, l.id + "su"); bump("supplier added"); }
          // references
          if (!l.internalPoNumber) data.internalPoNumber = `PO-${n}-${kk}`;
          if (!l.clientPoNumber) data.clientPoNumber = `CPO-${n}-${kk}`;
          if (!l.warehouseReferenceNumber) data.warehouseReferenceNumber = `WH-${n}-${kk}`;
          // timeline
          const delivered = l.actualDeliveryDate != null;
          let actual = l.actualDeliveryDate ? new Date(Math.min(l.actualDeliveryDate.getTime(), now - 2 * DAY)) : null;
          let collected = l.goodsCollectedDate ?? (actual ? addDays(actual, -(7 + hash(l.id + "c") % 21)) : null);
          if (actual && collected && collected > actual) collected = addDays(actual, -5);
          let po: Date, cpo: Date, man: Date | null = null;
          if (collected) {
            po = addDays(collected, -((LEAD[cat] ?? 35) + hash(l.id + "po") % 15));
            man = new Date(Math.min(addDays(po, 4 + hash(l.id + "m") % 9).getTime(), addDays(collected, -1).getTime()));
          } else {
            po = addDays(p.startDate ?? new Date(Math.min(p.createdAt.getTime(), now - 20 * DAY)), 2 + hash(l.id + "po2") % 8);
            if (po.getTime() > now - DAY) po = new Date(now - (1 + hash(l.id + "po3") % 10) * DAY);
          }
          cpo = addDays(po, -(1 + hash(l.id + "cpo") % 6));
          minCpo = Math.min(minCpo, cpo.getTime());
          data.internalPoDatePlaced = po; data.clientPoReceiptDate = cpo;
          if (man) data.goodsManufacturedDate = man;
          if (collected && !l.goodsCollectedDate) data.goodsCollectedDate = collected;
          if (collected && l.goodsCollectedDate && collected.getTime() !== l.goodsCollectedDate.getTime()) data.goodsCollectedDate = collected;
          if (actual) {
            if (actual.getTime() !== l.actualDeliveryDate!.getTime()) { data.actualDeliveryDate = actual; data.goodsDeliveredToClientDate = actual; bump("future deliveries pulled back"); }
            maxActual = Math.max(maxActual, actual.getTime());
            const invNo = l.internalInvoiceNumber ?? `INV-${n}-${kk}`;
            let inv = l.internalInvoiceDate ?? addDays(actual, 1 + hash(l.id + "inv") % 5);
            if (inv < actual) inv = addDays(actual, 1);
            if (inv.getTime() > now) inv = new Date(Math.max(actual.getTime(), now - DAY));
            if (!l.internalInvoiceNumber) data.internalInvoiceNumber = invNo;
            if (!l.internalInvoiceDate || inv.getTime() !== l.internalInvoiceDate.getTime()) data.internalInvoiceDate = inv;
            if (l.clientPaymentDate && l.clientPaymentDate < inv) { data.clientPaymentDate = new Date(Math.min(addDays(inv, 10 + hash(l.id + "pay") % 20).getTime(), now)); bump("payment moved after the invoice"); }
          }
          // batch
          if (!l.productBatchId && l.productMasterId && collected && man) {
            const bid = randomUUID();
            const temp = TEMP_SENSITIVE.includes(cat);
            const expiry = addDays(man, 540 + hash(l.id + "exp") % 540);
            batchRows.push({ id: bid, organizationId: orgId, productMasterId: l.productMasterId, manufacturerId: l.manufacturerId, batchNumber: `SIMB${n}${kk}`, manufacturedDate: man, expiryDate: expiry, storageConditions: temp ? "Store at 2-8°C" : "Store below 25°C, dry", status: "ACTIVE", notes: "Simulated batch." });
            data.productBatchId = bid; data.batchNumber = `SIMB${n}${kk}`; data.expiryDate = expiry; data.goodsManufacturedDate = man; data.storageConditions = temp ? "Store at 2-8°C" : "Store below 25°C, dry";
            bump("batches to add");
            if (temp && actual) {
              const exc = hash(l.id + "exc") % 100 < 9;
              tempLogs.push({ id: randomUUID(), organizationId: orgId, productBatchId: bid, projectLineId: l.id, loggerReference: `LOG-${n}${kk}`, readingSummary: exc ? "Range 1.8 to 9.4 °C; above 8 °C for 3 h 20 min" : "Range 2.6 to 7.1 °C throughout", hasExcursion: exc, excursionNotes: exc ? "Temperature rose above 8 °C during transit handover." : null, reviewed: hash(l.id + "rev") % 100 < 85, recordedAt: actual });
              bump(exc ? "temperature logs with excursion" : "temperature logs ok");
            }
          }
          lineDelivery.set(l.id, { actual, productMasterId: l.productMasterId, batchId: (data.productBatchId as string) ?? l.productBatchId });
          for (const [k, v] of Object.entries(data)) { const cur = (l as Record<string, unknown>)[k]; if ((v instanceof Date && cur instanceof Date && v.getTime() === cur.getTime()) || v === cur) delete data[k]; }
          if (Object.keys(data).length) { bump("lines changed"); lineUpdates.push({ id: l.id, data }); }
        }
        // project dates bracket the lines
        const pdata: Record<string, unknown> = {};
        if (ls.length && minCpo < Infinity) {
          const wantStart = new Date(minCpo - 2 * DAY);
          if (!p.startDate || p.startDate.getTime() > wantStart.getTime()) { pdata.startDate = wantStart; bump("project start dates fixed"); }
        }
        if (p.status === "COMPLETED" && maxActual && (!p.dueDate || p.dueDate.getTime() > now || p.dueDate.getTime() < maxActual)) { pdata.dueDate = new Date(Math.min(maxActual + (1 + hash(p.id + "d") % 10) * DAY, now - DAY)); bump("project due dates fixed"); }
        // an open project must not start after it is due
        const startNow = (pdata.startDate as Date | undefined) ?? p.startDate;
        const dueNow = (pdata.dueDate as Date | undefined) ?? p.dueDate;
        if (startNow && dueNow && startNow.getTime() > dueNow.getTime()) { pdata.dueDate = new Date(startNow.getTime() + (45 + hash(p.id + "due2") % 75) * DAY); bump("project due dates after start"); }
        if (Object.keys(pdata).length && !dryRun) await tx.project.update({ where: { id: p.id }, data: pdata });
      }
      if (!dryRun) {
        if (batchRows.length) await tx.productBatch.createMany({ data: batchRows as never });
        if (tempLogs.length) await tx.batchTemperatureLog.createMany({ data: tempLogs as never });
        for (const u of lineUpdates) await tx.projectLine.update({ where: { id: u.id }, data: u.data as never });
      }
    });
  }
  if (!dryRun) for (const g of chunks(newApprovals, 200)) await withTenantContext(orgId, (tx) => tx.productSourceApproval.createMany({ data: g }));

  // complaints: after the line was delivered, and linked to its batch
  await withTenantContext(orgId, async (tx) => {
    const cs = await tx.qualityComplaint.findMany({ where: { organizationId: orgId, referenceNumber: { startsWith: "SIM-CMP-" } }, select: { id: true, receivedAt: true, direction: true, referenceNumber: true, projectLineId: true, category: true, flagTemperatureExcursion: true, partnerId: true } });
    const pool = await tx.projectLine.findMany({ where: { project: { referenceNumber: { startsWith: "SIM-" }, status: { in: ["COMPLETED", "AWARDED"] }, freightForwarderId: { not: null } }, productMasterId: { not: null }, actualDeliveryDate: { not: null } }, select: { id: true, projectId: true, productMasterId: true, manufacturerId: true, supplierId: true, productBatchId: true, actualDeliveryDate: true, project: { select: { clientId: true, freightForwarderId: true } } }, take: 4000, orderBy: { id: "asc" } });
    for (const c of cs) {
      const d = c.projectLineId ? lineDelivery.get(c.projectLineId) : null;
      const needsTemp = c.category === "COLD_CHAIN" || c.flagTemperatureExcursion;
      const okLine = d?.actual && d.actual.getTime() <= c.receivedAt.getTime() - DAY;
      let batchId = d?.batchId ?? null;
      if (!okLine) {
        const fit = pool.filter((l) => l.actualDeliveryDate!.getTime() <= c.receivedAt.getTime() - DAY && l.productBatchId && (!needsTemp || TEMP_SENSITIVE.includes(products.get(l.productMasterId!)?.category ?? "")));
        if (!fit.length) { bump("complaints with no fitting line"); continue; }
        const l = pick(fit, c.id + "mv");
        const isFwd = c.referenceNumber >= "SIM-CMP-061";
        const partnerId = c.direction === "INBOUND_CLIENT" ? l.project.clientId : isFwd ? l.project.freightForwarderId : (l.manufacturerId ?? l.supplierId);
        bump("complaints moved to a line delivered before they were received");
        if (!dryRun) await tx.qualityComplaint.update({ where: { id: c.id }, data: { projectId: l.projectId, projectLineId: l.id, productMasterId: l.productMasterId, productBatchId: l.productBatchId, partnerId } });
        continue;
      }
      if (batchId && !dryRun) { await tx.qualityComplaint.update({ where: { id: c.id }, data: { productBatchId: batchId } }); bump("complaints linked to a batch"); }
    }
  });
  console.log(`Result (${dryRun ? "would change" : "changed"}):`);
  for (const [k, v] of Object.entries(stats)) console.log(`  ${String(v).padStart(7)}  ${k}`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
