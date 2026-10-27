import type { DataGap } from "@universe/types";

/**
 * A quiet "make this richer" note (2026-10-27, Lewis): wherever a screen is fed less than it could be, say what is missing, what filling it in would improve and
 * link straight to the fix. Collapsed by default so it never crowds the page; disappears when nothing is missing. Wording stays in normal ink (no status colours as text).
 */
export function DataHints({ gaps, title = "Make this richer", source, open }: { gaps: DataGap[] | null | undefined; title?: string; source?: string; open?: boolean }) {
  if (!gaps || gaps.length === 0) return null;
  return (
    <details open={open} style={{ border: "1px dashed var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "6px 12px", fontSize: 13, backgroundColor: "var(--u-surface-subtle)" }}>
      <summary style={{ cursor: "pointer", color: "var(--u-ink-secondary)" }}>
        <span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--u-signal-amber)", marginRight: 8 }} />
        {title}: {gaps.length} way{gaps.length === 1 ? "" : "s"} to improve this
      </summary>
      <ul style={{ listStyle: "none", margin: "8px 0 4px", padding: 0, display: "grid", gap: 10 }}>
        {gaps.map((g) => (
          <li key={g.key} style={{ display: "grid", gap: 2 }}>
            <span><strong>{g.label}</strong>{g.total > 1 ? ` (${g.count} of ${g.total})` : ""}</span>
            <span style={{ color: "var(--u-ink-secondary)" }}>{g.benefit}</span>
            {g.href && <a href={g.href} style={{ justifySelf: "start", color: "var(--u-link)" }}>{g.fixLabel ?? "Fix this"}</a>}
          </li>
        ))}
      </ul>
      {source && <p style={{ margin: "6px 0 2px", fontSize: 12, color: "var(--u-ink-secondary)" }}>Source: {source}</p>}
    </details>
  );
}
