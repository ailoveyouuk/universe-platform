"use client";

import { useState } from "react";
import { Select, type SelectOption } from "./Select";

const OTHER = "__other__";

/**
 * Unit-of-measure picker (2026-10-19): the common metric, imperial and pack units come from a shared list passed in as `options`
 * (UNIT_OPTIONS in @universe/types); "Other" reveals a text box for anything not on it. The stored value is the unit string itself,
 * so a unit already saved as free text opens in "Other" mode and nothing is lost. This package does not depend on @universe/types,
 * hence the options prop (same arrangement as CurrencySelect).
 */
export function UnitSelect({ value, onChange, options, ariaLabel, allLabel = "Choose a unit" }: {
  value: string;
  onChange: (unit: string) => void;
  options: readonly SelectOption[];
  ariaLabel?: string;
  allLabel?: string;
}) {
  const known = options.some((o) => o.value === value);
  const [other, setOther] = useState(!!value && !known);
  const showText = other || (!!value && !known);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Select
        value={showText ? OTHER : value}
        onChange={(v) => { if (v === OTHER) { setOther(true); onChange(known ? "" : value); } else { setOther(false); onChange(v); } }}
        options={[...options, { value: OTHER, label: "Other (type it)" }]}
        allLabel={allLabel}
        ariaLabel={ariaLabel}
      />
      {showText && (
        <input
          aria-label={ariaLabel ? `${ariaLabel}, other` : "Other unit"}
          value={known ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={40}
          placeholder="e.g. drum, reel, cylinder"
          style={{ padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5, width: "100%", boxSizing: "border-box", backgroundColor: "var(--u-surface)", color: "var(--u-ink)" }}
        />
      )}
    </div>
  );
}
