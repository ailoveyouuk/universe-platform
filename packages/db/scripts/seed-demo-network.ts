import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Universe network for Universe Demo (2026-10-27, requested by Lewis: "everything is interconnected"). Simulated data only.
 *  1. Every demo stakeholder without a registry link gets a SIMULATED shared registry entry (matched by normalised name + country, so duplicates converge).
 *  2. Simulated Universe organisations with a published profile that have awarded to / bid against the demo's tenders, plus a share of the rest,
 *     become stakeholders of the demo (a Partner named after the organisation, linked through a registry entry that points at the organisation,
 *     with a CRM relationship), so their identity, profile and tender history appear in the Universe network tab.
 *  3. Other simulated organisations hold some of the same stakeholders (a Partner in their own organisation pointing at the same registry entry)
 *     so the anonymised "other organisations hold this stakeholder" figures are meaningful: some reach the five-organisation floor, some do not.
 * Idempotent (skips what is linked); bounded; DRY_RUN defaults to true.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const MAX_OTHER_PARTNERS = 6000;
const MAX_ORG_PARTNERS = 60;
const DAY = 86400000;
const norm = (s: string) => s.toLowerCase().replace(/\b(ltd|limited|llc|inc|gmbh|plc|sa|co|corp|corporation|pvt|private|company|ag|bv|srl)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const h = (s: string) => createHash("sha256").update(s).digest().readUInt32LE(0) / 4294967296;
const chunk = <T,>(a: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const ROLE: Record<string, string> = { MANUFACTURER: "MANUFACTURER", SUPPLIER: "SUPPLIER", FREIGHT_FORWARDER: "FREIGHT_FORWARDER", LOGISTICS: "LOGISTICS", WAREHOUSING: "WAREHOUSING" };

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    if (!demo) throw new Error("Universe Demo not found.");
    const org = demo.id;
    const admin = await tx.user.findFirst({ where: { organizationId: org, archivedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!admin) throw new Error("no user");

    // ---- 1. registry entries for demo stakeholders
    const parts = await tx.partner.findMany({ where: { organizationId: org, registryEntryId: null }, select: { id: true, name: true, countryCode: true, companyRegistrationNumber: true, vatNumber: true } });
    const roles = new Map<string, string[]>();
    for (const c of chunk(parts.map((p) => p.id), 1000)) for (const r of await tx.partnerRole.findMany({ where: { partnerId: { in: c }, isActive: true }, select: { partnerId: true, roleType: true } })) { const a = roles.get(r.partnerId) ?? []; a.push(r.roleType); roles.set(r.partnerId, a); }
    const simEntries = await tx.stakeholderRegistryEntry.findMany({ where: { isSimulated: true }, select: { id: true, normalizedName: true, countryCode: true } });
    const entryKey = new Map(simEntries.map((e) => [`${e.normalizedName}|${e.countryCode ?? ""}`, e.id]));
    const newEntries: { id: string; isSimulated: boolean; legalName: string; normalizedName: string; countryCode: string | null; registrationNumber: string | null; vatNumber: string | null; stakeholderTypes: string }[] = [];
    const link: { partnerId: string; entryId: string }[] = [];
    for (const p of parts) {
      const k = `${norm(p.name)}|${p.countryCode ?? ""}`;
      let id = entryKey.get(k);
      if (!id) { id = randomUUID(); entryKey.set(k, id); newEntries.push({ id, isSimulated: true, legalName: p.name, normalizedName: norm(p.name), countryCode: p.countryCode, registrationNumber: p.companyRegistrationNumber, vatNumber: p.vatNumber, stakeholderTypes: JSON.stringify([...new Set(roles.get(p.id) ?? [])]) }); }
      link.push({ partnerId: p.id, entryId: id });
    }
    console.log(`${dryRun ? "[dry run] would create" : "creating"} ${newEntries.length} registry entries and link ${link.length} demo stakeholders`);
    if (!dryRun) {
      for (const c of chunk(newEntries, 300)) await tx.stakeholderRegistryEntry.createMany({ data: c });
      for (const c of chunk(link, 1000)) { const json = JSON.stringify(c); await tx.$executeRaw`UPDATE p SET p.registryEntryId = j.entryId FROM partners p JOIN OPENJSON(${json}) WITH (partnerId nvarchar(36) '$.partnerId', entryId nvarchar(36) '$.entryId') j ON p.id = j.partnerId`; }
    }

    // ---- 2. published simulated organisations as stakeholders
    const published = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, id: { not: org }, supplierProfile: { is: { publishedAt: { not: null } } } }, select: { id: true, name: true, type: true, additionalTypes: true, countryOfRegistrationCode: true, supplierProfile: { select: { website: true } } } });
    const awarded = new Set((await tx.tenderAward.findMany({ where: { organizationId: org }, select: { awardedOrganizationId: true } })).map((a) => a.awardedOrganizationId));
    const bid = new Set((await tx.tenderParticipation.findMany({ where: { issuerOrganizationId: org }, select: { organizationId: true } })).map((a) => a.organizationId));
    const already = new Set((await tx.stakeholderRegistryEntry.findMany({ where: { linkedOrganizationId: { in: published.map((o) => o.id) }, partners: { some: { organizationId: org } } }, select: { linkedOrganizationId: true } })).map((e) => e.linkedOrganizationId));
    const ranked = published.filter((o) => !already.has(o.id)).sort((a, b) => Number(awarded.has(b.id)) - Number(awarded.has(a.id)) || Number(bid.has(b.id)) - Number(bid.has(a.id)) || h(a.id) - h(b.id)).slice(0, MAX_ORG_PARTNERS);
    console.log(`published simulated organisations: ${published.length} (awarded by demo ${awarded.size}, bid on demo tenders ${bid.size}); adding ${ranked.length} as stakeholders`);
    const owners = (await tx.user.findMany({ where: { organizationId: org, archivedAt: null }, select: { id: true }, take: 20 })).map((u) => u.id);
    if (!dryRun) {
      let n = 0;
      for (const o of ranked) {
        const types = [...new Set([o.type, ...(o.additionalTypes ?? "").split(/[,;|]/).map((s) => s.trim())].map((t) => ROLE[t]).filter(Boolean))];
        let entry = await tx.stakeholderRegistryEntry.findFirst({ where: { linkedOrganizationId: o.id }, select: { id: true } });
        if (!entry) entry = await tx.stakeholderRegistryEntry.create({ data: { isSimulated: true, legalName: o.name, normalizedName: norm(o.name), countryCode: o.countryOfRegistrationCode, website: o.supplierProfile?.website ?? null, stakeholderTypes: JSON.stringify(types), linkedOrganizationId: o.id }, select: { id: true } });
        const p = await tx.partner.create({ data: { organizationId: org, name: o.name, normalizedName: norm(o.name), countryCode: o.countryOfRegistrationCode, website: o.supplierProfile?.website ?? null, registryEntryId: entry.id, approvalStatus: "APPROVED", roles: { create: types.map((roleType) => ({ roleType })) } }, select: { id: true } });
        const active = h(o.id + "a") < 0.8;
        await tx.crmRelationship.create({ data: { organizationId: org, partnerId: p.id, counterpartyOrganizationId: o.id, counterpartyKey: `partner:${p.id}`, status: active ? "ACTIVE" : "PROSPECT", tier: awarded.has(o.id) ? "KEY" : "STANDARD", ownerUserId: owners.length ? owners[Math.floor(h(o.id + "o") * owners.length)] : null, reviewIntervalMonths: 12, nextReviewDue: new Date(Date.now() + (60 + Math.floor(h(o.id + "r") * 300)) * DAY), createdById: admin.id } });
        n++;
      }
      console.log(`added ${n} Universe organisations as stakeholders`);
    }

    // ---- 3. other simulated organisations holding the same stakeholders
    const others = await tx.organization.findMany({ where: { isSimulated: true, isDemo: false, id: { not: org } }, select: { id: true }, take: 400 });
    if (!others.length) { console.log("no other simulated organisations"); return; }
    const mine = await tx.partner.findMany({ where: { organizationId: org, registryEntryId: { not: null } }, select: { id: true, registryEntryId: true, name: true, countryCode: true } });
    const byEntry = new Map<string, { name: string; countryCode: string | null; roles: string[] }>();
    for (const c of chunk(mine.map((p) => p.id), 1000)) for (const r of await tx.partnerRole.findMany({ where: { partnerId: { in: c }, isActive: true }, select: { partnerId: true, roleType: true } })) { const p = mine.find((x) => x.id === r.partnerId)!; const e = byEntry.get(p.registryEntryId!) ?? { name: p.name, countryCode: p.countryCode, roles: [] }; e.roles.push(r.roleType); byEntry.set(p.registryEntryId!, e); }
    const have = new Set((await tx.partner.findMany({ where: { organizationId: { in: others.map((o) => o.id) }, registryEntryId: { not: null } }, select: { registryEntryId: true } })).map((p) => p.registryEntryId));
    const plan: { organizationId: string; entryId: string; name: string; countryCode: string | null; role: string }[] = [];
    for (const [entryId, e] of byEntry) {
      if (have.has(entryId) || h(entryId + "n") > 0.35) continue;
      const k = h(entryId + "k") < 0.45 ? 2 + Math.floor(h(entryId + "j") * 3) : 5 + Math.floor(h(entryId + "j") * 10); // 2-4 (below the floor) or 5-14
      const picks = [...others].sort((a, b) => h(entryId + a.id) - h(entryId + b.id)).slice(0, k);
      for (const o of picks) plan.push({ organizationId: o.id, entryId, name: e.name, countryCode: e.countryCode, role: e.roles[0] ?? "SUPPLIER" });
      if (plan.length >= MAX_OTHER_PARTNERS) break;
    }
    const above = new Map<string, number>(); for (const p of plan) above.set(p.entryId, (above.get(p.entryId) ?? 0) + 1);
    console.log(`${dryRun ? "[dry run] would add" : "adding"} ${plan.length} partners in other simulated organisations across ${above.size} shared stakeholders (${[...above.values()].filter((v) => v >= 5).length} at or above the floor of 5)`);
    if (!dryRun) {
      for (const c of chunk(plan, 300)) {
        const rows = c.map((p) => ({ id: randomUUID(), ...p }));
        await tx.partner.createMany({ data: rows.map((r) => ({ id: r.id, organizationId: r.organizationId, name: r.name, normalizedName: norm(r.name), countryCode: r.countryCode, registryEntryId: r.entryId, approvalStatus: "APPROVED" })) });
        await tx.partnerRole.createMany({ data: rows.map((r) => ({ partnerId: r.id, roleType: r.role })) });
      }
    }
  });
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
