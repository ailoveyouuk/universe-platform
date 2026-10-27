import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Stakeholder categories for the demo CRM (2026-10-27, requested by Lewis: categories aligned across the platform, with a count and drill-down per kind).
 * Simulated data only. Two steps:
 *  1. Demo stakeholders that point at a Universe organisation (through the shared registry) get the stakeholder role that matches the organisation's type
 *     and any additional types, where they lack it. Tendering and purchasing bodies, procurement service agents and funders were added earlier with no role.
 *  2. Published simulated organisations of those three buyer-side types that are not yet stakeholders are added (up to MAX_ADD), so each kind has a
 *     meaningful number of records to filter to. Each gets a Partner, a registry link, the matching role and a CRM relationship.
 * Idempotent; DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const MAX_ADD = 90;
const ROLE_BY_ORG_TYPE = new Set(["MANUFACTURER", "SUPPLIER", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR"]);
const BUYER_SIDE = ["TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR"];
const norm = (s: string) => s.toLowerCase().replace(/\b(ltd|limited|llc|inc|gmbh|plc|sa|co|corp|corporation|pvt|private|company|ag|bv|srl)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const typesOf = (o: { type: string; additionalTypes: string | null }) => [...new Set([o.type, ...(o.additionalTypes ?? "").split(/[,;|]/).map((s) => s.trim())].filter((t) => ROLE_BY_ORG_TYPE.has(t)))];

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const owners = (await tx.user.findMany({ where: { organizationId: org, archivedAt: null }, select: { id: true }, take: 20 })).map((u) => u.id);

    // 1. roles for stakeholders that are Universe organisations
    const linked = await tx.partner.findMany({ where: { organizationId: org, registryEntry: { is: { linkedOrganizationId: { not: null } } } }, select: { id: true, registryEntry: { select: { linkedOrganizationId: true } }, roles: { where: { isActive: true }, select: { roleType: true } } } });
    const orgs = new Map((await tx.organization.findMany({ where: { id: { in: [...new Set(linked.map((p) => p.registryEntry!.linkedOrganizationId!))] } }, select: { id: true, type: true, additionalTypes: true } })).map((o) => [o.id, o]));
    const missing: { partnerId: string; roleType: string }[] = [];
    for (const p of linked) { const o = orgs.get(p.registryEntry!.linkedOrganizationId!); if (!o) continue; const have = new Set(p.roles.map((r) => r.roleType)); for (const t of typesOf(o)) if (!have.has(t)) missing.push({ partnerId: p.id, roleType: t }); }
    console.log(`${dryRun ? "[dry run] would add" : "adding"} ${missing.length} roles to ${new Set(missing.map((m) => m.partnerId)).size} of ${linked.length} stakeholders that are Universe organisations`);
    if (!dryRun && missing.length) await tx.partnerRole.createMany({ data: missing });

    // 2. more buyer-side organisations as stakeholders
    const published = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, id: { not: org }, type: { in: BUYER_SIDE }, supplierProfile: { is: { publishedAt: { not: null } } } }, select: { id: true, name: true, type: true, additionalTypes: true, countryOfRegistrationCode: true, supplierProfile: { select: { website: true } } }, orderBy: { name: "asc" } });
    const already = new Set((await tx.stakeholderRegistryEntry.findMany({ where: { linkedOrganizationId: { in: published.map((o) => o.id) }, partners: { some: { organizationId: org } } }, select: { linkedOrganizationId: true } })).map((e) => e.linkedOrganizationId));
    const todo = published.filter((o) => !already.has(o.id)).slice(0, MAX_ADD);
    const byType = BUYER_SIDE.map((t) => `${t}: ${todo.filter((o) => o.type === t).length}`).join(", ");
    console.log(`published simulated buyer-side organisations: ${published.length}; ${dryRun ? "[dry run] would add" : "adding"} ${todo.length} (${byType})`);
    if (dryRun) return;
    for (const o of todo) {
      const types = typesOf(o);
      let entry = await tx.stakeholderRegistryEntry.findFirst({ where: { linkedOrganizationId: o.id }, select: { id: true } });
      if (!entry) entry = await tx.stakeholderRegistryEntry.create({ data: { isSimulated: true, legalName: o.name, normalizedName: norm(o.name), countryCode: o.countryOfRegistrationCode, website: o.supplierProfile?.website ?? null, stakeholderTypes: JSON.stringify(types), linkedOrganizationId: o.id }, select: { id: true } });
      const p = await tx.partner.create({ data: { organizationId: org, name: o.name, normalizedName: norm(o.name), countryCode: o.countryOfRegistrationCode, website: o.supplierProfile?.website ?? null, registryEntryId: entry.id, approvalStatus: "APPROVED", roles: { create: types.map((roleType) => ({ roleType })) } }, select: { id: true } });
      const k = Math.abs([...o.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100;
      await tx.crmRelationship.create({ data: { organizationId: org, partnerId: p.id, counterpartyOrganizationId: o.id, counterpartyKey: `partner:${p.id}`, status: k < 70 ? "ACTIVE" : "PROSPECT", tier: "STANDARD", ownerUserId: owners.length ? owners[k % owners.length] : null, reviewIntervalMonths: 12, nextReviewDue: new Date(Date.now() + (60 + (k * 3)) * 86400000) } });
    }
    console.log(`added ${todo.length} Universe organisations as stakeholders`);
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
