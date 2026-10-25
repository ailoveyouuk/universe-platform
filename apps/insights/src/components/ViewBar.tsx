"use client";

import { useState } from "react";
import Link from "next/link";
import { commodityGroupLabel } from "@universe/types";
import { useInsightsFilters } from "../lib/filters";
import { currentViewBridge, removeInsightsItem, saveInsightsItem, useInsightsItems, type SavedViewState } from "../lib/views";
import { inputStyle, pill } from "../lib/ui";

/** Sits at the top of every lens: save what you are looking at, and reopen your saved views from anywhere. */
export function ViewBar({ path, pageLabel, labelFor }: { path: string; pageLabel: string; labelFor: (path: string) => string }) {
  const filters = useInsightsFilters();
  const { items, failed } = useInsightsItems();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const views = (items ?? []).filter((i) => i.kind === "VIEW");
  const here = views.filter((v) => v.target === path);
  const others = views.filter((v) => v.target !== path);

  const defaultName = () => [pageLabel, filters.commodity ? commodityGroupLabel(filters.commodity) : "", filters.mode ? filters.mode.toLowerCase() : ""].filter(Boolean).join(", ");
  const save = async () => {
    setBusy(true);
    try {
      const state: SavedViewState = { filters, page: currentViewBridge()?.get() ?? {} };
      await saveInsightsItem({ kind: "VIEW", name: name.trim() || defaultName(), target: path, state: state as unknown as Record<string, unknown> });
      setNote(`Saved "${name.trim() || defaultName()}".`); setNaming(false); setName("");
    } catch (e) { setNote(e instanceof Error ? e.message : "Could not save this view."); } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 32px 0", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
      {note && <span role="status" style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginRight: "auto" }}>{note}</span>}
      {naming ? (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, fontWeight: 600 }}>Name this view
            <input aria-label="Name this view" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName()} maxLength={120} style={{ ...inputStyle, width: 240 }} />
          </label>
          <button type="submit" className="u-touch" style={pill(true)} disabled={busy}>Save view</button>
          <button type="button" className="u-touch" style={pill(false)} onClick={() => setNaming(false)}>Cancel</button>
        </form>
      ) : (
        <button type="button" className="u-touch" style={pill(false)} onClick={() => { setNote(null); setNaming(true); }}>Save this view</button>
      )}
      <details style={{ position: "relative" }}>
        <summary className="u-touch" style={{ ...pill(false), listStyle: "none", display: "inline-block" }}>Saved views{items ? ` (${views.length})` : ""}</summary>
        <div style={{ position: "absolute", right: 0, zIndex: 15, marginTop: 4, padding: 12, width: 320, maxWidth: "88vw", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", background: "var(--u-surface-raised)", boxShadow: "0 4px 16px rgba(0,0,0,0.16)" }}>
          {failed && <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Your saved views could not be loaded just now.</p>}
          {views.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>Nothing saved yet. Set the filters and selections you like, then choose Save this view. It will be here on every device you sign in on.</p> : (
            <>
              {[{ t: "On this page", list: here }, { t: "Other pages", list: others }].filter((g) => g.list.length).map((g) => (
                <div key={g.t} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{g.t}</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {g.list.map((v) => (
                      <li key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <Link href={`${v.target}?view=${v.id}`} style={{ minWidth: 0 }}>{v.name}<span style={{ color: "var(--u-ink-secondary)" }}> ({labelFor(v.target)})</span></Link>
                        <button type="button" className="u-touch" style={{ ...pill(false), padding: "3px 10px", fontSize: 12 }} aria-label={`Remove saved view ${v.name}`} onClick={() => void removeInsightsItem(v.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </details>
    </div>
  );
}
