import type { Prisma } from "@prisma/client";
import { diffForAudit } from "../common/audit-log";
import type { ProductRecordCompleteness } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";

/**
 * Helpers for the shared product record (added 2026-10-18, Product Database completion).
 * ProductMaster is shared (no organizationId), so FieldChangeLog (tenant-scoped) cannot hold platform-staff edits;
 * every applied change is instead written to ProductMasterChange and bumps ProductMaster.version.
 */

/** Every field a change set may touch — also the audit field list. */
export const PRODUCT_RECORD_FIELDS = [
  "name",
  "category",
  "hsCode",
  "unspscCode",
  "gtin",
  "standardUnit",
  "canonicalManufacturerPartNumber",
  "expectedQualityDocumentation",
  "isArchived",
  "lifecycleStatus",
  "lifecycleReason",
  "storageClass",
  "coldChain",
  "shelfLifeMonths",
  "hazardClass",
  "controlledSubstance",
  "inn",
  "strength",
  "dosageForm",
  "brand",
  "packSize",
  "regulatoryClass",
  "intendedUse",
  "nextReviewDue",
] as const;

type Dict = Record<string, unknown>;

/** Turns an incoming change set (DTO or stored amendment JSON) into Prisma `data`: empty strings clear text fields,
 * nextReviewDue becomes a Date, and a lifecycle change stamps lifecycleChangedAt. Unknown keys are dropped. */
export function toProductData(input: object): Prisma.ProductMasterUncheckedUpdateInput {
  const src = input as Dict;
  const out: Dict = {};
  for (const f of PRODUCT_RECORD_FIELDS) {
    const v = src[f];
    if (v === undefined) continue;
    if (f === "nextReviewDue") out[f] = v === "" || v === null ? null : new Date(String(v));
    else if (typeof v === "string" && v.trim() === "" && f !== "name" && f !== "category") out[f] = null;
    else out[f] = v;
  }
  if (out.lifecycleStatus !== undefined) out.lifecycleChangedAt = new Date();
  return out as Prisma.ProductMasterUncheckedUpdateInput;
}

/** Audit diff over the record fields, comparing the incoming change set (after normalisation) with the stored row. */
export function diffProductRecord(before: object, input: object) {
  const data = toProductData(input) as Dict;
  return diffForAudit(before, data, PRODUCT_RECORD_FIELDS);
}

export interface ChangeWriteOptions {
  productMasterId: string;
  version: number;
  changes: { field: string; oldValue: string | null; newValue: string | null }[];
  source: "CREATE" | "STAFF_EDIT" | "AMENDMENT_RATIFIED" | "IMPORT" | "SYSTEM";
  user: Pick<RequestUser, "id" | "forename" | "surname" | "organizationId" | "organizationName">;
  reason?: string | null;
  amendmentId?: string | null;
}

export async function writeProductChanges(tx: Prisma.TransactionClient, o: ChangeWriteOptions): Promise<void> {
  if (o.changes.length === 0) return;
  await tx.productMasterChange.createMany({
    data: o.changes.map((c) => ({
      productMasterId: o.productMasterId,
      version: o.version,
      fieldName: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      source: o.source,
      reason: o.reason ?? null,
      amendmentId: o.amendmentId ?? null,
      changedById: o.user.id,
      changedByName: `${o.user.forename} ${o.user.surname}`.trim(),
      changedByOrganizationId: o.user.organizationId,
      changedByOrganizationName: o.user.organizationName,
    })),
  });
}

/**
 * Applies a change set to the shared record inside the given transaction: updates the row, bumps `version` once for the
 * whole set and writes one ProductMasterChange per changed field. Returns the number of changed fields (0 = no-op, no
 * version bump).
 */
export async function applyProductChangeSet(
  tx: Prisma.TransactionClient,
  productMasterId: string,
  input: object,
  opts: { source: ChangeWriteOptions["source"]; user: ChangeWriteOptions["user"]; reason?: string | null; amendmentId?: string | null },
): Promise<number> {
  const before = await tx.productMaster.findUnique({ where: { id: productMasterId } });
  if (!before) return 0;
  const changes = diffProductRecord(before, input);
  if (changes.length === 0) return 0;
  const version = before.version + 1;
  await tx.productMaster.update({ where: { id: productMasterId }, data: { ...toProductData(input), version } });
  await writeProductChanges(tx, { productMasterId, version, changes, ...opts });
  return changes.length;
}

interface CompletenessRow {
  hsCode: string | null;
  unspscCode: string | null;
  gtin: string | null;
  standardUnit: string | null;
  canonicalManufacturerPartNumber: string | null;
  expectedQualityDocumentation: string | null;
  storageClass: string | null;
  shelfLifeMonths: number | null;
  regulatoryClass: string | null;
  intendedUse: string | null;
  packSize: string | null;
  brand: string | null;
  inn: string | null;
  strength: string | null;
  dosageForm: string | null;
  category: string;
}

const MEDICINE_CATEGORY = /pharma|medicine|vaccine|drug/i;

/** Share of applicable record fields filled. INN, strength and dosage form only count for medicine categories; storage
 * class counts for every product (ambient is a valid answer). Regulatory registrations will join the score in step 2. */
export function computeCompleteness(row: CompletenessRow): ProductRecordCompleteness {
  const fields: [string, unknown][] = [
    ["HS code", row.hsCode],
    ["UNSPSC code", row.unspscCode],
    ["GTIN", row.gtin],
    ["Standard unit", row.standardUnit],
    ["Manufacturer part number", row.canonicalManufacturerPartNumber],
    ["Expected quality documentation", row.expectedQualityDocumentation],
    ["Storage class", row.storageClass],
    ["Shelf life", row.shelfLifeMonths],
    ["Regulatory class", row.regulatoryClass],
    ["Intended use", row.intendedUse],
    ["Pack size", row.packSize],
    ["Brand", row.brand],
  ];
  if (MEDICINE_CATEGORY.test(row.category)) {
    fields.push(["INN", row.inn], ["Strength", row.strength], ["Dosage form", row.dosageForm]);
  }
  const missing = fields.filter(([, v]) => v === null || v === undefined || v === "").map(([n]) => n);
  const total = fields.length;
  const filled = total - missing.length;
  return { score: Math.round((filled / total) * 100), filled, total, missing };
}
