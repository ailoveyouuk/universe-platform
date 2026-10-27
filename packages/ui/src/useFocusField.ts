"use client";

import { useEffect } from "react";

/**
 * "Make this richer" fix links land on the exact input (2026-10-27): `?focus=<field>` scrolls the element carrying `data-field="<field>"` into view and focuses the first
 * input inside it. Pass `ready` once the form has rendered (after its record has loaded). Does nothing when there is no `focus` or no such field.
 */
export function useFocusField(ready = true): void {
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const f = new URLSearchParams(window.location.search).get("focus");
    if (!f) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${f.replace(/"/g, "")}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      const target = el.matches("input,textarea,select,button") ? el : el.querySelector<HTMLElement>("input,textarea,select,button");
      target?.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(t);
  }, [ready]);
}
