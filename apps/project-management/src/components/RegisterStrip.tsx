"use client";

import { useEffect, useState } from "react";
import type { ProductPharmaPanel } from "@universe/types";
import { matchPill, sourcePill } from "@universe/types";
import { SourcePill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { PRODUCT_DATABASE_URL } from "./ProductCreateForm";

/**
 * Lite register view for Project Management: the verified/not-linked pill, source and ATC pills and the leaflet links, with a clear
 * route to the full product page in the Product Database app. Read-only here; confirming matches happens in the Product Database.
 */
export function RegisterStrip({ productId, medicine }: { productId: string; medicine?: boolean }) {
  const [panel, setPanel] = useState<ProductPharmaPanel | null>(null);
  useEffect(() => { let live = true; apiClient.productPharmaPanel(productId).then((p) => { if (live) setPanel(p); }).catch(() => { if (live) setPanel(null); }); return () => { live = false; }; }, [productId]);
  const full = `${PRODUCT_DATABASE_URL}/products/detail?id=${productId}`;
  if (!panel || (!panel.verified && !panel.links.length && !panel.pil.length && !panel.atcCode && !medicine)) {
    return <p style={{ margin: "6px 0 0", fontSize: 12.5 }}><a href={full} target="_blank" rel="noreferrer" style={{ color: "var(--u-brand-violet)", fontWeight: 600 }}>View full product details</a></p>;
  }
  const suggested = panel.links.some((l) => l.status === "SUGGESTED");
  const state = panel.verified ? matchPill("CONFIRMED") : suggested ? matchPill("SUGGESTED") : matchPill("NONE");
  return (
    <div style={{ margin: "8px 0 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} aria-label="Medicine register status">
      {panel.simulated && <SourcePill label="Simulated" tone="critical" title="Demo data" />}
      <SourcePill {...state} />
      {panel.atcCode && <SourcePill label={`ATC ${panel.atcCode}`} tone="neutral" title="WHO ATC code" />}
      {[...new Set(panel.links.filter((l) => l.status === "CONFIRMED").map((l) => l.reference.source))].map((s) => <SourcePill key={s} {...sourcePill(s)} />)}
      {panel.pil.map((l) => <SourcePill key={l.url} label={l.label} tone={l.source === "EMA" ? "brand" : l.source === "MHRA" ? "accent" : "neutral"} href={l.url} title={l.official ? "Official leaflet, opens in a new tab" : "Supplied, not an official source"} />)}
      <a href={full} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--u-brand-violet)", fontWeight: 600 }}>View full product details</a>
    </div>
  );
}
