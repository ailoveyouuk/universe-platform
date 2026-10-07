import type { Prisma } from "@prisma/client";

/**
 * Gap 1 (compliance-standards-gap-analysis.md) — the shared helper every
 * service uses to write FieldChangeLog rows. See that model's doc comment
 * in schema.prisma for the full rationale (ALCOA+/21 CFR Part 11/Annex 11/
 * MHRA GxP Data Integrity Guidance all require a retained, attributable,
 * timestamped previous value for a changed field — a bare `updatedAt`
 * column satisfies none of that).
 *
 * Usage pattern, inside an existing withTenantContext(...) transaction:
 *
 *   const changes = diffForAudit(existing, dto, ["name", "riskTier", ...]);
 *   const updated = await tx.partner.update({ where: { id }, data: {...} });
 *   await recordFieldChanges(tx, {
 *     organizationId: user.organizationId,
 *     tableName: "partners",
 *     recordId: id,
 *     changedById: user.id,
 *     changes,
 *   });
 *
 * Deliberately a plain function, not a Prisma middleware/extension — a
 * middleware would see every query including ones that shouldn't be
 * audited (reads, internal bookkeeping writes) and can't easily get at the
 * "before" snapshot without an extra query of its own. An explicit call at
 * each service's own update() method is more code, but it's auditable by
 * reading the service itself, which matters for something a compliance
 * review will actually read.
 */

export interface FieldChangeInput {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Normalizes a field value for storage/comparison — Dates to ISO strings,
 * Prisma.Decimal/numbers/booleans to their own string form via
 * `String(value)`, null/undefined both treated as "no value" (so an
 * already-null field diffed against another null is correctly seen as
 * unchanged, not a false "changed from null to null").
 */
function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Compares a `before` snapshot (the row as read from the database) against
 * an `after` snapshot (typically the raw DTO) across exactly the field
 * names given, and returns only the fields that actually changed.
 *
 * `fields` must be the DTO's own optional-field list, NOT
 * `Object.keys(after)` — a PATCH-style DTO leaves untouched fields as
 * `undefined`, which must be skipped entirely (not misread as "the caller
 * explicitly cleared this field to null", which is what an explicit `null`
 * means). This mirrors the same `dto.field !== undefined` convention
 * already used throughout projects.service.ts/partners.service.ts for
 * building the Prisma `data` object itself.
 */
export function diffForAudit(
  before: object,
  after: object,
  fields: readonly string[],
): FieldChangeInput[] {
  // Callers pass real objects here (DTO class instances, Prisma row
  // results) that have no index signature of their own, so TS won't let
  // the parameters be typed as Record<string, unknown> directly without
  // forcing every call site to cast. Widening the parameter types to
  // `object` and casting once, internally, keeps every call site plain.
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const changes: FieldChangeInput[] = [];
  for (const field of fields) {
    if (afterRecord[field] === undefined) continue;
    const oldNorm = normalize(beforeRecord[field]);
    const newNorm = normalize(afterRecord[field]);
    if (oldNorm !== newNorm) {
      changes.push({ field, oldValue: oldNorm, newValue: newNorm });
    }
  }
  return changes;
}

export interface RecordFieldChangesOptions {
  organizationId: string;
  tableName: string;
  recordId: string;
  changedById: string | null;
  changes: FieldChangeInput[];
  reason?: string | null;
  /** UI | API | MIGRATION | SYSTEM — defaults to "API", the only path
   * wired in so far. */
  source?: string;
  /** Gap 2 — the exact certification/"e-signature meaning" statement text
   * shown to the signer for this action, when this change represents an
   * approval/verification rather than an ordinary field edit. See
   * certification-statements.ts. */
  certificationStatement?: string | null;
}

/**
 * Writes one FieldChangeLog row per changed field. A no-op when `changes`
 * is empty, so callers can always call this unconditionally right after a
 * diff rather than branching on "did anything actually change". Must be
 * called with the SAME transaction (`tx`) as the write it's auditing, so
 * the log entry and the change it describes commit or roll back together
 * — a logged-but-not-applied or applied-but-not-logged state is never
 * possible.
 */
export async function recordFieldChanges(
  tx: Prisma.TransactionClient,
  opts: RecordFieldChangesOptions,
): Promise<void> {
  if (opts.changes.length === 0) return;
  await tx.fieldChangeLog.createMany({
    data: opts.changes.map((c) => ({
      organizationId: opts.organizationId,
      tableName: opts.tableName,
      recordId: opts.recordId,
      fieldName: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      changedById: opts.changedById,
      reason: opts.reason ?? null,
      source: opts.source ?? "API",
      certificationStatement: opts.certificationStatement ?? null,
    })),
  });
}
