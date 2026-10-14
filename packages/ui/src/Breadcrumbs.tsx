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
  // `overflowX: "auto"`/`whiteSpace: "nowrap"` added 2026-10-14 (mobile
  // pass) — without them, a long crumb (e.g. "Logistics & CO2") would
  // wrap mid-phrase onto a second line once this nav's flex parent
  // shrank it below the crumb's natural width (every flex item's default
  // min-width is its content size, but text itself can still break at a
  // word boundary inside that shrunk box), which is exactly the clipped/
  // overlapping breadcrumb Lewis flagged from a live phone screenshot.
  // Scrolling horizontally instead keeps every crumb on one line and
  // never overlaps the header's search/bell/avatar icons, which the
  // AppShell header gives `flexShrink: 0` so they're never the side that
  // gives way. `scrollbarWidth`/`::-webkit-scrollbar` keep the scrollbar
  // itself invisible — this is meant to read as "truncated, swipe to see
  // more" rather than as an obviously scrollable widget.
  return (
    <nav
      aria-label="Breadcrumb"
      className="u-breadcrumbs-scroll"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "var(--u-ink-secondary)",
        fontFamily: "var(--u-font-sans)",
        overflowX: "auto",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
