"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "./icons";

export interface CurrencyOption {
  code: string;
  name: string;
}

/**
 * Searchable currency picker — added 2026-10-03, replacing every bare
 * 3-letter free-text currency input across the app (freight/insured/
 * supplier-payment/client-payment currency, and any other "pick a
 * currency" field). Lewis's point: a user shouldn't have to know or type
 * an ISO 4217 code from memory — this searches full currency names (e.g.
 * "British Pound Sterling") and stores the code behind the scenes, same
 * shape convention as CountrySelect (name-based search, code stored).
 *
 * Deliberately the same component shape/styling as CountrySelect (text-
 * input-triggered typeahead, same concertina panel) rather than the
 * small-cardinality Select — ~31 currencies is still too many to browse
 * comfortably without filtering, same reasoning CountrySelect's own doc
 * comment gives for 194 countries.
 */
export function CurrencySelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Search currencies…",
}: {
  value: string;
  onChange: (code: string) => void;
  options: CurrencyOption[];
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

  const selected = useMemo(() => options.find((o) => o.code === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q));
  }, [options, query]);

  const displayValue = open ? query : selected ? `${selected.name} (${selected.code})` : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex", pointerEvents: "none" }}>
          <SearchIcon size={15} />
        </span>
        <input
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{
            width: "100%",
            padding: "9px 34px 9px 34px",
            fontFamily: "var(--u-font-sans)",
            fontSize: 13.5,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-border)",
            backgroundColor: "var(--u-surface-raised)",
            color: "var(--u-ink)",
          }}
        />
        {value && !open && (
          <button
            type="button"
            aria-label="Clear currency"
            onClick={() => onChange("")}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "var(--u-ink-secondary)",
            }}
          >
            <XIcon size={14} />
          </button>
        )}
        {(!value || open) && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex", pointerEvents: "none" }}>
            <ChevronDownIcon size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
          </span>
        )}
      </div>

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
          maxHeight: open ? Math.min(filtered.length * 36 + 8, 280) : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 240ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease",
          zIndex: 50,
        }}
      >
        <div style={{ padding: 4 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--u-ink-secondary)" }}>No matching currencies</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
                setQuery("");
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                textAlign: "left",
                padding: "7px 11px",
                fontSize: 13,
                fontWeight: c.code === value ? 700 : 500,
                color: c.code === value ? "var(--u-brand-violet)" : "var(--u-ink)",
                background: "none",
                border: "none",
                borderRadius: "var(--u-radius-sm)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(20,18,31,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span>{c.name}</span>
              <span style={{ fontSize: 11, color: "var(--u-ink-secondary)", fontWeight: 500 }}>{c.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
