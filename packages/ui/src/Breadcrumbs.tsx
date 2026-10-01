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
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "var(--u-ink-secondary)",
        fontFamily: "var(--u-font-sans)",
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {item.href && !isLast ? (
              <Link href={item.href} style={{ color: "var(--u-ink-secondary)", textDecoration: "none" }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? "var(--u-ink)" : "var(--u-ink-secondary)", fontWeight: isLast ? 600 : 400 }}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRightIcon size={13} style={{ color: "var(--u-ink-secondary)", opacity: 0.6 }} />}
          </span>
        );
      })}
    </nav>
  );
}
