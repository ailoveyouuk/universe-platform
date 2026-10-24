import type { ReactNode } from "react";

/**
 * Small rounded pill — for quick-stat labels, counts, and filter chips on
 * the dashboard and list pages. Distinct from StatusBadge (Badge.tsx),
 * which is specifically for Project.status and keeps its own fixed colour
 * map — Pill is generic and tokens-driven for everything else.
 */
export function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "accent" | "good" | "warning" | "critical";
  icon?: ReactNode;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "var(--u-surface-alt)", fg: "var(--u-ink-secondary)" },
    brand: { bg: "var(--u-accent-magenta-tint)", fg: "var(--u-brand-violet)" },
    accent: { bg: "var(--u-accent-magenta-tint)", fg: "var(--u-accent-magenta)" },
    good: { bg: "var(--u-status-good-tint)", fg: "var(--u-status-good-text)" },
    warning: { bg: "var(--u-status-warning-tint)", fg: "var(--u-status-warning-text)" },
    critical: { bg: "var(--u-status-critical-tint)", fg: "var(--u-status-critical-text)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 11px",
        borderRadius: "var(--u-radius-pill)",
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: t.bg,
        color: t.fg,
        lineHeight: 1.6,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
