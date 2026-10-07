/**
 * Gap 2 (compliance-standards-gap-analysis.md) — versioned "e-signature
 * meaning" statements. FDA 21 CFR Part 11 / EU GMP Annex 11 both require
 * that an approval/verification action make clear to the signer WHAT
 * they're certifying, not just capture an attributable, timestamped
 * click. Each constant below is shown in the UI immediately next to the
 * approval control it names, and its exact text is captured verbatim on
 * the resulting FieldChangeLog/PartnerApprovalHistory row (via
 * `certificationStatement`) — not just a version number — so the record
 * stays self-contained even if the wording here is edited later.
 *
 * Moved into @universe/types 2026-10-07/08 (follow-up frontend pass) so
 * the frontend can display the exact statement text next to the control
 * it belongs to, instead of just having the backend capture it blind.
 * This file now simply re-exports from there — single source of truth,
 * no duplicated wording to drift out of sync.
 *
 * Append-only by convention: when a statement's wording genuinely needs
 * to change, add a new `_V2` constant rather than editing one of these in
 * place, so a past signature's captured text always matches a version
 * that existed at the time it was signed.
 */
export { CERTIFICATION_STATEMENTS } from "@universe/types";
export type { CertificationStatementKey } from "@universe/types";
