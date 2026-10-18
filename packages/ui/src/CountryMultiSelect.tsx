"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "./icons";
import type { CountryOption } from "./CountrySelect";

/**
 * Searchable multi-country picker (2026-10-18) for fields where one record can involve several countries — a project's
 * delivery destinations first. Same look as CountrySelect; chosen countries show as removable chips and the list stays
 * open while ticking several. The first chosen country is the primary one.
 */
export function CountryMultiSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Search and add countries…",
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  options: CountryOption[];
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const nameOf = useMemo(() => new Map(options.map((o) => [o.code, o.name])), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase() === q);
  }, [options, query]);

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
    setQuery("");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {value.map((code, i) => (
            <span
              key={code}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 4px 3px 10px", fontSize: 12.5, borderRadius: 999, border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)", color: "var(--u-ink)" }}
            >
              {nameOf.get(code) ?? code}
              {i === 0 && value.length > 1 && <span style={{ fontSize: 10.5, color: "var(--u-ink-secondary)" }}>primary</span>}
              <button
                type="button"
                aria-label={`Remove ${nameOf.get(code) ?? code}`}
                onClick={() => toggle(code)}
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 3, cursor: "pointer", color: "var(--u-ink-secondary)" }}
              >
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex", pointerEvents: "none" }}>
          <SearchIcon size={15} />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length ? "Add another country…" : placeholder}
          aria-label={ariaLabel}
          style={{ width: "100%", padding: "9px 34px", fontFamily: "var(--u-font-sans)", fontSize: 13.5, borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)", color: "var(--u-ink)" }}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex", pointerEvents: "none" }}>
          <ChevronDownIcon size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
        </span>
      </div>
      <div
        role="listbox"
        aria-multiselectable="true"
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          minWidth: "100%",
          backgroundColor: "var(--u-surface-raised)",
          backgroundImage: "linear-gradient(color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 7%, transparent), color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 7%, transparent))",
          border: "1px solid var(--u-border)",
          borderRadius: "var(--u-radius-md)",
          boxShadow: "var(--u-shadow-card)",
          overflow: "hidden auto",
          maxHeight: open ? Math.min(filtered.length * 36 + 8, 280) : 0,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "max-height 240ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease",
          zIndex: 50,
        }}
      >
        <div style={{ padding: 4 }}>
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--u-ink-secondary)" }}>No matching countries</div>}
          {filtered.map((c) => {
            const on = value.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(c.code)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "7px 11px", fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "var(--u-brand-violet)" : "var(--u-ink)", background: "none", border: "none", borderRadius: "var(--u-radius-sm)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(20,18,31,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span>{c.name}</span>
                <span style={{ fontSize: 11, color: "var(--u-ink-secondary)", fontWeight: 500 }}>{on ? "Selected" : c.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
