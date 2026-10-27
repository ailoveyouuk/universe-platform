"use client";
import { useMemo, useState } from "react";
import { CRM_LINK_KIND_LABELS, CRM_LINK_KINDS, CRM_LOCATION_KIND_LABELS, CRM_LOCATION_KINDS, type CrmLink, type CrmLinkKind, type CrmLocation, type CrmLocationKind } from "@universe/types";
import { Button, ExternalLinkIcon, Pill, WorldMap, type WorldMapPoint } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCountries } from "../lib/useCountries";
import { ErrorNote, Field, inputStyle } from "../lib/ui";

export const KIND_COLOUR: Record<CrmLocationKind, string> = {
  HQ: "var(--u-accent-magenta)", OFFICE: "var(--u-brand-violet)", FACTORY: "var(--u-module-product-database)", WAREHOUSE: "var(--u-module-tender-issuance)", OTHER: "var(--u-module-admin)",
};
const note: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)" };

/** Where a stakeholder operates: a map with a pulsing pip per place (head office stands out), a list of the same places for keyboard and screen-reader users, and the chosen place's details. */
export function Places({ relId, canManage, locations, links, reload }: { relId: string; canManage: boolean; locations: CrmLocation[]; links: CrmLink[]; reload: () => Promise<void> }) {
  const countries = useCountries();
  const [sel, setSel] = useState<string | null>(locations[0]?.id ?? null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [editing, setEditing] = useState<CrmLocation | "new" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const byCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const nameOf = (code: string | null) => (code ? byCode.get(code)?.name ?? code : null);

  const { points, unplaced } = useMemo(() => {
    const seen = new Map<string, number>(); const pts: WorldMapPoint[] = []; const off: CrmLocation[] = [];
    for (const l of locations) {
      const c = l.countryCode ? byCode.get(l.countryCode) : undefined;
      if (!c || c.latitude === null || c.longitude === null) { off.push(l); continue; }
      // Several places in one country would sit on one dot, so spread them on a small ring around the country centre.
      const n = seen.get(c.code) ?? 0; seen.set(c.code, n + 1);
      const ang = n * 2.4; const rad = n === 0 ? 0 : 1.3 + 0.5 * Math.sqrt(n);
      pts.push({
        id: l.id, latitude: c.latitude + rad * Math.sin(ang), longitude: c.longitude + rad * Math.cos(ang), label: `${l.name} (${CRM_LOCATION_KIND_LABELS[l.kind]})`,
        color: KIND_COLOUR[l.kind], value: l.kind === "HQ" ? 4 : 1.5, tooltipLines: [{ text: [l.city, c.name].filter(Boolean).join(", ") }],
      });
    }
    return { points: pts, unplaced: off };
  }, [locations, byCode]);

  const legend = CRM_LOCATION_KINDS.filter((k) => locations.some((l) => l.kind === k)).map((k) => ({ color: KIND_COLOUR[k], label: CRM_LOCATION_KIND_LABELS[k] }));
  const chosen = locations.find((l) => l.id === sel) ?? null;
  const choose = (id: string) => { setSel(id); setFocus({ id, nonce: Date.now() }); };
  const hasHq = locations.some((l) => l.kind === "HQ");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ErrorNote message={err} />
      <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg, 12px)", padding: 10 }}>
        <WorldMap points={points} legend={legend} maxHeight={320} cluster={false} focus={focus} highlightId={sel} onPointClick={(p) => setSel(p.id)} emptyMessage="No places on the map yet. Add a head office or a site below." />
      </div>
      {locations.length === 0 ? <p style={note}>No places recorded yet.{canManage ? " Add the head office first." : ""}</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, alignItems: "start" }}>
          <ul aria-label="Places" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {locations.map((l) => (
              <li key={l.id}>
                <button type="button" aria-pressed={sel === l.id} onClick={() => choose(l.id)} style={{ width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--u-ink)", background: sel === l.id ? "var(--u-surface-raised, var(--u-surface))" : "var(--u-surface)", border: sel === l.id ? "2px solid var(--u-brand-violet)" : "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: KIND_COLOUR[l.kind], flex: "none" }} />
                  <strong>{l.name}</strong>
                  <Pill tone={l.kind === "HQ" ? "brand" : "neutral"}>{CRM_LOCATION_KIND_LABELS[l.kind]}</Pill>
                  <span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{[l.city, nameOf(l.countryCode)].filter(Boolean).join(", ") || "No country"}</span>
                </button>
              </li>
            ))}
          </ul>
          <section aria-label="Place details" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "12px 14px", display: "grid", gap: 6, fontSize: 13.5 }}>
            {!chosen ? <p style={note}>Select a place to see its details.</p> : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h4 style={{ margin: 0, fontSize: 15 }}>{chosen.name}</h4><Pill tone={chosen.kind === "HQ" ? "brand" : "neutral"}>{chosen.kind === "HQ" ? "Head office" : CRM_LOCATION_KIND_LABELS[chosen.kind]}</Pill></div>
                <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "3px 12px", margin: 0 }}>
                  <dt style={note}>Country</dt><dd style={{ margin: 0 }}>{nameOf(chosen.countryCode) ?? "Not set"}</dd>
                  <dt style={note}>City</dt><dd style={{ margin: 0 }}>{chosen.city ?? "Not set"}</dd>
                  <dt style={note}>Address</dt><dd style={{ margin: 0 }}>{chosen.address ?? "Not set"}</dd>
                  <dt style={note}>Phone</dt><dd style={{ margin: 0 }}>{chosen.phone ?? "Not set"}</dd>
                  <dt style={note}>Email</dt><dd style={{ margin: 0 }}>{chosen.email ?? "Not set"}</dd>
                  {chosen.notes && <><dt style={note}>Notes</dt><dd style={{ margin: 0 }}>{chosen.notes}</dd></>}
                </dl>
                {chosen.source === "pm" && <p style={{ ...note, fontSize: 12.5 }}>This site is held in Project Management and is edited there.</p>}
                {canManage && chosen.source === "crm" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(chosen)}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={async () => { try { await apiClient.updateCrmLocation(relId, chosen.id, { archived: true }); setSel(null); await reload(); setErr(null); } catch (e) { setErr(e instanceof Error ? e.message : "Could not archive."); } }}>Archive</Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {unplaced.length > 0 && <p style={{ ...note, fontSize: 12.5 }}>{unplaced.length} place{unplaced.length === 1 ? " has" : "s have"} no country, so {unplaced.length === 1 ? "it is" : "they are"} listed but not on the map.</p>}
      {canManage && (editing ? <LocationForm key={editing === "new" ? "new" : editing.id} relId={relId} loc={editing === "new" ? null : editing} hasHq={hasHq} onDone={async (id) => { setEditing(null); await reload(); if (id) choose(id); }} onError={setErr} />
        : <div><Button size="sm" variant="primary" onClick={() => setEditing("new")}>Add a place</Button></div>)}
      <Links relId={relId} canManage={canManage} links={links} reload={reload} onError={setErr} />
    </div>
  );
}

function LocationForm({ relId, loc, hasHq, onDone, onError }: { relId: string; loc: CrmLocation | null; hasHq: boolean; onDone: (id: string | null) => void; onError: (m: string | null) => void }) {
  const countries = useCountries();
  const [f, setF] = useState({ kind: (loc?.kind ?? (hasHq ? "OFFICE" : "HQ")) as CrmLocationKind, name: loc?.name ?? "", countryCode: loc?.countryCode ?? "", city: loc?.city ?? "", address: loc?.address ?? "", phone: loc?.phone ?? "", email: loc?.email ?? "", notes: loc?.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, countryCode: f.countryCode || null, city: f.city || null, address: f.address || null, phone: f.phone || null, email: f.email || null, notes: f.notes || null };
      const r = loc ? await apiClient.updateCrmLocation(relId, loc.id, body) : await apiClient.addCrmLocation(relId, body);
      onError(null); onDone(r.id);
    } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label={loc ? "Edit place" : "Add a place"} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <Field label="Type" hint={f.kind === "HQ" && hasHq && loc?.kind !== "HQ" ? "The current head office will become an ordinary office." : undefined}><select className="u-native-select" style={inputStyle} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CrmLocationKind })}>{CRM_LOCATION_KINDS.map((k) => <option key={k} value={k}>{k === "HQ" ? "Head office (HQ)" : CRM_LOCATION_KIND_LABELS[k]}</option>)}</select></Field>
        <Field label="Name"><input style={inputStyle} required maxLength={150} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Country"><select className="u-native-select" style={inputStyle} value={f.countryCode} onChange={(e) => setF({ ...f, countryCode: e.target.value })}><option value="">Not set</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
        <Field label="City"><input style={inputStyle} maxLength={100} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <Field label="Phone"><input style={inputStyle} maxLength={60} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><input type="email" style={inputStyle} maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      </div>
      <Field label="Address"><input style={inputStyle} maxLength={500} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Notes" hint="Business information only."><input style={inputStyle} maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="primary" type="submit" disabled={busy || !f.name.trim()}>Save place</Button><Button size="sm" variant="secondary" type="button" onClick={() => onDone(null)}>Cancel</Button></div>
    </form>
  );
}

/** Web addresses by kind: website, social, portals (tendering, business opportunities) and quality. Opens in a new tab. */
export function Links({ relId, canManage, links, reload, onError }: { relId: string; canManage: boolean; links: CrmLink[]; reload: () => Promise<void>; onError: (m: string | null) => void }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<{ kind: CrmLinkKind; label: string; url: string }>({ kind: "SOCIAL", label: "", url: "" });
  const [busy, setBusy] = useState(false);
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const add = async () => {
    setBusy(true);
    try { await apiClient.addCrmLink(relId, f); setF({ kind: "SOCIAL", label: "", url: "" }); setAdding(false); onError(null); await reload(); }
    catch (e) { onError(e instanceof Error ? e.message : "Could not save the link."); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Links" style={{ display: "grid", gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 14 }}>Links</h4>
      {links.length === 0 ? <p style={note}>No links recorded yet.</p> : CRM_LINK_KINDS.filter((k) => links.some((l) => l.kind === k)).map((k) => (
        <div key={k}>
          <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{CRM_LINK_KIND_LABELS[k]}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {links.filter((l) => l.kind === k).map((l) => (
              <li key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13.5 }}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`${l.label}, ${host(l.url)} (opens in a new tab)`} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>{l.label} <span style={{ color: "var(--u-ink-secondary)" }}>({host(l.url)})</span><ExternalLinkIcon size={13} aria-hidden="true" /></a>
                {canManage && l.source === "crm" && <Button size="sm" variant="secondary" aria-label={`Archive link ${l.label}`} onClick={async () => { try { await apiClient.updateCrmLink(relId, l.id, { archived: true }); await reload(); } catch (e) { onError(e instanceof Error ? e.message : "Could not archive."); } }}>Archive</Button>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {canManage && (adding ? (
        <form onSubmit={(e) => { e.preventDefault(); void add(); }} aria-label="Add a link" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
          <Field label="Type"><select className="u-native-select" style={inputStyle} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CrmLinkKind })}>{CRM_LINK_KINDS.map((k) => <option key={k} value={k}>{CRM_LINK_KIND_LABELS[k]}</option>)}</select></Field>
          <Field label="Label" hint="For example LinkedIn, or Tender portal."><input style={inputStyle} required maxLength={100} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
          <Field label="Web address"><input style={inputStyle} required maxLength={500} inputMode="url" aria-label="Web address" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="primary" type="submit" disabled={busy || !f.label.trim() || !f.url.trim()}>Save link</Button><Button size="sm" variant="secondary" type="button" onClick={() => setAdding(false)}>Cancel</Button></div>
        </form>
      ) : <div><Button size="sm" variant="secondary" onClick={() => setAdding(true)}>Add a link</Button></div>)}
    </section>
  );
}
