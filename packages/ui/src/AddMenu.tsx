"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon, ChevronDownIcon } from "./icons";

export interface AddMenuOption {
  label: string;
  onSelect: () => void;
}

/**
 * The "+ Add" quick-create control — added 2026-10-01 to replace a single
 * flat "New Partner" button with a concertina-style menu that lets a user
 * pick what kind of Stakeholder they're adding (Client, Manufacturer /
 * Supplier, Freight Forwarder) up front, landing them on the new-partner
 * form with that role pre-selected rather than making them tick a role
 * checkbox after the fact. Same pattern works anywhere else a "+ New X /
 * Y / Z" choice is needed — this component takes a generic `options` list
 * rather than being Stakeholder-specific.
 *
 * The "concertina" is a height/opacity transition on the options panel
 * (not a native <select>, so the open/close motion is visible) — closes
 * on outside click or Escape, consistent with standard menu behaviour.
 */
export function AddMenu({ label = "Add", options, accent }: { label?: string; options: AddMenuOption[]; accent?: string | null }) {
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

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          fontFamily: "var(--u-font-sans)",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: "var(--u-radius-md)",
          cursor: "pointer",
          border: "1px solid transparent",
          backgroundColor: accent ?? "var(--u-brand-violet)",
          color: "var(--u-brand-violet-on)",
          transition: "opacity 150ms ease",
        }}
      >
        <PlusIcon size={16} />
        {label}
        <ChevronDownIcon size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
      </button>

      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          minWidth: 220,
          backgroundColor: "var(--u-surface-raised)",
          border: "1px solid var(--u-border)",
          borderRadius: "var(--u-radius-md)",
          boxShadow: "var(--u-shadow-card)",
          overflow: "hidden",
          maxHeight: open ? options.length * 44 + 8 : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 240ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease",
          zIndex: 50,
        }}
      >
        <div style={{ padding: 4 }}>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setOpen(false);
                opt.onSelect();
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                fontSize: 13.5,
                fontWeight: 500,
                color: "var(--u-ink)",
                background: "none",
                border: "none",
                borderRadius: "var(--u-radius-sm)",
                cursor: "pointer",
                transition: "background-color 120ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--u-surface-alt)")}
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
