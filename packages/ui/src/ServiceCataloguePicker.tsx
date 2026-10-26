"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SERVICE_CATALOGUE, SERVICE_CATEGORIES, SERVICE_GROUPS, type ServiceCatalogueItem } from "@universe/types";

let cached: ServiceCatalogueItem[] | null = null;
/**
 * The services catalogue as platform staff maintain it (2026-10-26). Starts from the built-in list so a picker is never empty, then swaps in the
 * database list once `load` returns. `byCode` also finds a switched-off service a saved line may still carry.
 */
export function useServiceCatalogue(load: () => Promise<ServiceCatalogueItem[]>) {
  const [items, setItems] = useState<ServiceCatalogueItem[]>(cached ?? SERVICE_CATALOGUE);
  useEffect(() => { if (cached) return; load().then((r) => { if (r.length) { cached = r; setItems(r); } }).catch(() => undefined); }, [load]);
  const byCode = useMemo(() => (code: string | null | undefined) => items.find((i) => i.code === code) ?? SERVICE_CATALOGUE.find((i) => i.code === code) ?? null, [items]);
  return { items, byCode };
}

/**
 * Pick a standard service from the services catalogue (2026-10-25). Grouped by the kind of service, so it reads like the list of service types;
 * a line can still be free text, so the empty choice is always there. `category` narrows the list once the kind of service is chosen.
 */
export function ServiceCataloguePicker({ value, category, onPick, style, items = SERVICE_CATALOGUE, ariaLabel = "Standard service", emptyLabel = "Choose a standard service (optional)" }: {
  /** From useServiceCatalogue; defaults to the built-in list. */
  items?: ServiceCatalogueItem[];
  value: string | null | undefined;
  category?: string | null;
  onPick: (item: ServiceCatalogueItem | null) => void;
  style?: CSSProperties;
  ariaLabel?: string;
  emptyLabel?: string;
}) {
  const cats = SERVICE_CATEGORIES.filter((c) => !category || c.code === category);
  const current = items.find((i) => i.code === value) ?? SERVICE_CATALOGUE.find((i) => i.code === value) ?? null;
  return (
    <>
      <select className="u-native-select" aria-label={ariaLabel} style={style} value={value ?? ""} onChange={(e) => onPick(items.find((i) => i.code === e.target.value) ?? null)}>
        <option value="">{emptyLabel}</option>
        {SERVICE_GROUPS.map((g) => {
          const inGroup = cats.filter((c) => c.group === g);
          if (inGroup.length === 0) return null;
          return inGroup.map((c) => (
            <optgroup key={c.code} label={`${g}: ${c.label}`}>
              {items.filter((i) => i.category === c.code).map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
            </optgroup>
          ));
        })}
      </select>
      {current && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{current.description}</span>}
    </>
  );
}
