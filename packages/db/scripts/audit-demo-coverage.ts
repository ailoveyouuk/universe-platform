import { Prisma } from "@prisma/client";
import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Read-only coverage audit (2026-10-24): how much simulated data the Universe Demo organisation holds, per table, flagging empty tables,
 * plus the specific shapes the scorecard (quote price, tender performance) and the tender chain need. Writes nothing.
 */
async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  const orgId = demo[0].id;

  const models = Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === "organizationId"));
  const rows: { model: string; count: number | string }[] = [];
  await withTenantContext(orgId, async (tx) => {
    for (const m of models) {
      const delegate = (tx as any)[m.name.charAt(0).toLowerCase() + m.name.slice(1)];
      if (!delegate?.count) continue;
      try {
        rows.push({ model: m.name, count: await delegate.count({ where: { organizationId: orgId } }) });
      } catch (e) {
        rows.push({ model: m.name, count: "error: " + String((e as Error).message).split("\n").pop()!.slice(0, 80) });
      }
    }
  });
  rows.sort((a, b) => a.model.localeCompare(b.model));
  console.log("== Row counts owned by Universe Demo (organizationId) ==");
  for (const r of rows) console.log(`${r.count === 0 ? "EMPTY " : "      "}${r.model}: ${r.count}`);

  console.log("\n== Scorecard shapes ==");
  await withTenantContext(orgId, async (tx) => {
    const q = await tx.supplierEnquiry.groupBy({ by: ["responseStatus"], where: { organizationId: orgId }, _count: { _all: true } });
    console.log("Enquiries by status:", JSON.stringify(q.map((x) => [x.responseStatus, x._count._all])));
    const quoted = await tx.supplierEnquiry.findMany({ where: { organizationId: orgId, responseStatus: "QUOTED", quotedPrice: { not: null }, quotedCurrency: { not: null } }, select: { projectLineId: true, supplierId: true, quotedCurrency: true } });
    const byLine = new Map<string, Set<string>>();
    for (const e of quoted) { const k = `${e.projectLineId}|${e.quotedCurrency}`; (byLine.get(k) ?? byLine.set(k, new Set()).get(k)!).add(e.supplierId); }
    console.log(`Quoted enquiries with price+currency: ${quoted.length}; lines (same currency) with 2+ quoting suppliers: ${[...byLine.values()].filter((s) => s.size >= 2).length}`);
    const partners = await tx.partner.findMany({ where: { organizationId: orgId }, select: { id: true, registryEntryId: true, roles: { select: { roleType: true } } } });
    const suppliers = partners.filter((p) => p.roles.some((r) => r.roleType === "SUPPLIER"));
    console.log(`Partners: ${partners.length}; suppliers: ${suppliers.length}; suppliers with a registry entry: ${suppliers.filter((s) => s.registryEntryId).length}`);
    const regIds = suppliers.map((s) => s.registryEntryId).filter(Boolean) as string[];
    const linked = regIds.length ? await tx.stakeholderRegistryEntry.count({ where: { id: { in: regIds }, linkedOrganizationId: { not: null } } }) : 0;
    console.log(`  of those, registry entries linked to a platform organisation: ${linked}`);
    const perf = await tx.tenderPerformanceRecord.groupBy({ by: ["outcome"], where: { organizationId: orgId }, _count: { _all: true } });
    console.log("Tender performance records owned by demo, by outcome:", JSON.stringify(perf.map((x) => [x.outcome, x._count._all])));
    const t = await tx.tender.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: { _all: true } });
    console.log("Tenders owned by demo, by status:", JSON.stringify(t.map((x) => [x.status, x._count._all])));
  });
  const asAwardee = await withPlatformStaffContext((tx) => tx.tenderPerformanceRecord.count({ where: { awardedOrganizationId: orgId } }));
  const sim = await withPlatformStaffContext((tx) => tx.organization.count({ where: { isSimulated: true, isDemo: false } }));
  console.log(`Performance records where demo is the awarded supplier: ${asAwardee}; simulated non-demo organisations: ${sim}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
