"use client";

import { useEffect, useState } from "react";
import { sourcePill } from "@universe/types";
import { SourcePill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { PRODUCT_DATABASE_URL } from "./ProductCreateForm";

type Hit = Awaited<ReturnType<typeof apiClient.searchPharmaRegister>>["items"][number];

/** Lite medicines-register check for the add-product form: does this brand or generic name exist in the EMA / MHRA lists? Read-only. */
export function RegisterLookup({ term, onUseInn }: { term: string; onUseInn?: (inn: string) => void }) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  useEffect(() => {
    const t = term.trim();
    if (t.length < 3) { setHits(null); return; }
    let live = true;
    const h = setTimeout(() => { apiClient.searchPharmaRegister({ q: t, take: 5 }).then((r) => { if (live) setHits(r.items); }).catch(() => { if (live) setHits(null); }); }, 350);
    return () => { live = false; clearTimeout(h); };
  }, [term]);
  if (!hits) return null;
  return (
    <div style={{ border: "1px dashed var(--u-border)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5 }}>
      <strong>Medicines register</strong>
      {hits.length === 0 ? <span style={{ color: "var(--u-ink-secondary)" }}> · no EMA or MHRA entry found for “{term.trim()}”.</span> : (
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {hits.map((h) => (
            <li key={h.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <SourcePill {...sourcePill(h.source)} />
              <span style={{ fontWeight: 600 }}>{h.name}</span>
              {h.atcCode && <SourcePill label={h.atcCode} tone="neutral" title="ATC code" />}
              {h.pilLinks.slice(0, 1).map((l) => <SourcePill key={l.url} label={l.label} tone={l.source === "EMA" ? "brand" : "accent"} href={l.url} />)}
              {onUseInn && h.inn && <button type="button" onClick={() => onUseInn(h.inn!)} style={{ background: "none", border: "none", color: "var(--u-brand-violet)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: 0 }}>Use generic name</button>}
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 6 }}><a href={`${PRODUCT_DATABASE_URL}/register?q=${encodeURIComponent(term.trim())}`} target="_blank" rel="noreferrer" style={{ color: "var(--u-brand-violet)", fontWeight: 600 }}>Open the full medicines register</a></div>
    </div>
  );
}
