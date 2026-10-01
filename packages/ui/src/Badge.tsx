import type { ReactNode } from "react";

/**
 * Shared status badge — used identically across every Universe app so a
 * project's status reads the same whether you're in Project Management,
 * the Tender app, or the Admin dashboard.
 *
 * Colours remapped 2026-10-01 (Lewis flagged the originals as arbitrary,
 * not from the Design System) onto the actual brand tokens from
 * universe-brand-identity.md / tokens.css:
 *   IDENTIFIED  — ink-secondary (neutral; nothing's actually happened yet)
 *   IN_PROGRESS — brand-violet (the platform's own "in motion" colour)
 *   SUBMITTED   — accent-magenta (a distinct milestone, the brand's accent)
 *   AWARDED     — status-good
 *   COMPLETED   — status-good (same meaning — "good outcome" — at a
 *                 slightly deeper shade so Awarded vs Completed stay
 *                 visually distinguishable at a glance)
 *   UNAWARDED   — status-serious (lost, but not an error state)
 *   DECLINED    — status-serious
 *   CANCELLED   — ink-secondary (same family as Identified — a dead/
 *                 inactive state, not a failure)
 * REMOVED (Partner.approvalStatus, not a Project status) uses the same
 * ink-secondary treatment via Pill's "neutral" tone — see partners/page.tsx.
 */
const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: "var(--u-ink-secondary)",
  IN_PROGRESS: "var(--u-brand-violet)",
  SUBMITTED: "var(--u-accent-magenta)",
  AWARDED: "var(--u-status-good)",
  COMPLETED: "#0a8a0a",
  UNAWARDED: "var(--u-status-serious)",
  DECLINED: "var(--u-status-serious)",
  CANCELLED: "var(--u-ink-secondary)",
};

export function StatusBadge({ status }: { status: string }): ReactNode {
  const color = STATUS_COLORS[status] ?? "var(--u-ink-secondary)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "var(--u-radius-pill)",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--u-font-sans)",
        color: "#fff",
        backgroundColor: color,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
