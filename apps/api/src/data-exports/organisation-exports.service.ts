import { readDeliveryCountries } from "../projects/delivery-countries";
import { BadRequestException, Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { ProductExportFile } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { csvFile, csvRow, EXPORT_PAGE, EXPORT_ROW_LIMIT, isoDate } from "../common/csv";

export const ORGANISATION_EXPORTS = ["partners", "projects", "project-lines"] as const;
export type OrganisationExportEntity = (typeof ORGANISATION_EXPORTS)[number];

/**
 * Exports of an organisation's own records (2026-10-18): everything it added under its own account, read inside its own tenant context
 * so no other organisation's rows can appear. Money columns (project and line costs, partner bank and financial details) are left out
 * of these files; they stay in the app behind the financial-view permission. Every export is audited.
 */
@Injectable()
export class OrganisationExportsService {
  async export(user: RequestUser, entity: string, includeArchived: boolean): Promise<ProductExportFile> {
    if (!(ORGANISATION_EXPORTS as readonly string[]).includes(entity)) throw new BadRequestException("Unknown export.");
    const file = await withTenantContext(user.organizationId, async (tx) => {
      const lines: string[] = [];
      let cursor: string | undefined;
      let truncated = false;
      const archiveFilter = includeArchived ? {} : { isArchived: false };
      if (entity === "partners") {
        const header = ["Stakeholder ID", "Name", "Roles", "Country", "Website", "Approval status", "Risk tier", "Company registration no.", "VAT no.", "Last approval review", "Next approval review due", "Archived", "Created", "Updated"];
        for (;;) {
          const rows = await tx.partner.findMany({ where: { organizationId: user.organizationId, ...archiveFilter }, include: { roles: { where: { isActive: true }, select: { roleType: true } } }, take: EXPORT_PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" } });
          if (rows.length === 0) break;
          for (const r of rows) {
            if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
            lines.push(csvRow([r.id, r.name, r.roles.map((x) => x.roleType).join("; "), r.countryCode, r.website, r.approvalStatus, r.riskTier, r.companyRegistrationNumber, r.vatNumber, isoDate(r.lastApprovalReviewDate), isoDate(r.nextApprovalReviewDue), r.isArchived ? "Yes" : "No", isoDate(r.createdAt), isoDate(r.updatedAt)]));
          }
          if (truncated || rows.length < EXPORT_PAGE) break;
          cursor = rows[rows.length - 1].id;
        }
        return csvFile("stakeholders", header, lines, truncated);
      }
      if (entity === "projects") {
        const header = ["Project ID", "Reference", "Title", "Category", "Type", "Client", "Donor reference", "Delivery countries", "Status", "Start", "Due", "Submitted", "Management responsibility", "Completion stage", "Reason for cancellation", "Incoterm", "Freight mode", "Freight forwarder", "Archived", "Created", "Updated"];
        for (;;) {
          const rows = await tx.project.findMany({ where: { organizationId: user.organizationId, ...archiveFilter }, include: { client: { select: { name: true } }, freightForwarder: { select: { name: true } } }, take: EXPORT_PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" } });
          if (rows.length === 0) break;
          for (const r of rows) {
            if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
            lines.push(csvRow([r.id, r.referenceNumber, r.title, r.category, r.projectType, r.client?.name, r.donorReference, readDeliveryCountries(r).join("; "), r.status, isoDate(r.startDate), isoDate(r.dueDate), isoDate(r.submissionDate), r.managementResponsibility, r.completionStage, r.reasonForCancellation, r.incoterm, r.freightMode, r.freightForwarder?.name, r.isArchived ? "Yes" : "No", isoDate(r.createdAt), isoDate(r.updatedAt)]));
          }
          if (truncated || rows.length < EXPORT_PAGE) break;
          cursor = rows[rows.length - 1].id;
        }
        return csvFile("projects", header, lines, truncated);
      }
      const header = ["Line ID", "Project reference", "Description", "Catalogue product", "Quantity", "Category", "Weight (kg)", "Country of manufacture", "Manufacturer", "Supplier", "Client PO", "Internal PO", "Internal PO placed", "Client PO received", "Goods manufactured", "Required delivery (GAD)", "Supplier GAD", "Warehouse reference", "Collected", "Delivered to client", "Archived"];
      for (;;) {
        const rows = await tx.projectLine.findMany({
          where: { organizationId: user.organizationId, ...(includeArchived ? {} : { archivedAt: null }) },
          include: { project: { select: { referenceNumber: true } }, productMaster: { select: { name: true } }, manufacturer: { select: { name: true } }, supplier: { select: { name: true } } },
          take: EXPORT_PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" },
        });
        if (rows.length === 0) break;
        for (const r of rows) {
          if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
          lines.push(csvRow([r.id, r.project.referenceNumber, r.clientProductDescription, r.productMaster?.name, r.quantity, r.productCategory, r.weightKg?.toString(), r.countryOfManufactureCode, r.manufacturer?.name, r.supplier?.name, r.clientPoNumber, r.internalPoNumber, isoDate(r.internalPoDatePlaced), isoDate(r.clientPoReceiptDate), isoDate(r.goodsManufacturedDate), isoDate(r.gad), isoDate(r.supplierGad), r.warehouseReferenceNumber, isoDate(r.goodsCollectedDate), isoDate(r.goodsDeliveredToClientDate), r.archivedAt ? "Yes" : "No"]));
        }
        if (truncated || rows.length < EXPORT_PAGE) break;
        cursor = rows[rows.length - 1].id;
      }
      return csvFile("project-lines", header, lines, truncated);
    });
    await withTenantContext(user.organizationId, (tx) =>
      recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "data_exports", recordId: entity, changedById: user.id, changes: [{ field: `${entity}_export`, oldValue: null, newValue: `${file.rowCount} rows${file.truncated ? " (truncated)" : ""}; archived included: ${includeArchived}` }] }),
    );
    return file;
  }
}
