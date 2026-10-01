"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * The platform's one custom dropdown — replaces every native <select> for
 * a filter/choice field. Added 2026-10-01 after Lewis flagged the native
 * OS listbox (all-caps-reading system font, square white popup, and on
 * Windows specifically a popup that can render over neighbouring controls
 * rather than respecting normal document flow) as out of step with the
 * rest of the design language, and as the actual cause of the Projects/
 * Stakeholders toolbar's search-field "bleeding" complaint — the native
 * popup isn't laid out by our CSS at all, so it can visually sit over
 * whatever's next to it. A component we position ourselves (absolute,
 * directly under its own trigger) can't do that.
 *
 * Same concertina open/close motion as AddMenu.tsx (max-height + opacity),
 * soft radius/shadow from the token set, and — per Lewis's "subtle opacity
 * of a colour from the organisation's brand palette instead of plain
 * white" instruction — the open panel's background is a faint tint of the
 * signed-in org's own accent colour (falling back to Universe's own
 * accent-magenta-tint when the org has no colour set), via color-mix with
 * a plain-surface fallback for browsers that don't support it.
 */
export function Select({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  allLabel?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const all: SelectOption[] = allLabel ? [{ value: "", label: allLabel }, ...options] : options;
  const current = all.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={ariaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 13px",
          fontFamily: "var(--u-font-sans)",
          fontSize: 13.5,
          fontWeight: 500,
          borderRadius: "var(--u-radius-md)",
          border: "1px solid var(--u-border)",
          backgroundColor: "var(--u-surface-raised)",
          color: "var(--u-ink)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "border-color 150ms ease",
        }}
      >
        {current?.label ?? allLabel ?? "Select…"}
        <ChevronDownIcon size={14} style={{ color: "var(--u-ink-secondary)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>

      <div
        role="listbox"
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          minWidth: "100%",
          backgroundColor: "var(--u-surface-raised)",
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 7%, transparent), color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 7%, transparent))",
          border: "1px solid var(--u-border)",
          borderRadius: "var(--u-radius-md)",
          boxShadow: "var(--u-shadow-card)",
          overflow: "hidden auto",
          maxHeight: open ? Math.min(all.length * 38 + 8, 320) : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 240ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease",
          zIndex: 50,
        }}
      >
        <div style={{ padding: 4 }}>
          {all.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setOpen(false);
                onChange(opt.value);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 11px",
                fontSize: 13,
                fontWeight: opt.value === value ? 700 : 500,
                color: opt.value === value ? "var(--u-brand-violet)" : "var(--u-ink)",
                background: "none",
                border: "none",
                borderRadius: "var(--u-radius-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(20,18,31,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
