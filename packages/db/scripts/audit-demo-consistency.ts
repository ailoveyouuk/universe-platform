import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/** Read-only audit (2026-10-20): counts cross-field inconsistencies in the simulated demo data. Writes nothing. */
async function demoOrgId(): Promise<string> {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  return demo[0].id;
}
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const t = (d?: Date | null) => (d ? d.getTime() : null);

async function main() {
  const orgId = await demoOrgId();
  const c: Record<string, number> = {};
  const bump = (k: string, n = 1) => { c[k] = (c[k] ?? 0) + n; };
  const approvals = await withTenantContext(orgId, (tx) => tx.productSourceApproval.findMany({ where: { organizationId: orgId, isArchived: false }, select: { productMasterId: true, manufacturerId: true, supplierId: true } }));
  const approvedPair = new Set(approvals.map((a) => `${a.productMasterId}|${a.manufacturerId}`));
  const partners = new Map((await prisma.partner.findMany({ where: { organizationId: orgId }, select: { id: true, countryCode: true, roles: { select: { roleType: true } } } })).map((p) => [p.id, p]));
  const batches = new Map((await withTenantContext(orgId, (tx) => tx.productBatch.findMany({ where: { organizationId: orgId }, select: { id: true, productMasterId: true, manufacturerId: true, manufacturedDate: true, expiryDate: true, status: true } }))).map((b) => [b.id, b]));
  const projects = await withTenantContext(orgId, (tx) => tx.project.findMany({ where: { referenceNumber: { startsWith: "SIM-" } }, select: { id: true, referenceNumber: true, sourceTenderId: true, status: true, startDate: true, dueDate: true, submissionDate: true, deliveryCountryCode: true, freightMode: true, incoterm: true, freightForwarderId: true, clientId: true }, orderBy: { id: "asc" } }));
  // Projects that track a tender bid (sourceTenderId) are still being bid for: no freight, supplier, PO or warehouse details exist yet by design.
  const tracking = new Set(projects.filter((p) => p.sourceTenderId).map((p) => p.id));
  bump("projects", projects.length);
  if (tracking.size) bump("tender-tracking projects (supply-chain fields not expected)", tracking.size);
  for (const p of projects) {
    if (tracking.has(p.id)) continue;
    if (!p.deliveryCountryCode) bump("project: no delivery country");
    if (!p.freightMode) bump("project: no freight mode");
    if (!p.incoterm) bump("project: no incoterm");
    if (!p.freightForwarderId) bump("project: no freight forwarder");
    if (p.startDate && p.dueDate && p.startDate > p.dueDate) bump("project: start after due");
    if (p.status === "COMPLETED" && p.dueDate && p.dueDate.getTime() > Date.now()) bump("project: completed with a future due date");
  }
  const pmap = new Map(projects.map((p) => [p.id, p]));
  const lineMap = new Map<string, { actual: Date | null }>();
  for (const group of chunks(projects, 60)) {
    await withTenantContext(orgId, async (tx) => {
      const lines = await tx.projectLine.findMany({ where: { projectId: { in: group.map((g) => g.id) } } });
      for (const l of lines) {
        bump("lines");
        lineMap.set(l.id, { actual: l.actualDeliveryDate });
        const proj = pmap.get(l.projectId)!;
        if (tracking.has(l.projectId)) continue;
        if (!l.productMasterId) bump("line: no product");
        if (!l.manufacturerId) bump("line: no manufacturer");
        if (!l.supplierId) bump("line: no supplier");
        if (l.productMasterId && l.manufacturerId && !approvedPair.has(`${l.productMasterId}|${l.manufacturerId}`)) bump("line: manufacturer not approved for the product");
        const m = l.manufacturerId ? partners.get(l.manufacturerId) : null;
        if (m && m.countryCode && l.countryOfManufactureCode && m.countryCode !== l.countryOfManufactureCode) bump("line: country of manufacture differs from the manufacturer's country");
        if (m && !m.roles.some((r) => r.roleType === "MANUFACTURER")) bump("line: manufacturer partner lacks the manufacturer role");
        const s = l.supplierId ? partners.get(l.supplierId) : null;
        if (s && !s.roles.some((r) => r.roleType === "SUPPLIER")) bump("line: supplier partner lacks the supplier role");
        if (l.destinationCountryCode && proj.deliveryCountryCode && l.destinationCountryCode !== proj.deliveryCountryCode) bump("line: destination differs from the project's delivery country");
        if (!l.internalPoNumber) bump("line: no internal PO number");
        if (!l.clientPoNumber) bump("line: no client PO number");
        if (!l.warehouseReferenceNumber) bump("line: no warehouse reference");
        if (l.actualDeliveryDate && !l.internalInvoiceNumber) bump("line: no invoice number");
        // Delivery measures (added 2026-10-26): a delivered line must carry the same on-time / in-full answers the app would compute from its dates and quantities.
        if (l.actualDeliveryDate) {
          if (l.quantityReceived === null || l.quantityReceived === undefined) bump("line: delivered but no quantity received (in full unknown)");
          else if (l.quantity !== null && l.quantity !== undefined && l.supplierInFull !== (l.quantityReceived >= l.quantity)) bump("line: in-full flag does not match quantities");
          if (l.projectedDeliveryDate && l.internalOnTime !== (l.actualDeliveryDate <= l.projectedDeliveryDate)) bump("line: on-time flag does not match dates");
          if (l.goodsCollectedDate && l.supplierGad && l.supplierOnTime !== (l.goodsCollectedDate <= l.supplierGad)) bump("line: supplier on-time flag does not match dates");
        }
        if (l.actualDeliveryDate && !l.productBatchId) bump("line: no batch link");
        else {
          const b = batches.get(l.productBatchId);
          if (b && b.productMasterId !== l.productMasterId) bump("line: batch is of a different product");
          if (b && b.manufacturerId && b.manufacturerId !== l.manufacturerId) bump("line: batch is of a different manufacturer");
        }
        const T = { po: t(l.internalPoDatePlaced), cpo: t(l.clientPoReceiptDate), man: t(l.goodsManufacturedDate), gad: t(l.supplierGad), col: t(l.goodsCollectedDate), proj: t(l.projectedDeliveryDate), act: t(l.actualDeliveryDate), inv: t(l.internalInvoiceDate), pay: t(l.clientPaymentDate), spay: t(l.supplierPaymentDate) };
        const ord = (a: number | null, b: number | null, k: string) => { if (a != null && b != null && a > b) bump(`dates: ${k}`); };
        ord(T.cpo, T.po, "client PO received after the internal PO was placed");
        ord(T.po, T.col, "internal PO placed after goods were collected");
        ord(T.man, T.col, "manufactured after collected");
        ord(T.col, T.act, "collected after delivered");
        ord(T.act, T.inv, "delivered after the invoice date");
        ord(T.inv, T.pay, "invoice after the client payment");
        if (T.po == null) bump("dates: no PO date");
        if (T.col == null && l.actualDeliveryDate) bump("dates: delivered without a collection date");
        if (l.actualDeliveryDate && l.actualDeliveryDate.getTime() > Date.now()) bump("dates: delivery in the future");
        if (l.expiryDate && l.goodsManufacturedDate && l.expiryDate < l.goodsManufacturedDate) bump("dates: expiry before manufacture");
        if (proj.startDate && T.po != null && T.po < proj.startDate.getTime()) bump("dates: PO before the project start");
      }
    });
  }
  const cs = await prisma.qualityComplaint.findMany({ where: { organizationId: orgId }, select: { receivedAt: true, projectLineId: true, productMasterId: true, partnerId: true } });
  for (const x of cs) {
    bump("complaints");
    const l = x.projectLineId ? lineMap.get(x.projectLineId) : null;
    if (l?.actual && x.receivedAt < l.actual) bump("complaint: received before the line was delivered");
    if (!l) bump("complaint: no line");
  }
  // Batch status against expiry (added 2026-10-26).
  const now = new Date();
  for (const b of batches.values()) {
    if (b.expiryDate && b.expiryDate < now && b.status === "ACTIVE") bump("batch: ACTIVE but past its expiry date");
    if (b.status === "EXPIRED" && (!b.expiryDate || b.expiryDate >= now)) bump("batch: EXPIRED but not past its expiry date");
  }
  console.log("AUDIT RESULTS");
  for (const [k, v] of Object.entries(c)) console.log(`  ${String(v).padStart(7)}  ${k}`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
