import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, withTenantContext } from "@universe/db";
import { canUseApp, type CrmRelationshipTree, type CrmTreeNode } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

const KIND_ORDER = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "LOGISTICS", "WAREHOUSING", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR", "CLIENT"];
const TERMS = { CLIENT: "Client", FREIGHT_FORWARDER: "Freight forwarder", SUPPLIER: "Supplier", MANUFACTURER: "Manufacturer" } as Record<string, string>;
const MAX_PROJECTS = 400;

/**
 * The relationship tree (CRM stage C): where a stakeholder came from, who it has worked with (through the projects this organisation can see and through opportunities),
 * and who else it is likely to connect to. Own records only; no money; nothing from other organisations. Each node is a stakeholder that can be opened as the next root.
 */
@Injectable()
export class CrmTreeService {
  async tree(user: RequestUser, relationshipId: string): Promise<CrmRelationshipTree> {
    assertHasPermission(user, "crm.view");
    const staff = user.platformStaffRole !== "NONE";
    const projectsVisible = (staff || canUseApp(user.apps, "project-management")) && (staff || user.permissions.includes("projects.view"));
    const org = user.organizationId;
    return withTenantContext(org, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: relationshipId, organizationId: org }, include: { partner: { include: { roles: { where: { isActive: true }, select: { roleType: true } } } } } });
      if (!rel) throw new NotFoundException("Stakeholder not found");
      const pid = rel.partnerId;
      const kindsOf = (roles: { roleType: string }[]) => KIND_ORDER.filter((k) => roles.some((r) => r.roleType === k));
      const root = { relationshipId: rel.id, partnerId: pid, name: rel.partner?.name ?? "Stakeholder", kinds: rel.partner ? kindsOf(rel.partner.roles) : [], countryCode: rel.partner?.countryCode ?? null, tier: rel.tier, status: rel.status };

      // ---- Where the record came from ----
      const [creator, firstInteraction, firstOpp] = await Promise.all([
        rel.createdById ? tx.user.findFirst({ where: { id: rel.createdById, organizationId: org }, select: { forename: true, surname: true } }) : Promise.resolve(null),
        tx.crmInteraction.findFirst({ where: { organizationId: org, relationshipId: rel.id }, orderBy: { occurredAt: "asc" }, select: { occurredAt: true } }),
        tx.crmOpportunity.findFirst({ where: { organizationId: org, relationshipId: rel.id }, orderBy: { createdAt: "asc" }, select: { createdAt: true, title: true } }),
      ]);
      const provenance: CrmRelationshipTree["provenance"] = [];
      if (rel.partner) provenance.push({ date: rel.partner.createdAt.toISOString(), label: "Stakeholder record added", detail: "In Project Management, where stakeholders are first created" });
      provenance.push({ date: rel.createdAt.toISOString(), label: "Relationship started in the CRM", detail: creator ? `By ${`${creator.forename} ${creator.surname}`.trim()}` : "Created automatically when the stakeholder was first seen" });
      if (firstInteraction) provenance.push({ date: firstInteraction.occurredAt.toISOString(), label: "First recorded conversation", detail: null });
      if (firstOpp) provenance.push({ date: firstOpp.createdAt.toISOString(), label: "First opportunity", detail: firstOpp.title });

      // ---- Who it has worked with (projects this organisation can see) ----
      type Edge = { projectId: string; partnerId: string; role: string };
      let edges: Edge[] = [];
      const projects = new Map<string, { reference: string; title: string; status: string; date: string }>();
      if (projectsVisible && pid) {
        edges = await tx.$queryRaw<Edge[]>(Prisma.sql`
          SELECT TOP (${MAX_PROJECTS * 12}) x.projectId, x.partnerId, x.role FROM (
            SELECT p.id AS projectId, p.clientId AS partnerId, 'CLIENT' AS role FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL
            UNION SELECT p.id, p.freightForwarderId, 'FREIGHT_FORWARDER' FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL
            UNION SELECT l.projectId, l.supplierId, 'SUPPLIER' FROM project_lines l WHERE l.organizationId = ${org} AND l.archivedAt IS NULL
            UNION SELECT l.projectId, l.manufacturerId, 'MANUFACTURER' FROM project_lines l WHERE l.organizationId = ${org} AND l.archivedAt IS NULL
          ) x WHERE x.partnerId IS NOT NULL AND x.projectId IN (
            SELECT p.id FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND (p.clientId = ${pid} OR p.freightForwarderId = ${pid}
              OR EXISTS (SELECT 1 FROM project_lines l WHERE l.projectId = p.id AND l.archivedAt IS NULL AND (l.supplierId = ${pid} OR l.manufacturerId = ${pid})))
          )`);
        const ids = [...new Set(edges.map((e) => e.projectId))].slice(0, MAX_PROJECTS);
        const ps = ids.length ? await tx.project.findMany({ where: { id: { in: ids }, organizationId: org }, select: { id: true, referenceNumber: true, title: true, status: true, createdAt: true } }) : [];
        for (const p of ps) projects.set(p.id, { reference: p.referenceNumber, title: p.title, status: p.status, date: p.createdAt.toISOString() });
      }
      const others = [...new Set(edges.filter((e) => e.partnerId !== pid && projects.has(e.projectId)).map((e) => e.partnerId))];
      const rels = others.length ? await tx.crmRelationship.findMany({ where: { organizationId: org, partnerId: { in: others }, archivedAt: null }, include: { partner: { include: { roles: { where: { isActive: true }, select: { roleType: true } } } } } }) : [];
      const relByPartner = new Map(rels.map((r) => [r.partnerId!, r]));
      const nodeOf = (partnerId: string): CrmTreeNode => { const r = relByPartner.get(partnerId); return { relationshipId: r?.id ?? null, partnerId, name: r?.partner?.name ?? "Stakeholder not yet in your CRM", kinds: r?.partner ? kindsOf(r.partner.roles) : [], countryCode: r?.partner?.countryCode ?? null }; };
      const projectConnections: CrmRelationshipTree["projectConnections"] = others.map((o) => {
        const mine = edges.filter((e) => e.partnerId === o && projects.has(e.projectId));
        const pids = [...new Set(mine.map((e) => e.projectId))];
        const via = pids.map((id) => ({ ...projects.get(id)!, role: [...new Set(mine.filter((e) => e.projectId === id).map((e) => TERMS[e.role] ?? e.role))].join(", ") })).sort((a, b) => b.date.localeCompare(a.date));
        return { ...nodeOf(o), roles: [...new Set(mine.map((e) => e.role))], sharedProjects: pids.length, latest: via[0]?.date ?? null, via: via.slice(0, 5) };
      }).sort((a, b) => b.sharedProjects - a.sharedProjects || (b.latest ?? "").localeCompare(a.latest ?? "")).slice(0, 40);

      // ---- Through opportunities ----
      const [ownParts, joined] = await Promise.all([
        tx.crmOpportunityParticipant.findMany({ where: { organizationId: org, archivedAt: null, opportunity: { relationshipId: rel.id, archivedAt: null }, relationshipId: { not: rel.id } }, select: { relationshipId: true, role: true, opportunity: { select: { id: true, title: true, stage: true } } }, take: 500 }),
        tx.crmOpportunityParticipant.findMany({ where: { organizationId: org, archivedAt: null, relationshipId: rel.id, opportunity: { archivedAt: null, relationshipId: { not: rel.id } } }, select: { role: true, opportunity: { select: { id: true, title: true, stage: true, relationshipId: true } } }, take: 500 }),
      ]);
      const oppRelIds = [...new Set([...ownParts.map((p) => p.relationshipId), ...joined.map((j) => j.opportunity.relationshipId)])];
      const oppRels = oppRelIds.length ? await tx.crmRelationship.findMany({ where: { id: { in: oppRelIds }, organizationId: org }, include: { partner: { include: { roles: { where: { isActive: true }, select: { roleType: true } } } } } }) : [];
      const oppRelById = new Map(oppRels.map((r) => [r.id, r]));
      const oppNode = (id: string): CrmTreeNode => { const r = oppRelById.get(id); return { relationshipId: id, partnerId: r?.partnerId ?? null, name: r?.partner?.name ?? "Stakeholder", kinds: r?.partner ? kindsOf(r.partner.roles) : [], countryCode: r?.partner?.countryCode ?? null }; };
      const opp = new Map<string, CrmRelationshipTree["opportunityConnections"][number]>();
      const add = (relId: string, via: { id: string; title: string; stage: string; role: string }) => { const cur = opp.get(relId) ?? { ...oppNode(relId), via: [] }; if (!cur.via.some((v) => v.id === via.id && v.role === via.role)) cur.via.push(via); opp.set(relId, cur); };
      for (const p of ownParts) add(p.relationshipId, { id: p.opportunity.id, title: p.opportunity.title, stage: p.opportunity.stage, role: p.role });
      for (const j of joined) add(j.opportunity.relationshipId, { id: j.opportunity.id, title: j.opportunity.title, stage: j.opportunity.stage, role: "OWNER_OF_OPPORTUNITY" });
      const opportunityConnections = [...opp.values()].sort((a, b) => b.via.length - a.via.length).slice(0, 30);

      // ---- Likely further connections, from this organisation's own records ----
      const connected = new Set<string>([rel.id, ...projectConnections.flatMap((c) => (c.relationshipId ? [c.relationshipId] : [])), ...opportunityConnections.flatMap((c) => (c.relationshipId ? [c.relationshipId] : []))]);
      const suggestions = await this.suggest(tx, org, rel.id, root, connected, projectConnections, projectsVisible ? edges : [], projects, pid, kindsOf);
      return { root, provenance: provenance.sort((a, b) => a.date.localeCompare(b.date)), projectConnections, opportunityConnections, suggestions, projectsVisible };
    });
  }

  /** Stakeholders not yet connected who look likely to be: same kind, same country, worked with the same people, or active in the same period. Each carries its reasons. */
  private async suggest(tx: Prisma.TransactionClient, org: string, relId: string, root: { kinds: string[]; countryCode: string | null }, connected: Set<string>,
    conns: CrmRelationshipTree["projectConnections"], edges: { projectId: string; partnerId: string; role: string }[], projects: Map<string, { date: string }>, pid: string | null,
    kindsOf: (r: { roleType: string }[]) => string[]): Promise<CrmRelationshipTree["suggestions"]> {
    const candidates = await tx.crmRelationship.findMany({
      where: { organizationId: org, archivedAt: null, status: { not: "ENDED" }, id: { notIn: [...connected] }, partner: { roles: { some: { isActive: true, roleType: { in: root.kinds.length ? root.kinds : KIND_ORDER } } } } },
      include: { partner: { include: { roles: { where: { isActive: true }, select: { roleType: true } } } } }, take: 400, orderBy: { createdAt: "desc" },
    });
    if (!candidates.length) return [];
    // Who each candidate has worked with, so shared acquaintances can count.
    const mineProjects = new Set(edges.filter((e) => e.partnerId === pid).map((e) => e.projectId));
    const myYears = new Set([...mineProjects].map((id) => projects.get(id)?.date.slice(0, 4)).filter(Boolean) as string[]);
    const myPeople = new Set(conns.map((c) => c.partnerId).filter((x): x is string => !!x));
    const byPartner = new Map<string, Set<string>>();
    for (const e of edges) { const a = byPartner.get(e.partnerId) ?? new Set(); a.add(e.projectId); byPartner.set(e.partnerId, a); }
    const peopleOf = (partnerId: string) => { const out = new Set<string>(); for (const pr of byPartner.get(partnerId) ?? []) for (const e of edges) if (e.projectId === pr && e.partnerId !== partnerId) out.add(e.partnerId); return out; };
    const scored = candidates.map((c) => {
      const reasons: string[] = []; let score = 0;
      const kinds = c.partner ? kindsOf(c.partner.roles) : [];
      const sharedKinds = kinds.filter((k) => root.kinds.includes(k));
      if (sharedKinds.length) { score += 3; reasons.push("Same kind of stakeholder"); }
      if (root.countryCode && c.partner?.countryCode === root.countryCode) { score += 2; reasons.push("Based in the same country"); }
      if (c.partnerId) {
        const common = [...peopleOf(c.partnerId)].filter((x) => myPeople.has(x));
        if (common.length) { score += Math.min(4, common.length * 2); reasons.push(`Has worked with ${common.length} of the same ${common.length === 1 ? "stakeholder" : "stakeholders"}`); }
        const theirYears = new Set([...(byPartner.get(c.partnerId) ?? [])].map((id) => projects.get(id)?.date.slice(0, 4)).filter(Boolean) as string[]);
        if ([...theirYears].some((y) => myYears.has(y))) { score += 1; reasons.push("Active in the same period"); }
      }
      return { relationshipId: c.id, partnerId: c.partnerId, name: c.partner?.name ?? "Stakeholder", kinds, countryCode: c.partner?.countryCode ?? null, score, reasons };
    }).filter((x) => x.score >= 4 && x.reasons.length >= 2);
    return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
  }
}
