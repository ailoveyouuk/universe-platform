"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { matchPill, scopeSubById, sourcePill } from "@universe/types";
import { Button, CheckCircleIcon, SearchInput, ShieldIcon, SourcePill, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";

type Summary = Awaited<ReturnType<typeof apiClient.pharmaRegisterSummary>>;
type Hit = Awaited<ReturnType<typeof apiClient.searchPharmaRegister>>["items"][number];
type Entry = Awaited<ReturnType<typeof apiClient.getPharmaRegisterEntry>>;
const PAGE = 25;
const input = { padding: "6px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13, minWidth: 0 } as const;

/**
 * Medicines register: the EMA and UK MHRA lists of authorised medicines, searchable and filterable, with each entry's leaflet
 * links and the catalogue products confirmed against it. Reference data; the official register entry prevails.
 * Filters live in the address bar so a view can be shared or bookmarked.
 */
function RegisterView() {
  const router = useRouter();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const [q, setQ] = useState(get("q"));
  const source = get("source"), atc = get("atc"), holder = get("holder"), linked = get("linked"), status = get("status");
  const flag = (k: string) => get(k) === "1";
  const page = Math.max(0, Number(get("page") || 0));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [data, setData] = useState<{ total: number; items: Hit[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = useCallback((patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    if (!("page" in patch)) n.delete("page");
    router.replace(`/register${n.toString() ? `?${n}` : ""}`);
  }, [router, sp]);

  useEffect(() => { apiClient.pharmaRegisterSummary().then(setSummary).catch(() => setSummary(null)); }, []);
  useEffect(() => { const t = setTimeout(() => { if (q !== get("q")) set({ q: q.trim() || null }); }, 350); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);
  useEffect(() => {
    let live = true; setData(null); setErr(null);
    apiClient.searchPharmaRegister({ q: get("q") || undefined, source: source || undefined, atc: atc || undefined, holder: holder || undefined, status: status || undefined, generic: flag("generic"), biosimilar: flag("biosimilar"), orphan: flag("orphan"), linked: linked === "YES" || linked === "NO" ? linked : undefined, skip: page * PAGE, take: PAGE })
      .then((r) => { if (live) setData(r); }).catch((e) => { if (live) setErr(e instanceof Error ? e.message : "Could not load the register."); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useEffect(() => { if (!open) { setEntry(null); return; } let live = true; apiClient.getPharmaRegisterEntry(open).then((e) => { if (live) setEntry(e); }).catch(() => { if (live) setEntry(null); }); return () => { live = false; }; }, [open]);

  const count = (src: string) => (summary?.counts ?? []).filter((c) => c.source === src && c.status === "Authorised").reduce((a, c) => a + c.count, 0);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <main style={{ padding: "24px clamp(12px, 3vw, 32px)", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>Medicines register</h1>
      <p style={{ margin: "0 0 16px", color: "var(--u-ink-secondary)", fontSize: 13.5 }}>Authorised medicines from the EMA and the UK MHRA. Open an entry for its leaflet links and the catalogue products matched to it.</p>

      <StatTileGrid>
        <StatTile label="EMA authorised" value={summary ? count("EMA") : undefined} icon={<ShieldIcon size={18} />} tone="brand" active={source === "EMA"} onClick={() => set({ source: source === "EMA" ? null : "EMA" })} />
        <StatTile label="MHRA authorised" value={summary ? count("MHRA") : undefined} icon={<ShieldIcon size={18} />} tone="warning" active={source === "MHRA"} onClick={() => set({ source: source === "MHRA" ? null : "MHRA" })} />
        <StatTile label="Entries in catalogue" value={summary ? summary.linkedEntries : undefined} icon={<CheckCircleIcon size={18} />} tone="good" active={linked === "YES"} onClick={() => set({ linked: linked === "YES" ? null : "YES" })} />
      </StatTileGrid>

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}><SearchInput value={q} onChange={setQ} placeholder="Name, substance, holder or licence number…" /></div>
        <input defaultValue={atc} key={`atc-${atc}`} onBlur={(e) => e.target.value !== atc && set({ atc: e.target.value.trim() || null })} onKeyDown={(e) => e.key === "Enter" && set({ atc: (e.target as HTMLInputElement).value.trim() || null })} placeholder="ATC e.g. J01" aria-label="ATC prefix" style={{ ...input, width: 110 }} />
        <input defaultValue={holder} key={`h-${holder}`} onBlur={(e) => e.target.value !== holder && set({ holder: e.target.value.trim() || null })} onKeyDown={(e) => e.key === "Enter" && set({ holder: (e.target as HTMLInputElement).value.trim() || null })} placeholder="Licence holder" aria-label="Licence holder" style={{ ...input, width: 150 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        {(["EMA", "MHRA"] as const).map((s) => <SourcePill key={s} {...sourcePill(s)} active={source === s} onClick={() => set({ source: source === s ? null : s })} />)}
        <SourcePill label="Generic" tone="neutral" active={flag("generic")} onClick={() => set({ generic: flag("generic") ? null : "1" })} />
        <SourcePill label="Biosimilar" tone="neutral" active={flag("biosimilar")} onClick={() => set({ biosimilar: flag("biosimilar") ? null : "1" })} />
        <SourcePill label="Orphan" tone="neutral" active={flag("orphan")} onClick={() => set({ orphan: flag("orphan") ? null : "1" })} />
        <SourcePill {...matchPill("CONFIRMED")} label="In catalogue" active={linked === "YES"} onClick={() => set({ linked: linked === "YES" ? null : "YES" })} />
        <SourcePill label="Not in catalogue" tone="neutral" active={linked === "NO"} onClick={() => set({ linked: linked === "NO" ? null : "NO" })} />
        {(sp.toString() !== "") && <Button variant="ghost" size="sm" onClick={() => { setQ(""); router.replace("/register"); }}>Clear filters</Button>}
      </div>

      {err && <p role="alert" style={{ color: "var(--u-status-critical-text)", marginTop: 16 }}>{err}</p>}
      {!data && !err && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}
      {data && (
        <>
          <p style={{ margin: "14px 0 8px", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{data.total.toLocaleString("en-GB")} entries</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {data.items.length === 0 && <li style={{ color: "var(--u-ink-secondary)", padding: 20, textAlign: "center" }}>No register entries match these filters.</li>}
            {data.items.map((h) => {
              const expanded = open === h.id;
              return (
                <li key={h.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", background: "var(--u-surface-raised)", padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <SourcePill {...sourcePill(h.source)} />
                    <button type="button" onClick={() => setOpen(expanded ? null : h.id)} aria-expanded={expanded} style={{ all: "unset", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "var(--u-ink)" }}>{h.name}</button>
                    {h.atcCode && <SourcePill label={h.atcCode} tone="neutral" title="ATC code" />}
                    {h.isGeneric && <SourcePill label="Generic" tone="neutral" />}
                    {h.isBiosimilar && <SourcePill label="Biosimilar" tone="neutral" />}
                    {h.isOrphan && <SourcePill label="Orphan" tone="neutral" />}
                    {h.linkedProducts > 0 && <SourcePill {...matchPill("CONFIRMED")} label={`${h.linkedProducts} in catalogue`} />}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", overflowWrap: "anywhere" }}>
                    {h.sourceKey}{h.holder ? ` · ${h.holder}` : ""}{h.inn || h.activeSubstances ? ` · ${(h.inn ?? h.activeSubstances ?? "").slice(0, 120)}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {h.pilLinks.map((l) => <SourcePill key={l.url} label={l.label} tone={l.source === "EMA" ? "brand" : "accent"} href={l.url} />)}
                  </div>
                  {expanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--u-border)", fontSize: 13 }}>
                      {!entry ? "Loading…" : (
                        <>
                          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: "10px 18px" }}>
                            {([["Status", entry.status], ["Legal status", entry.legalStatus], ["Windsor list", entry.windsorCategory], ["Authorised", entry.authorisedOn?.slice(0, 10)], ["Therapeutic area", entry.therapeuticArea], ["Pharmacotherapeutic group", entry.pharmacotherapeuticGroup], ["Supplier scope", entry.scopeSubcategory ? scopeSubById(entry.scopeSubcategory)?.sub.label : null]] as [string, string | null | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                              <div key={k}><dt style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
                            ))}
                          </dl>
                          {entry.indication && <p style={{ margin: "10px 0 0" }}>{entry.indication.slice(0, 600)}{entry.indication.length > 600 ? "…" : ""}</p>}
                          <div style={{ marginTop: 10 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Catalogue products matched</span>
                            {entry.linkedProducts.length === 0 ? <div style={{ color: "var(--u-ink-secondary)" }}>None yet.</div> : (
                              <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                                {entry.linkedProducts.map((p) => <li key={p.id}><Link href={`/products/detail?id=${p.id}`}>{p.name}</Link> {p.isSimulated && <SourcePill label="Simulated" tone="critical" />}</li>)}
                              </ul>
                            )}
                          </div>
                          {entry.sourceUrl && <p style={{ margin: "10px 0 0" }}><SourcePill label="Official register entry" tone="neutral" href={entry.sourceUrl} /></p>}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
            <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Page {page + 1} of {pages.toLocaleString("en-GB")}</span>
            <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => set({ page: String(page + 1) })}>Next</Button>
          </div>
        </>
      )}
      {summary && <p style={{ margin: "20px 0 0", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{summary.attribution}</p>}
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterView /></Suspense>;
}
