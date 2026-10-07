"use client";

import { CERTIFICATION_STATEMENTS, type CertificationStatementKey } from "@universe/types";

/**
 * Gap 2 (compliance-standards-gap-analysis.md) — the missing half of the
 * e-signature "meaning" requirement. The backend has captured the exact
 * certification-statement text on the resulting audit-trail row since
 * the first pass of this build, but nothing in the UI ever showed the
 * signer that text before they clicked — a technically-attributable
 * click (verifiedById) isn't the same as a true Part 11/Annex 11
 * electronic signature, which has to show the signer what they're
 * certifying. This renders that exact text, always visible (not a
 * tooltip or a collapsed disclosure) immediately next to the control it
 * belongs to.
 */
export function CertificationNotice({ statement }: { statement: CertificationStatementKey }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontStyle: "italic",
        color: "var(--u-ink-secondary)",
        marginTop: 6,
        maxWidth: 480,
      }}
    >
      {CERTIFICATION_STATEMENTS[statement]}
    </div>
  );
}
