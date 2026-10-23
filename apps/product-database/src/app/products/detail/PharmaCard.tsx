"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductCatalogDetail, ProductPharmaPanel, ProductPharmaLinkView } from "@universe/types";
import { matchPill, sourcePill } from "@universe/types";
import { Button, SourcePill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { Card } from "./ProductDetailView";

type RegHit = Awaited<ReturnType<typeof apiClient.searchPharmaRegister>>["items"][number];

const looksLikeMedicine = (d: ProductCatalogDetail) => /pharma|medicine|drug/i.test(d.category) || !!(d.inn || d.dosageForm || d.atcCode);

/**
 * Register links and the patient information leaflet for a medicine. Pills show where each fact comes from (EMA, MHRA, supplied) and
 * whether the match is verified; the matcher only suggests, a person with products.approve confirms. Links go out to the official
 * documents; Universe does not copy leaflet text.
 */
export function PharmaCard({ detail }: { detail: ProductCatalogDetail }) {
  const user = useCurrentUser();
  const perms: string[] = ((user as unknown as { permissions?: string[] })?.permissions) ?? [];
  const staff = (user as unknown as { platformStaffRole?: string })?.platformStaffRole;
  const canManage = (!!staff && staff !== "NONE") || perms.includes("products.approve");
  const [panel, setPanel] = useState<ProductPharmaPanel | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<RegHit[] | null>(null);
  const [pil, setPil] = useState("");

  const apply = (p: ProductPharmaPanel) => { setPanel(p); setPil(p.manualPilUrl ?? ""); };
  useEffect(() => { apiClient.productPharmaPanel(detail.id).then(apply).catch((e) => setErr(e instanceof Error ? e.message : "Could not load register links.")); }, [detail.id]);
  const run = useCallback(async (fn: () => Promise<ProductPharmaPanel>) => {
    setBusy(true); setErr(null);
    try { apply(await fn()); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  }, []);

  const linked = panel?.links ?? [];
  if (!panel && !err) return null;
  if (!looksLikeMedicine(detail) && linked.length === 0 && !panel?.manualPilUrl) return null;

  const confirmed = linked.filter((l) => l.status === "CONFIRMED");
  const suggested = linked.filter((l) => l.status === "SUGGESTED");
  const state = panel?.verified ? matchPill("CONFIRMED") : suggested.length ? matchPill("SUGGESTED") : matchPill("NONE");
  const flags = [confirmed.some((l) => l.reference.isGeneric) && "Generic", confirmed.some((l) => l.reference.isBiosimilar) && "Biosimilar", confirmed.some((l) => l.reference.isOrphan) && "Orphan"].filter(Boolean) as string[];

  return (
    <Card title="Register and patient information leaflet" note="Matched against the EMA and UK MHRA registers. Links go to the official documents; the official text prevails.">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {panel?.simulated && <SourcePill label="Simulated" tone="critical" title="Demo data: simulated product and links, visible only in demo organisations" />}
        <SourcePill {...state} />
        {panel?.atcCode && <SourcePill label={`ATC ${panel.atcCode}`} tone="neutral" title="WHO Anatomical Therapeutic Chemical code" />}
        {[...new Set(confirmed.map((l) => l.reference.source))].map((s) => <SourcePill key={s} {...sourcePill(s)} />)}
        {flags.map((f) => <SourcePill key={f} label={f} tone="neutral" />)}
      </div>

      <div style={{ marginTop: 14 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Patient information leaflet</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {panel && panel.pil.length > 0
            ? panel.pil.map((l) => <SourcePill key={l.url} label={l.label} tone={l.source === "EMA" ? "brand" : l.source === "MHRA" ? "accent" : "neutral"} href={l.url} title={l.official ? "Official source, opens in a new tab" : "Supplied by a person, not an official source"} />)
            : <span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>No leaflet linked yet. Confirm a register match or add a link below.</span>}
        </div>
      </div>

      {confirmed.length > 0 && <MatchList items={confirmed} canManage={canManage} busy={busy} onReject={(id) => run(() => apiClient.decideProductPharmaLink(id, "reject"))} />}
      {suggested.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Suggested matches{canManage ? "" : " (awaiting confirmation by a catalogue approver)"}</span>
          <MatchList items={suggested} canManage={canManage} busy={busy} onConfirm={(id) => run(() => apiClient.decideProductPharmaLink(id, "confirm"))} onReject={(id) => run(() => apiClient.decideProductPharmaLink(id, "reject"))} />
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
        <Button variant="secondary" disabled={busy} onClick={() => run(() => apiClient.suggestProductPharmaLinks(detail.id))}>Find register matches</Button>
        {canManage && (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) apiClient.searchPharmaRegister({ q: q.trim(), take: 8 }).then((r) => setHits(r.items)).catch(() => setHits([])); }} placeholder="Search the register by name, substance or PL number" aria-label="Search the register" style={{ flex: "1 1 260px", padding: "7px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13 }} />
          </>
        )}
      </div>
      {hits && (
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {hits.length === 0 && <li style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Nothing found in the register.</li>}
          {hits.map((h) => (
            <li key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
              <SourcePill {...sourcePill(h.source)} />
              <strong>{h.name}</strong>
              <span style={{ color: "var(--u-ink-secondary)" }}>{h.sourceKey}{h.atcCode ? ` · ${h.atcCode}` : ""}</span>
              <Button variant="secondary" disabled={busy} onClick={() => { setHits(null); setQ(""); run(() => apiClient.linkProductToRegister(detail.id, h.id)); }}>Link</Button>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
          <input value={pil} onChange={(e) => setPil(e.target.value)} placeholder="https:// link to a leaflet, for products not in either register" aria-label="Leaflet link" style={{ flex: "1 1 320px", padding: "7px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13 }} />
          <Button variant="secondary" disabled={busy || pil === (panel?.manualPilUrl ?? "")} onClick={() => run(() => apiClient.setProductPilUrl(detail.id, pil.trim() || null))}>Save link</Button>
        </div>
      )}
      {err && <p role="alert" style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--u-status-critical)" }}>{err}</p>}
      {panel && <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{panel.attribution}</p>}
    </Card>
  );
}

function MatchList({ items, canManage, busy, onConfirm, onReject }: { items: ProductPharmaLinkView[]; canManage: boolean; busy: boolean; onConfirm?: (id: string) => void; onReject?: (id: string) => void }) {
  return (
    <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
      {items.map((l) => (
        <li key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <SourcePill {...sourcePill(l.reference.source)} />
          <strong>{l.reference.name}</strong>
          <span style={{ color: "var(--u-ink-secondary)" }}>{l.reference.sourceKey}{l.reference.holder ? ` · ${l.reference.holder}` : ""}</span>
          {l.status === "SUGGESTED" && <SourcePill label={`${l.score}% · ${l.basis ?? "match"}`} tone="warning" title="How well this entry matches, and on which fields" />}
          {l.status === "CONFIRMED" && l.decidedByName && <span style={{ color: "var(--u-ink-secondary)", fontSize: 12 }}>confirmed by {l.decidedByName}</span>}
          {canManage && onConfirm && <Button variant="secondary" disabled={busy} onClick={() => onConfirm(l.id)}>Confirm</Button>}
          {canManage && onReject && <Button variant="secondary" disabled={busy} onClick={() => onReject(l.id)}>{l.status === "CONFIRMED" ? "Unlink" : "Reject"}</Button>}
        </li>
      ))}
    </ul>
  );
}
