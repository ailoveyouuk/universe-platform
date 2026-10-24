"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  THEME_EVENT,
  applyTheme,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "./theme";

function SunIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  );
}
function MoonIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    </svg>
  );
}
function DeviceIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
  { value: "system", label: "Device", icon: <DeviceIcon /> },
];

/**
 * Light / Dark / Device switch for the app header. "Device" follows the
 * operating-system setting and updates live if that setting changes.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("light");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPref(getThemePreference());
    const onChange = (e: Event) => setPref((e as CustomEvent<ThemePreference>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  // Device mode: follow the OS setting as it changes.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => applyTheme("system");
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, [pref]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[0];

  return (
    <div ref={root} style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Change theme`}
        title={`Theme: ${current.label}`}
        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)", display: "flex", padding: 4 }}
      >
        {current.icon}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 60,
            minWidth: 150,
            padding: 4,
            background: "var(--u-surface-raised, var(--u-surface))",
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-md)",
            boxShadow: "var(--u-shadow-card)",
          }}
        >
          {OPTIONS.map((o) => {
            const selected = o.value === pref;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setThemePreference(o.value);
                  setPref(o.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  borderRadius: "var(--u-radius-sm)",
                  background: selected ? "var(--u-surface-alt)" : "none",
                  color: "var(--u-ink)",
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", color: selected ? "var(--u-brand-violet)" : "var(--u-ink-secondary)" }}>{o.icon}</span>
                {o.label}
                {selected && <span aria-hidden style={{ marginLeft: "auto", color: "var(--u-brand-violet)" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
