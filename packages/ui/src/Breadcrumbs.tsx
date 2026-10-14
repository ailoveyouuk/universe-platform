import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail — "where am I in the hierarchy of pages" (distinct from
 * StageTracker, which is "how far along is THIS record" — see
 * project-stage-navigation-plan.md's own note on why those are different
 * metaphors and shouldn't be conflated). Each app builds its own Crumb[]
 * from its route; this component just renders it consistently.
 */
export function Breadcrumbs({ items, LinkComponent }: { items: Crumb[]; LinkComponent: any }) {
  const Link = LinkComponent;
  // 2026-10-14 (mobile pass, revised same day): the first fix here made
  // the breadcrumb trail scroll horizontally on overflow. Lewis asked for
  // the opposite instead — the header should grow taller to fit a longer
  // crumb trail on its own line(s), not hide part of it behind a scroll
  // gesture. So this wraps (`flexWrap: "wrap"`) rather than scrolling;
  // each crumb is still `whiteSpace: "nowrap"` internally so a single
  // crumb like "Logistics & CO2" wraps as a whole unit onto the next line
  // rather than breaking mid-phrase (the original clipping bug). The
  // AppShell header itself has no fixed height and already centres its
  // two flex children (`alignItems: "center"`), so once this nav grows
  // across two lines the header simply grows with it — no separate
  // "extend the header" code needed on that side.
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 6px",
        fontSize: 13,
        color: "var(--u-ink-secondary)",
        fontFamily: "var(--u-font-sans)",
        minWidth: 0,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            {item.href && !isLast ? (
              <Link href={item.href} style={{ color: "var(--u-ink-secondary)", textDecoration: "none", whiteSpace: "nowrap" }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? "var(--u-ink)" : "var(--u-ink-secondary)", fontWeight: isLast ? 600 : 400, whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRightIcon size={13} style={{ color: "var(--u-ink-secondary)", opacity: 0.6, flexShrink: 0 }} />}
          </span>
        );
      })}
    </nav>
  );
}
