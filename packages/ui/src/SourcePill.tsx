import type { ReactNode } from "react";

type Tone = "brand" | "accent" | "good" | "warning" | "critical" | "neutral";

const TONES: Record<Tone, { bg: string; fg: string; ring: string }> = {
  brand: { bg: "var(--u-accent-magenta-tint)", fg: "var(--u-brand-violet)", ring: "var(--u-brand-violet)" },
  accent: { bg: "var(--u-accent-magenta-tint)", fg: "var(--u-accent-magenta)", ring: "var(--u-accent-magenta)" },
  good: { bg: "rgba(12,163,12,0.12)", fg: "var(--u-status-good-text)", ring: "var(--u-status-good-text)" },
  warning: { bg: "rgba(250,178,25,0.16)", fg: "var(--u-status-warning-text)", ring: "var(--u-status-warning-text)" },
  critical: { bg: "rgba(208,59,59,0.12)", fg: "var(--u-status-critical-text)", ring: "var(--u-status-critical-text)" },
  neutral: { bg: "var(--u-surface-alt)", fg: "var(--u-ink-secondary)", ring: "var(--u-ink-secondary)" },
};

/**
 * Universe-branded pill for a data source or match state (EMA, MHRA, Verified, Suggested match…). Pass href to make it an external
 * link (opens in a new tab), onClick to make it a filter toggle (use `active`), or neither for a plain label. The caller gets the
 * label/tone from the shared helpers in @universe/types so every app shows the same wording.
 */
export function SourcePill({ label, tone = "neutral", title, href, onClick, active, icon }: {
  label: ReactNode; tone?: Tone; title?: string; href?: string; onClick?: () => void; active?: boolean; icon?: ReactNode;
}) {
  const t = TONES[tone];
  const style = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px 3px 9px", borderRadius: "var(--u-radius-pill)",
    fontSize: 12, fontWeight: 600, lineHeight: 1.6, textDecoration: "none", whiteSpace: "nowrap" as const,
    backgroundColor: active ? t.fg : t.bg, color: active ? "#fff" : t.fg, border: `1px solid ${active ? t.fg : "transparent"}`,
    cursor: href || onClick ? "pointer" : "default", fontFamily: "var(--u-font-sans)",
  };
  const dot = <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: active ? "#fff" : t.ring, flexShrink: 0 }} />;
  const inner = <>{icon ?? dot}{label}{href ? <span aria-hidden style={{ fontSize: 11 }}>↗</span> : null}</>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" title={title} style={style}>{inner}</a>;
  if (onClick) return <button type="button" onClick={onClick} title={title} aria-pressed={active} style={{ ...style, font: "inherit", fontSize: 12, fontWeight: 600 }}>{inner}</button>;
  return <span title={title} style={style}>{inner}</span>;
}
