import { readDeliveryCountries } from "../projects/delivery-countries";
import { BadRequestException, Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { ORGANISATION_EXPORT_ENTITIES, type ProductExportFile } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { csvFile, csvRow, EXPORT_PAGE, EXPORT_ROW_LIMIT, isoDate } from "../common/csv";

export const ORGANISATION_EXPORTS = ORGANISATION_EXPORT_ENTITIES;

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
      /** Pages through one table by id, pushing one CSV row per record, up to the row ceiling. */
      const collect = async <T extends { id: string }>(find: (page: { take: number; cursor?: { id: string }; skip?: number }) => Promise<T[]>, toRow: (r: T) => unknown[]) => {
        let cur: string | undefined;
        for (;;) {
          const rows = await find({ take: EXPORT_PAGE, ...(cur ? { cursor: { id: cur }, skip: 1 } : {}) });
          if (rows.length === 0) break;
          for (const r of rows) {
            if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
            lines.push(csvRow(toRow(r)));
          }
          if (truncated || rows.length < EXPORT_PAGE) break;
          cur = rows[rows.length - 1].id;
        }
      };
      const org = { organizationId: user.organizationId };
      const by = { id: "asc" as const };
      if (entity === "contacts") {
        const header = ["Contact ID", "Name", "Job title", "Email", "Phone", "Stakeholder"];
        await collect((pg) => tx.contact.findMany({ where: org, include: { partner: { select: { name: true } } }, orderBy: by, ...pg }), (r) => [r.id, r.name, r.title, r.email, r.phone, r.partner?.name]);
        return csvFile("contacts", header, lines, truncated);
      }
      if (entity === "batches") {
        const header = ["Batch ID", "Batch number", "Product", "Manufacturer", "Manufactured", "Expiry", "Storage conditions", "Qualification pathway", "Pathway expiry", "MA/PL", "Status", "Notes", "Created"];
        await collect((pg) => tx.productBatch.findMany({ where: org, include: { productMaster: { select: { name: true } }, manufacturer: { select: { name: true } } }, orderBy: by, ...pg }), (r) => [r.id, r.batchNumber, r.productMaster?.name, r.manufacturer?.name, isoDate(r.manufacturedDate), isoDate(r.expiryDate), r.storageConditions, r.qualificationPathway, isoDate(r.qualificationPathwayExpiryDate), r.maPl, r.status, r.notes, isoDate(r.createdAt)]);
        return csvFile("batches", header, lines, truncated);
      }
      if (entity === "logistics") {
        const header = ["Line ID", "Project reference", "Description", "Country of manufacture", "Destination country", "Transport mode", "Incoterm", "Commodity group", "Weight used (kg)", "Weight estimated", "Distance (km)", "CO2e (kg)", "Duration (days)", "Efficiency score (1-10)", "Score band", "Methodology", "Calculated"];
        await collect((pg) => tx.projectLineLogisticsMetric.findMany({ where: org, include: { projectLine: { select: { clientProductDescription: true, project: { select: { referenceNumber: true } } } } }, orderBy: by, ...pg }), (r) => [r.projectLineId, r.projectLine?.project?.referenceNumber, r.projectLine?.clientProductDescription, r.manufactureCountryCode, r.destinationCountryCode, r.transportMode, r.incoterm, r.commodityGroup, r.weightKgUsed?.toString(), r.weightEstimated ? "Yes" : "No", r.distanceKm?.toString(), r.co2TotalKg?.toString(), r.durationDays, r.efficiencyScore, r.scoreBand, r.methodologyVersion, isoDate(r.calculatedAt)]);
        return csvFile("logistics-co2", header, lines, truncated);
      }
      if (entity === "certifications") {
        const header = ["Certification ID", "Stakeholder", "Type", "Reference", "Revision", "Issuing body", "Issued", "Expiry", "Verified", "Status", "Notes"];
        await collect((pg) => tx.partnerCertification.findMany({ where: org, include: { partner: { select: { name: true } } }, orderBy: by, ...pg }), (r) => [r.id, r.partner?.name, r.type, r.referenceNumber, r.revision, r.issuingBody, isoDate(r.issuedDate), isoDate(r.expiryDate), isoDate(r.verifiedAt), r.status, r.notes]);
        return csvFile("certifications", header, lines, truncated);
      }
      if (entity === "evidence") {
        const header = ["Evidence ID", "Stakeholder", "Standard", "Reference", "Issuing body", "Issued", "Expiry", "Result", "Status", "Verified", "Notes"];
        await collect((pg) => tx.stakeholderEvidenceRecord.findMany({ where: org, include: { partner: { select: { name: true } }, standard: { select: { name: true } } }, orderBy: by, ...pg }), (r) => [r.id, r.partner?.name, r.standard?.name, r.referenceNumber, r.issuingBody, isoDate(r.issuedDate), isoDate(r.expiryDate), r.result, r.status, isoDate(r.verifiedAt), r.notes]);
        return csvFile("quality-evidence", header, lines, truncated);
      }
      if (entity === "risks") {
        const header = ["Risk ID", "Subject type", "Subject ID", "Title", "Description", "Severity", "Likelihood", "Mitigation", "Owner", "Status", "Review date", "Created", "Updated"];
        await collect((pg) => tx.riskAssessment.findMany({ where: org, include: { owner: { select: { forename: true, surname: true } } }, orderBy: by, ...pg }), (r) => [r.id, r.subjectType, r.subjectId, r.title, r.description, r.severity, r.likelihood, r.mitigation, r.owner ? `${r.owner.forename} ${r.owner.surname}` : null, r.status, isoDate(r.reviewDate), isoDate(r.createdAt), isoDate(r.updatedAt)]);
        return csvFile("risk-register", header, lines, truncated);
      }
      const header = ["Line ID", "Project reference", "Description", "Catalogue product", "Quantity", "Category", "Weight (kg)", "Country of manufacture", "Destination country", "Manufacturer", "Supplier", "Client PO", "Internal PO", "Internal PO placed", "Client PO received", "Goods manufactured", "Required delivery (GAD)", "Supplier GAD", "Warehouse reference", "Collected", "Delivered to client", "Archived"];
      for (;;) {
        const rows = await tx.projectLine.findMany({
          where: { organizationId: user.organizationId, ...(includeArchived ? {} : { archivedAt: null }) },
          include: { project: { select: { referenceNumber: true } }, productMaster: { select: { name: true } }, manufacturer: { select: { name: true } }, supplier: { select: { name: true } } },
          take: EXPORT_PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" },
        });
        if (rows.length === 0) break;
        for (const r of rows) {
          if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
          lines.push(csvRow([r.id, r.project.referenceNumber, r.clientProductDescription, r.productMaster?.name, r.quantity, r.productCategory, r.weightKg?.toString(), r.countryOfManufactureCode, r.destinationCountryCode, r.manufacturer?.name, r.supplier?.name, r.clientPoNumber, r.internalPoNumber, isoDate(r.internalPoDatePlaced), isoDate(r.clientPoReceiptDate), isoDate(r.goodsManufacturedDate), isoDate(r.gad), isoDate(r.supplierGad), r.warehouseReferenceNumber, isoDate(r.goodsCollectedDate), isoDate(r.goodsDeliveredToClientDate), r.archivedAt ? "Yes" : "No"]));
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
