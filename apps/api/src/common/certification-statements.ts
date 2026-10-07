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
 * Append-only by convention: when a statement's wording genuinely needs
 * to change, add a new `_V2` constant rather than editing one of these in
 * place, so a past signature's captured text always matches a version
 * that existed at the time it was signed.
 */
export const CERTIFICATION_STATEMENTS = {
  /** Shown next to the control that moves Partner.approvalStatus to
   * APPROVED (see PartnersService.update). */
  PARTNER_APPROVAL_V1:
    "By approving this stakeholder, I certify that I have reviewed the evidence on file, that it meets this organisation's qualification requirements, and that I am an authorised approver acting on this organisation's behalf.",
  /** Shown next to the control that marks a StakeholderEvidenceRecord (or,
   * today, a PartnerCertification/PartnerCompanyCheck) as verified. Not
   * yet wired to a UI control — the Standards & Evidence scaffolding
   * (sop-driven-quality-roadmap.md) that would give evidence verification
   * its own dedicated action is still planned, not built. Defined now so
   * that work has a statement ready to use rather than inventing one
   * later under time pressure. */
  EVIDENCE_VERIFICATION_V1:
    "By marking this evidence as verified, I certify that I have examined the supporting document/record myself and confirm it is genuine, current, and satisfies the standard it is being logged against.",
} as const;

export type CertificationStatementKey = keyof typeof CERTIFICATION_STATEMENTS;
