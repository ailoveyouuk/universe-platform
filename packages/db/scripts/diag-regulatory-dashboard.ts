import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";
/** Read-only diagnostic (2026-10-20): runs each query behind the Regulatory status dashboard, reporting which one fails. */
async function step<T>(name: string, f: () => Promise<T>): Promise<T | undefined> {
  const t = Date.now();
  try { const r = await f(); console.log(`OK   ${name} (${Date.now() - t} ms)`, Array.isArray(r) ? `rows=${r.length}` : typeof r === "number" ? `n=${r}` : ""); return r; }
  catch (e) { console.log(`FAIL ${name} (${Date.now() - t} ms): ${String((e as Error).message).slice(0, 600)}`); return undefined; }
}
async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true } }));
  const orgId = demo[0].id;
  const soon = new Date(Date.now() + 90 * 86400000), now = new Date();
  const base = { isArchived: false };
  await step("registrations count", () => prisma.productRegulatoryRegistration.count({ where: base }));
  await step("expired count", () => prisma.productRegulatoryRegistration.count({ where: { AND: [base, { OR: [{ status: "EXPIRED" }, { status: "ACTIVE", expiryDate: { lt: now } }] }] } }));
  await step("products with registrations", () => prisma.productMaster.count({ where: { isArchived: false, OR: [{ registrations: { some: { isArchived: false } } }, { productFamily: { registrations: { some: { isArchived: false } } } }] } }));
  await step("attention rows", () => prisma.productRegulatoryRegistration.findMany({ where: { AND: [base, { OR: [{ status: { in: ["SUSPENDED", "WITHDRAWN"] } }, { status: "ACTIVE", expiryDate: { lte: soon } }] }] }, include: { productMaster: { select: { name: true } }, productFamily: { select: { name: true } } }, orderBy: [{ expiryDate: "asc" }], take: 25 }));
  const mine = await step("tenant block", () => withTenantContext(orgId, async (tx) => {
    const verifs = await tx.productRegistrationVerification.findMany({ where: { organizationId: orgId }, select: { registrationId: true } });
    const used = await tx.projectLine.findMany({ where: { archivedAt: null, productMasterId: { not: null } }, distinct: ["productMasterId"], select: { productMasterId: true }, take: 2000 });
    const docs = await tx.productDocument.findMany({ where: { organizationId: orgId, archivedAt: null }, select: { status: true } });
    console.log(`     verifications=${verifs.length} usedProducts=${used.length} docs=${docs.length}`);
    return used.map((u) => u.productMasterId as string);
  }));
  if (mine) {
    const fams = await step("used families", () => prisma.productMaster.findMany({ where: { id: { in: mine }, productFamilyId: { not: null } }, select: { productFamilyId: true } }));
    const famIds = [...new Set((fams ?? []).map((p) => p.productFamilyId as string))];
    console.log(`     distinct families=${famIds.length}, in-list parameters=${mine.length + famIds.length}`);
    await step("used registrations (productMaster in + family in)", () => prisma.productRegulatoryRegistration.findMany({ where: { isArchived: false, OR: [{ productMasterId: { in: mine } }, ...(famIds.length ? [{ productFamilyId: { in: famIds } }] : [])] }, select: { id: true } }));
  }
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
