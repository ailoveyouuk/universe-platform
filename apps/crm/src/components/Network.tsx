"use client";
import { useEffect, useState } from "react";
import { CRM_NETWORK_FLOOR, type CrmNetworkOrganisation, type CrmNetworkPanel } from "@universe/types";
import { Button, Pill, CollapsibleSection } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, humanise, inputStyle } from "../lib/ui";
import { SourceNote } from "./SourceNote";

const box = { border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, background: "var(--u-surface)" } as const;

/** What the wider Universe network knows about this stakeholder: anonymised shared counts, plus identity and tender history only where published. */
export function Network({ relId }: { relId: string }) {
  const [p, setP] = useState<CrmNetworkPanel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setP(null); apiClient.crmNetwork(relId).then(setP).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the Universe network.")); }, [relId]);
  if (err) return <ErrorNote message={err} />;
  if (!p) return <p style={{ margin: 0 }}>Loading the Universe network…</p>;
  if (!p.linked) return <p style={{ margin: 0 }}>This stakeholder is not yet matched to the shared Universe registry, so there is nothing to show from other organisations.</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <CollapsibleSection title="Across Universe (anonymous)" level={2} bare>
        <SourceNote keys={["network"]} />
        {p.belowFloor
          ? <p style={{ margin: 0 }}>Fewer than {CRM_NETWORK_FLOOR} other organisations hold this stakeholder, so no figure is shown. This protects who they are.</p>
          : <>
              <p style={{ margin: "0 0 8px" }}><strong>{p.otherOrganisations}</strong> other organisations in Universe hold this stakeholder.</p>
              {p.roles.length > 0 && <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: 8, flexWrap: "wrap" }}>{p.roles.map((r) => <li key={r.roleType}><Pill tone="neutral">{humanise(r.roleType)}: {r.count}</Pill></li>)}</ul>}
            </>}
      </CollapsibleSection>
      {p.identityPublic && p.organization
        ? <CollapsibleSection title="Published Universe profile" level={2} bare>
            <p style={{ margin: "0 0 4px" }}><strong>{p.organization.name}</strong> · {humanise(p.organization.type)}{p.organization.countryCode ? ` · ${p.organization.countryCode}` : ""}</p>
            {p.organization.description && <p style={{ margin: "0 0 4px" }}>{p.organization.description}</p>}
            {p.organization.website && <p style={{ margin: 0 }}>{p.organization.website}</p>}
          </CollapsibleSection>
        : <section style={box} aria-label="Identity"><p style={{ margin: 0 }}>This stakeholder has not published a Universe profile, so nothing that identifies them is shared from other organisations.</p></section>}
      {p.tenders && (
        <CollapsibleSection title="Tender history" level={2} bare>
          <p style={{ margin: "0 0 6px" }}>Bids to your tenders: <strong>{p.tenders.yourBids}</strong>. Awarded by you: <strong>{p.tenders.yourAwards.length}</strong>.{p.tenders.universeBids !== null && <> Across Universe: {p.tenders.universeBids} bids, {p.tenders.universeAwards ?? "fewer than 5"} awards.</>}</p>
          {p.tenders.yourAwards.length > 0 && <ul style={{ margin: 0, paddingLeft: 18 }}>{p.tenders.yourAwards.map((a) => <li key={a.tenderId}>{a.reference} {a.title} ({fmtDate(a.awardedAt)})</li>)}</ul>}
        </CollapsibleSection>
      )}
    </div>
  );
}

/** Find a published Universe organisation and add it as a stakeholder. */
export function AddFromUniverse({ onAdded, onError }: { onAdded: (msg: string, relId: string, name: string) => void; onError: (m: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<CrmNetworkOrganisation[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => { apiClient.crmNetworkSearch(q.trim()).then(setRes).catch(() => setRes([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const add = async (o: CrmNetworkOrganisation) => {
    setBusy(true); onError(null);
    try { const r = await apiClient.crmAddFromOrganisation(o.organizationId); onAdded(r.created ? `${o.name} added from Universe.` : `${o.name} is already in your relationships.`, r.relationshipId, o.name); setOpen(false); setQ(""); }
    catch (e) { onError(e instanceof Error ? e.message : "Could not add that organisation."); } finally { setBusy(false); }
  };
  if (!open) return <div><Button variant="secondary" onClick={() => setOpen(true)}>Add from Universe</Button></div>;
  return (
    <div style={{ ...box, maxWidth: 520 }}>
      <Field label="Find a Universe organisation" hint="Only organisations that have published a profile can be found.">
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <ul style={{ listStyle: "none", margin: "8px 0", padding: 0, display: "grid", gap: 6 }}>
        {res.map((o) => (
          <li key={o.organizationId} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span>{o.name} <span style={{ color: "var(--u-ink-secondary)" }}>· {humanise(o.type)}{o.countryCode ? ` · ${o.countryCode}` : ""}</span></span>
            <Button size="sm" disabled={busy} onClick={() => add(o)}>{o.trackedRelationshipId ? "Open" : "Add"}</Button>
          </li>
        ))}
        {q.trim().length >= 2 && res.length === 0 && <li>No published organisation matches.</li>}
      </ul>
      <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
    </div>
  );
}
