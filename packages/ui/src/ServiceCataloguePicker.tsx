"use client";
import type { CSSProperties } from "react";
import { SERVICE_CATALOGUE, SERVICE_CATEGORIES, SERVICE_GROUPS, serviceCatalogueByCode, type ServiceCatalogueItem } from "@universe/types";

/**
 * Pick a standard service from the services catalogue (2026-10-25). Grouped by the kind of service, so it reads like the list of service types;
 * a line can still be free text, so the empty choice is always there. `category` narrows the list once the kind of service is chosen.
 */
export function ServiceCataloguePicker({ value, category, onPick, style, ariaLabel = "Standard service", emptyLabel = "Choose a standard service (optional)" }: {
  value: string | null | undefined;
  category?: string | null;
  onPick: (item: ServiceCatalogueItem | null) => void;
  style?: CSSProperties;
  ariaLabel?: string;
  emptyLabel?: string;
}) {
  const cats = SERVICE_CATEGORIES.filter((c) => !category || c.code === category);
  const current = serviceCatalogueByCode(value);
  return (
    <>
      <select className="u-native-select" aria-label={ariaLabel} style={style} value={value ?? ""} onChange={(e) => onPick(serviceCatalogueByCode(e.target.value))}>
        <option value="">{emptyLabel}</option>
        {SERVICE_GROUPS.map((g) => {
          const inGroup = cats.filter((c) => c.group === g);
          if (inGroup.length === 0) return null;
          return inGroup.map((c) => (
            <optgroup key={c.code} label={`${g}: ${c.label}`}>
              {SERVICE_CATALOGUE.filter((i) => i.category === c.code).map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
            </optgroup>
          ));
        })}
      </select>
      {current && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{current.description}</span>}
    </>
  );
}
