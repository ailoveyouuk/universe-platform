"use client";

import { SearchIcon, XIcon } from "./icons";

/** Shared search box for list pages — Projects, Stakeholders. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex" }}>
        <SearchIcon size={16} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 34px 9px 36px",
          fontSize: 13.5,
          fontFamily: "var(--u-font-sans)",
          borderRadius: "var(--u-radius-md)",
          border: "1px solid var(--u-border)",
          backgroundColor: "var(--u-surface-raised)",
          color: "var(--u-ink)",
          outline: "none",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--u-ink-secondary)",
            display: "flex",
          }}
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
