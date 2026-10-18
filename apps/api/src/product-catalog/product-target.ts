import { NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { Prisma } from "@prisma/client";
import type { RequestUser } from "../auth/entra-auth.guard";
import { writeProductChanges } from "./product-record";

/**
 * Registrations and controlled documents attach either to a variant (a ProductMaster row) or to a product family, in which
 * case they apply to every variant of the family (Product Database step 3b, 2026-10-18). This helper resolves which, checks
 * visibility (simulated records only show inside the demo organisation), and gives the matching query filter and audit
 * writer so both services handle the two cases identically.
 */
export type Target = { kind: "product"; id: string } | { kind: "family"; id: string };
export const productTarget = (id: string): Target => ({ kind: "product", id });
export const familyTarget = (id: string): Target => ({ kind: "family", id });

export interface ResolvedTarget {
  kind: "product" | "family";
  id: string;
  /** For a product: its family (if any). For a family: its own id. */
  familyId: string | null;
  name: string;
  version: number;
}

export async function resolveTarget(target: Target, showSimulated: boolean): Promise<ResolvedTarget> {
  if (target.kind === "product") {
    const p = await prisma.productMaster.findUnique({ where: { id: target.id }, select: { id: true, name: true, isSimulated: true, version: true, productFamilyId: true } });
    if (!p || (p.isSimulated && !showSimulated)) throw new NotFoundException("Product not found.");
    return { kind: "product", id: p.id, familyId: p.productFamilyId, name: p.name, version: p.version };
  }
  const f = await prisma.productFamily.findUnique({ where: { id: target.id }, select: { id: true, name: true, isSimulated: true, version: true } });
  if (!f || (f.isSimulated && !showSimulated)) throw new NotFoundException("Product family not found.");
  return { kind: "family", id: f.id, familyId: f.id, name: f.name, version: f.version };
}

/** Query filter matching everything that applies to the target: a variant sees its own and its family's. */
export function ownerFilter(rt: ResolvedTarget): { OR: { productMasterId?: string; productFamilyId?: string }[] } {
  if (rt.kind === "family") return { OR: [{ productFamilyId: rt.id }] };
  return rt.familyId ? { OR: [{ productMasterId: rt.id }, { productFamilyId: rt.familyId }] } : { OR: [{ productMasterId: rt.id }] };
}

/** Fields to store when creating a record owned by the target. */
export function ownerData(rt: ResolvedTarget): { productMasterId: string | null; productFamilyId: string | null } {
  return rt.kind === "family" ? { productMasterId: null, productFamilyId: rt.id } : { productMasterId: rt.id, productFamilyId: null };
}

type ChangeUser = Pick<RequestUser, "id" | "forename" | "surname" | "organizationId" | "organizationName">;

/** Writes audit rows to the variant's or the family's shared change history. */
export async function writeTargetChanges(
  tx: Prisma.TransactionClient,
  owner: { productMasterId: string | null; productFamilyId: string | null },
  info: { version: number; changes: { field: string; oldValue: string | null; newValue: string | null }[]; source: "REGISTRATION" | "SYSTEM" | "STAFF_EDIT" | "CREATE"; user: ChangeUser },
): Promise<void> {
  if (info.changes.length === 0) return;
  if (owner.productMasterId) {
    await writeProductChanges(tx, { productMasterId: owner.productMasterId, version: info.version, changes: info.changes, source: info.source, user: info.user });
    return;
  }
  if (!owner.productFamilyId) return;
  await tx.productFamilyChange.createMany({
    data: info.changes.map((c) => ({
      productFamilyId: owner.productFamilyId as string,
      fieldName: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      source: info.source,
      changedById: info.user.id,
      changedByName: `${info.user.forename} ${info.user.surname}`.trim(),
      changedByOrganizationId: info.user.organizationId,
      changedByOrganizationName: info.user.organizationName,
    })),
  });
}
