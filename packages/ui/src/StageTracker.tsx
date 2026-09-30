import type { ReactNode } from "react";

/**
 * The project lifecycle stage tracker — see project-stage-navigation-plan.md
 * for the full research and rationale. A horizontal chevron/stepper for the
 * five ACTIVE_STAGES; the three TERMINAL_STAGES replace it entirely with a
 * status banner rather than appearing as a sixth/seventh/eighth chevron
 * (per USWDS step-indicator guidance: a linear stepper shouldn't represent
 * conditional/non-linear exits — see procurement-lifecycle-benchmarking.md
 * "Our freight/logistics granularity and terminal-exit structure are
 * differentiators, not gaps").
 *
 * First real application of the Universe Design System's tokens anywhere in
 * the UI — see universe-brand-identity.md and tokens.css, loaded once in
 * each app's root layout. Deliberately contained to this one component for
 * this pass, not an app-wide restyle.
 */

export const ACTIVE_STAGES = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED", "AWARDED", "COMPLETED"] as const;
export const TERMINAL_STAGES = ["UNAWARDED", "DECLINED", "CANCELLED"] as const;

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

export interface StageHistoryEntry {
  status: string;
  enteredAt: string;
  changedByName: string | null;
}

/** Formats a millisecond duration as a short, human sentence fragment — "3
 * days", "6 hours", "less than an hour". Intentionally coarse (no minutes)
 * since this is a procurement lifecycle, not a live countdown. */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** The "latest time in stage" for a given status — the gap between the most
 * recent entry into that status and either the next history row after it
 * (the project moved on) or now (still in that stage). Mirrors HubSpot's
 * documented "Latest Time in Stage" calculated property — see
 * procurement-lifecycle-benchmarking.md rec. #7. */
function latestTimeInStage(history: StageHistoryEntry[], status: string): { enteredAt: Date; ms: number } | null {
  let lastIndex = -1;
  for (let i = 0; i < history.length; i++) {
    if (history[i].status === status) lastIndex = i;
  }
  if (lastIndex === -1) return null;
  const enteredAt = new Date(history[lastIndex].enteredAt);
  const next = history[lastIndex + 1];
  const end = next ? new Date(next.enteredAt).getTime() : Date.now();
  return { enteredAt, ms: end - enteredAt.getTime() };
}

/** "Cumulative time in stage" — summed across every visit, for a status a
 * project may have re-entered (e.g. SUBMITTED -> IN_PROGRESS -> SUBMITTED
 * again). Also per HubSpot's documented pattern, rec. #7. */
function cumulativeTimeInStage(history: StageHistoryEntry[], status: string): number {
  let total = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].status !== status) continue;
    const start = new Date(history[i].enteredAt).getTime();
    const next = history[i + 1];
    const end = next ? new Date(next.enteredAt).getTime() : Date.now();
    total += end - start;
  }
  return total;
}

function StageChevron({
  label,
  state,
  tooltip,
}: {
  label: string;
  state: "done" | "current" | "future";
  tooltip?: string;
}): ReactNode {
  const background = state === "done" ? "var(--u-brand-violet)" : state === "current" ? "var(--u-accent-magenta)" : "var(--u-surface-alt)";
  const color = state === "future" ? "var(--u-ink-secondary)" : "var(--u-brand-violet-on)";
  const border = state === "future" ? "1px solid var(--u-border)" : "none";

  return (
    <div
      title={tooltip}
      aria-current={state === "current" ? "step" : undefined}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 4px",
        background,
        color,
        border,
        fontFamily: "var(--u-font-sans)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        position: "relative",
        minWidth: 0,
      }}
    >
      {state === "done" && (
        <span aria-hidden="true" style={{ fontSize: 12 }}>
          ✓
        </span>
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

/** The terminal-exit banner — replaces the chevron track entirely when
 * status is one of TERMINAL_STAGES. See this file's top comment. */
function TerminalBanner({ status, reason, enteredAt }: { status: string; reason: string | null; enteredAt: string | null }): ReactNode {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--u-radius-md)",
        background: "var(--u-surface-alt)",
        border: "1px solid var(--u-border)",
        fontFamily: "var(--u-font-sans)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: "var(--u-radius-pill)",
          background: "var(--u-status-critical)",
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--u-ink)" }}>
          {STAGE_LABELS[status] ?? status}
          {enteredAt && (
            <span style={{ fontWeight: 400, color: "var(--u-ink-secondary)", marginLeft: 8, fontSize: 12 }}>
              {new Date(enteredAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {reason && <div style={{ fontSize: 13, color: "var(--u-ink-secondary)", marginTop: 2 }}>{reason}</div>}
      </div>
    </div>
  );
}

export function StageTracker({
  status,
  statusHistory,
  reasonForCancellation,
}: {
  status: string;
  statusHistory: StageHistoryEntry[];
  /** Shown in the terminal banner for CANCELLED today (the only terminal
   * status with a reason field — see project-stage-navigation-plan.md "Open
   * questions": a reasonForNonAward field for UNAWARDED/DECLINED is a
   * follow-up, not built yet). */
  reasonForCancellation?: string | null;
}): ReactNode {
  if ((TERMINAL_STAGES as readonly string[]).includes(status)) {
    const entry = [...statusHistory].reverse().find((h) => h.status === status);
    return <TerminalBanner status={status} reason={status === "CANCELLED" ? reasonForCancellation ?? null : null} enteredAt={entry?.enteredAt ?? null} />;
  }

  const currentIndex = ACTIVE_STAGES.indexOf(status as (typeof ACTIVE_STAGES)[number]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          borderRadius: "var(--u-radius-md)",
          overflow: "hidden",
          boxShadow: "var(--u-shadow-card)",
        }}
      >
        {ACTIVE_STAGES.map((stage, i) => {
          const state: "done" | "current" | "future" = i < currentIndex ? "done" : i === currentIndex ? "current" : "future";
          const latest = latestTimeInStage(statusHistory, stage);
          const cumulative = cumulativeTimeInStage(statusHistory, stage);
          const tooltip =
            state === "future"
              ? undefined
              : latest
                ? `Entered ${latest.enteredAt.toLocaleDateString()} — ${state === "current" ? "in this stage for" : "spent"} ${formatDuration(cumulative)}`
                : undefined;
          return <StageChevron key={stage} label={STAGE_LABELS[stage]} state={state} tooltip={tooltip} />;
        })}
      </div>
      {currentIndex >= 0 &&
        (() => {
          const latest = latestTimeInStage(statusHistory, status);
          if (!latest) return null;
          return (
            <p
              style={{
                margin: "6px 2px 0",
                fontSize: 12,
                color: "var(--u-ink-secondary)",
                fontFamily: "var(--u-font-sans)",
              }}
            >
              In this stage for {formatDuration(latest.ms)}
            </p>
          );
        })()}
    </div>
  );
}
