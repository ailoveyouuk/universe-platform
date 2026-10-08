"use client";

import type { ProjectStatusHistoryEntry } from "@universe/types";

const STAGE_LABELS: Record<string, string> = {
  IDENTIFIED: "Identification",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  AWARDED: "Awarded",
  COMPLETED: "Completed",
  UNAWARDED: "Unawarded",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

/** Same coarse, minutes-free duration formatting as StageTracker's own
 * formatDuration (packages/ui/src/StageTracker.tsx) — kept as a small
 * local copy rather than exported from there, since StageTracker's own
 * copy is deliberately private to that file and this is the one other
 * place that needs the same "3 days" / "6 hours" phrasing. */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The full status-transition timeline for a project — "how long has this
 * project been in each stage", every visit, in order. Complements
 * StageTracker (packages/ui/src/StageTracker.tsx), which only shows the
 * CURRENT stage's chevron track plus a tooltip/caption for the latest and
 * cumulative time in the current status; this renders every entry in
 * project.statusHistory (already oldest-first, same array StageTracker
 * consumes — see ProjectsService.PROJECT_DETAIL_INCLUDE) as a simple
 * vertical list, with "time in stage" computed here, client-side, from
 * each entry's enteredAt against the NEXT entry's enteredAt (or now, for
 * the most recent entry) — never a stored duration field.
 */
export function StatusHistoryTimeline({ history }: { history: ProjectStatusHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink-secondary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        Status History
      </h3>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        {history.map((entry, i) => {
          const isLast = i === history.length - 1;
          const next = history[i + 1];
          const start = new Date(entry.enteredAt).getTime();
          const end = next ? new Date(next.enteredAt).getTime() : Date.now();
          const duration = formatDuration(end - start);
          return (
            <li
              key={`${entry.status}-${entry.enteredAt}-${i}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "6px 10px",
                borderRadius: "var(--u-radius-sm)",
                background: isLast ? "var(--u-surface-alt)" : "transparent",
                fontFamily: "var(--u-font-sans)",
                fontSize: 13,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--u-radius-pill)",
                  background: isLast ? "var(--u-accent-magenta)" : "var(--u-brand-violet)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, color: "var(--u-ink)", minWidth: 110 }}>{STAGE_LABELS[entry.status] ?? entry.status}</span>
              <span style={{ color: "var(--u-ink-secondary)" }}>{new Date(entry.enteredAt).toLocaleDateString()}</span>
              {entry.changedByName && <span style={{ color: "var(--u-ink-secondary)" }}>by {entry.changedByName}</span>}
              <span style={{ color: "var(--u-ink-secondary)", marginLeft: "auto" }}>
                {isLast ? "in this stage for " : "spent "}
                {duration}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
