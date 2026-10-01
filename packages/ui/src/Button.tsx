import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Shared button — three variants built on Design System tokens. Replaces
 * the ad-hoc inline button styles that had accumulated per-app (see
 * AppShell.tsx's old defaultButtonStyle, and the raw <button style={...}>
 * elements across the project-detail screens, replaced 2026-10-01).
 * `accent` lets a caller tint the primary variant with the signed-in
 * organization's own primaryColor (see OrgTheme.tsx) for the "subtle
 * per-org colour" effect without hard-coding Universe's own brand-violet
 * everywhere a primary action appears. `size="sm"` is for dense contexts
 * (inline row actions, the Supplier Enquiries mini-form) that previously
 * hand-rolled small font-size/padding buttons.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  icon?: ReactNode;
  accent?: string | null;
}

export function Button({ variant = "secondary", size = "md", icon, accent, style, children, ...rest }: ButtonProps) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: size === "sm" ? 6 : 8,
    padding: size === "sm" ? "5px 11px" : "9px 16px",
    fontFamily: "var(--u-font-sans)",
    fontSize: size === "sm" ? 12.5 : 14,
    fontWeight: 600,
    borderRadius: "var(--u-radius-md)",
    cursor: "pointer",
    transition: "background-color 150ms ease, border-color 150ms ease, transform 100ms ease, opacity 150ms ease",
    border: "1px solid transparent",
  } as const;

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: accent ?? "var(--u-brand-violet)",
      color: "var(--u-brand-violet-on)",
    },
    secondary: {
      backgroundColor: "var(--u-surface)",
      color: "var(--u-ink)",
      borderColor: "var(--u-border)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--u-ink-secondary)",
    },
    danger: {
      backgroundColor: "transparent",
      color: "var(--u-status-critical)",
    },
  };

  return (
    <button
      {...rest}
      style={{ ...base, ...variants[variant], ...(rest.disabled ? { opacity: 0.55, cursor: "default" } : null), ...style }}
      onMouseDown={(e) => {
        if (!rest.disabled) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {icon}
      {children}
    </button>
  );
}
