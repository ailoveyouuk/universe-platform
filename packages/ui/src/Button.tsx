import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Shared button — three variants built on Design System tokens. Replaces
 * the ad-hoc inline button styles that had accumulated per-app (see
 * AppShell.tsx's old defaultButtonStyle). `accent` lets a caller tint the
 * primary variant with the signed-in organization's own primaryColor (see
 * OrgTheme.tsx) for the "subtle per-org colour" effect without hard-coding
 * Universe's own brand-violet everywhere a primary action appears.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
  accent?: string | null;
}

export function Button({ variant = "secondary", icon, accent, style, children, ...rest }: ButtonProps) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 16px",
    fontFamily: "var(--u-font-sans)",
    fontSize: 14,
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
  };

  return (
    <button
      {...rest}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)";
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
