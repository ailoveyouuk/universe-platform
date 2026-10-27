import type { CrmPortfolio } from "@universe/types";

export const PORTFOLIO_COLUMNS: { key: keyof Omit<CrmPortfolio, "total" | "identified">; label: string; short: string }[] = [
  { key: "inProgress", label: "In progress", short: "In progress" },
  { key: "submitted", label: "Submitted", short: "Submitted" },
  { key: "awarded", label: "Awarded, under way", short: "Awarded" },
  { key: "completed", label: "Completed", short: "Completed" },
  { key: "unawarded", label: "Unawarded or declined", short: "Unawarded" },
];

/** A stakeholder's projects with this organisation by outcome. Cancelled projects are not counted. */
export function PortfolioStrip({ p }: { p: CrmPortfolio }) {
  return (
    <ul aria-label="Projects with this stakeholder by outcome" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
      {PORTFOLIO_COLUMNS.map((c) => (
        <li key={c.key} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--u-font-display)" }}>{p[c.key]}</div>
          <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{c.label}</div>
        </li>
      ))}
    </ul>
  );
}
