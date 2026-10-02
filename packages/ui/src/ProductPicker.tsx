"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "./icons";

export interface ProductPickerOption {
  id: string;
  name: string;
  category: string;
  /** Shown as a small provenance hint ("added by Acme Manufacturing") —
   * never used for gating; ProductMaster search stays open to everyone.
   * See ProductCatalogMatch's doc comment in @universe/types. */
  addedByOrganizationName?: string | null;
}

/**
 * Search-or-create picker for the shared, central product catalogue
 * (ProductMaster) — the UI half of the reusable pattern built 2026-10-02
 * alongside the Project Management line-item workflow (see
 * claude/product-catalog-build.md). Lives in `@universe/ui`, not in any one
 * app, specifically so CRM and the future Supplier Portal app can reuse it
 * directly once they exist, the same way they'll reuse
 * `@universe/api-client`'s searchProductCatalog/createProductCatalogEntry
 * methods — per Lewis's own framing: "remember this implementation method
 * for when we build out the crm and manufacturer/supplier app elements
 * that can share the product creation method".
 *
 * Deliberately presentation-only, same convention as CountrySelect in this
 * package: the component owns its own open/focus state, but searching and
 * creating are left to the caller (via onQueryChange / onCreateNew) since
 * both need a server round-trip through the host app's own api-client
 * instance — this package has no dependency on @universe/api-client.
 *
 * Mirrors the inline search-dropdown pattern already used for the QA "new
 * approval" product field (apps/project-management/src/app/quality/page.tsx)
 * and the stakeholder-registry duplicate-prevention prompt
 * (apps/project-management/src/app/partners/new/page.tsx), generalized into
 * one shared component so a third copy of this pattern is never hand-rolled
 * again.
 */
export function ProductPicker({
  query,
  onQueryChange,
  options,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  onCreateNew,
  creating,
  placeholder = "Search the product catalogue…",
  ariaLabel,
  createLabel,
}: {
  /** The current free-text search string (debounced server search is the
   * caller's responsibility, same as the stakeholder-registry prompt). */
  query: string;
  onQueryChange: (value: string) => void;
  options: ProductPickerOption[];
  /** The currently-linked product's id, or null/undefined if none. */
  selectedId?: string | null;
  /** Display name for the selected product — needed because `options`
   * (the live search results) won't necessarily still contain it once a
   * line has been saved and is later reopened for editing. */
  selectedLabel?: string | null;
  onSelect: (option: ProductPickerOption) => void;
  onClear: () => void;
  /** Omit to hide the "add new product" affordance entirely (e.g. a
   * read-only context, or a caller that isn't ready to wire creation up
   * yet). Receives the in-progress query text as a starting name. */
  onCreateNew?: (name: string) => void | Promise<void>;
  creating?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  createLabel?: string;
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

  const showDropdown = open && !selectedId && query.trim().length > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex", pointerEvents: "none" }}>
          <SearchIcon size={15} />
        </span>
        <input
          value={selectedId ? (selectedLabel ?? "") : query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? "Search products"}
          readOnly={Boolean(selectedId)}
          style={{
            width: "100%",
            padding: "9px 34px 9px 34px",
            fontFamily: "var(--u-font-sans)",
            fontSize: 13.5,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-border)",
            backgroundColor: selectedId ? "var(--u-surface-alt)" : "var(--u-surface-raised)",
            color: "var(--u-ink)",
          }}
        />
        {selectedId && (
          <button
            type="button"
            aria-label="Clear selected product"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
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
      </div>

      {showDropdown && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: "100%",
            backgroundColor: "var(--u-surface-raised)",
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-md)",
            boxShadow: "var(--u-shadow-card)",
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          <div style={{ padding: 4 }}>
            {options.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--u-ink-secondary)" }}>No matching products</div>
            )}
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 11px",
                  fontSize: 13,
                  color: "var(--u-ink)",
                  background: "none",
                  border: "none",
                  borderRadius: "var(--u-radius-sm)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(20,18,31,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span>{o.name}</span>
                <span style={{ fontSize: 11, color: "var(--u-ink-secondary)" }}>
                  {o.category}
                  {o.addedByOrganizationName ? ` · added by ${o.addedByOrganizationName}` : ""}
                </span>
              </button>
            ))}
            {onCreateNew && (
              <button
                type="button"
                disabled={creating}
                onClick={() => onCreateNew(query.trim())}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 11px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--u-brand-violet)",
                  background: "none",
                  border: "none",
                  borderTop: options.length > 0 ? "1px solid var(--u-border)" : "none",
                  borderRadius: "var(--u-radius-sm)",
                  cursor: creating ? "default" : "pointer",
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "Adding…" : (createLabel ?? `+ Add "${query.trim()}" to the catalogue`)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
