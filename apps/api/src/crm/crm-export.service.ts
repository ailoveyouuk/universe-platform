import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { withTenantContext } from "@universe/db";
import { CRM_EXPORT_ENTITIES, categoryLabel, type ProductExportFile } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { csvFile, csvRow, EXPORT_PAGE, EXPORT_ROW_LIMIT, isoDate } from "../common/csv";
import { CrmService, type CrmListQuery } from "./crm.service";

/**
 * CRM exports (2026-10-27, Lewis's rule: an organisation can export everything it adds under its own account). One CSV per kind of record, limited to the stakeholders in
 * the list view the person has chosen (same filters as the list). Read inside the caller's tenant context, so no other organisation's rows can appear.
 * Needs crm.manage because contacts are personal data; confidential interactions follow the interaction visibility rule. Every export is written to the change log.
 */
@Injectable()
export class CrmExportService {
  constructor(private readonly crm: CrmService) {}

  async export(user: RequestUser, entity: string, q: CrmListQuery): Promise<ProductExportFile> {
    assertHasPermission(user, "crm.manage");
    if (!(CRM_EXPORT_ENTITIES as readonly string[]).includes(entity)) throw new BadRequestException("Unknown export.");
    const manager = user.platformStaffRole !== "NONE" || user.permissions.includes("crm.manage");
    const now = new Date();
    const file = await withTenantContext(user.organizationId, async (tx) => {
      const relWhere = await this.crm.listWhere(tx, user, q, now, user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view"));
      const org = user.organizationId;
      const lines: string[] = []; let truncated = false;
      const collect = async <T extends { id: string }>(find: (page: { take: number; skip?: number; cursor?: { id: string }; orderBy: { id: "asc" } }) => Promise<T[]>, row: (r: T) => unknown[]) => {
        let cursor: string | undefined;
        for (;;) {
          const rows = await find({ take: EXPORT_PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" } });
          if (!rows.length) break;
          for (const r of rows) { if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; } lines.push(csvRow(row(r))); }
          if (truncated || rows.length < EXPORT_PAGE) break;
          cursor = rows[rows.length - 1].id;
        }
      };
      const names = new Map((await tx.user.findMany({ where: { organizationId: org }, select: { id: true, forename: true, surname: true } })).map((u) => [u.id, `${u.forename} ${u.surname}`]));
      const owner = (id: string | null) => (id ? names.get(id) ?? "" : "");
      const inView = { relationship: { is: relWhere } };

      if (entity === "relationships") {
        const header = ["Relationship ID", "Stakeholder", "Kinds", "Country", "Tier", "Status", "Owner", "Summary", "Tags", "Last interaction", "Last reviewed", "Next review due", "Review every (months)", "Created"];
        await collect((pg) => tx.crmRelationship.findMany({ where: relWhere, include: { partner: { select: { name: true, countryCode: true, roles: { where: { isActive: true }, select: { roleType: true } } } }, tagLinks: { where: { removedAt: null }, select: { tag: { select: { name: true } } } }, interactions: { where: { archivedAt: null, confidential: false }, orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } }, ...pg }),
          (r) => [r.id, r.partner?.name, r.partner?.roles.map((x) => categoryLabel(x.roleType)).join("; "), r.partner?.countryCode, r.tier, r.status, owner(r.ownerUserId), r.summary, r.tagLinks.map((t) => t.tag.name).join("; "), isoDate(r.interactions[0]?.occurredAt), isoDate(r.lastReviewedAt), isoDate(r.nextReviewDue), r.reviewIntervalMonths, isoDate(r.createdAt)]);
        return csvFile("crm-stakeholders", header, lines, truncated);
      }
      if (entity === "contacts") {
        const header = ["Contact ID", "Name", "Job title", "Email", "Phone", "Stakeholder", "Main contact", "Role in decisions", "Status", "Lawful basis", "Last verified"];
        const profiles = new Map((await tx.crmContactProfile.findMany({ where: { organizationId: org }, select: { contactId: true, isPrimary: true, decisionRole: true, status: true, lawfulBasis: true, lastVerifiedAt: true } })).map((p) => [p.contactId, p]));
        await collect((pg) => tx.contact.findMany({ where: { organizationId: org, partner: { crmRelationships: { some: { AND: [relWhere] } } } }, include: { partner: { select: { name: true } } }, ...pg }),
          (r) => { const p = profiles.get(r.id); return [r.id, r.name, r.title, r.email, r.phone, r.partner.name, p?.isPrimary ? "Yes" : "No", p?.decisionRole, p?.status ?? "ACTIVE", p?.lawfulBasis, isoDate(p?.lastVerifiedAt)]; });
        return csvFile("crm-contacts", header, lines, truncated);
      }
      if (entity === "interactions") {
        const header = ["Interaction ID", "Date", "Type", "Title", "Stakeholder", "Summary", "Outcome", "Linked work", "Confidential"];
        const vis: Prisma.CrmInteractionWhereInput = manager ? {} : { OR: [{ confidential: false }, { createdById: user.id }] };
        await collect((pg) => tx.crmInteraction.findMany({ where: { organizationId: org, archivedAt: null, ...inView, ...vis }, include: { relationship: { select: { partner: { select: { name: true } } } } }, ...pg }), (r) => [r.id, isoDate(r.occurredAt), r.type, r.title, r.relationship.partner?.name, r.summary, r.outcome, r.linkedLabel, r.confidential ? "Yes" : "No"]);
        return csvFile("crm-interactions", header, lines, truncated);
      }
      if (entity === "opportunities") {
        const header = ["Opportunity ID", "Title", "Stakeholder", "Kind", "Stage", "Expected date", "Expected value", "Currency", "Owner", "Linked work", "Notes"];
        await collect((pg) => tx.crmOpportunity.findMany({ where: { organizationId: org, archivedAt: null, ...inView }, include: { relationship: { select: { partner: { select: { name: true } } } } }, ...pg }), (r) => [r.id, r.title, r.relationship.partner?.name, r.kind, r.stage, isoDate(r.expectedDate), r.expectedValue?.toString(), r.currency, owner(r.ownerUserId), r.linkedLabel, r.notes]);
        return csvFile("crm-opportunities", header, lines, truncated);
      }
      if (entity === "places") {
        const header = ["Place ID", "Name", "Kind", "Stakeholder", "City", "Country", "Address", "Phone", "Email", "Notes"];
        await collect((pg) => tx.crmLocation.findMany({ where: { organizationId: org, archivedAt: null, ...inView }, include: { relationship: { select: { partner: { select: { name: true } } } } }, ...pg }), (r) => [r.id, r.name, r.kind, r.relationship.partner?.name, r.city, r.countryCode, r.address, r.phone, r.email, r.notes]);
        return csvFile("crm-places", header, lines, truncated);
      }
      const header = ["Record ID", "Date", "Direction", "Category", "Stakeholder", "Person", "Description", "Business reason", "Amount", "Currency", "Value in policy currency", "Public official", "Status", "Decision note"];
      await collect((pg) => tx.crmHospitalityRecord.findMany({ where: { organizationId: org, archivedAt: null, ...inView }, include: { relationship: { select: { partner: { select: { name: true } } } } }, ...pg }), (r) => [r.id, isoDate(r.occurredOn), r.direction, r.category, r.relationship.partner?.name, r.personName, r.description, r.businessReason, r.amount.toString(), r.currency, r.valueInPolicyCurrency?.toString(), r.publicOfficial ? "Yes" : "No", r.status, r.decisionNote]);
      return csvFile("crm-gifts-hospitality", header, lines, truncated);
    });
    await withTenantContext(user.organizationId, (tx) =>
      recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_exports", recordId: entity, changedById: user.id, changes: [{ field: `${entity}_export`, oldValue: null, newValue: `${file.rowCount} rows${file.truncated ? " (truncated)" : ""}; filters: ${JSON.stringify(Object.fromEntries(Object.entries(q).filter(([, v]) => v)))}`.slice(0, 900) }] }),
    );
    return file;
  }
}
