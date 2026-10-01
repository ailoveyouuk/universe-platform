"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

/**
 * The standardized interactive-text style for the whole platform — added
 * 2026-10-01 per Lewis's instruction to stop every clickable reference
 * (project reference numbers, partner website URLs, etc.) from rendering
 * as the browser's default blue-underline link, and instead read as one
 * consistent Universe style: brand-violet text, no underline at rest, a
 * thin accent-magenta underline that fades in on hover/focus — "a subtle
 * indication a user can interact with it" without the dated underline-by-
 * default look. Works for both a plain <a> (external, `href`) and as the
 * visual style inside a Next <Link> (pass no `href` and wrap this in
 * <Link>, same pattern Breadcrumbs.tsx uses with LinkComponent).
 */
export function TextLink({
  children,
  as: As = "a",
  weight = 600,
  style,
  ...rest
}: {
  children: ReactNode;
  as?: any;
  weight?: number;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [hover, setHover] = useState(false);
  return (
    <As
      {...rest}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color: "var(--u-brand-violet)",
        fontWeight: weight,
        textDecoration: "none",
        backgroundImage: "linear-gradient(var(--u-accent-magenta), var(--u-accent-magenta))",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 100%",
        backgroundSize: hover ? "100% 1.5px" : "0% 1.5px",
        transition: "background-size 150ms ease, color 150ms ease",
        paddingBottom: 1,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </As>
  );
}
