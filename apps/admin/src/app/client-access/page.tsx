"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientUserRow, PartnerOption } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Field, Notice, Section, inputStyle } from "../../components/form";

const muted: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)", fontSize: 13.5 };

/**
 * Quality client logins (2026-11-01). A client contact is invited against one stakeholder (the client). They sign in to the Project Management
 * address and see only that client's complaints: they can follow them, add messages and raise new ones. Nothing else on the platform is open to them.
 */
export default function ClientAccessPage() {
  const me = useCurrentUser();
  const allowed = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("org.users.manage"));
  const [rows, setRows] = useState<ClientUserRow[] | null>(null);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [forename, setForename] = useState("");
  const [surname, setSurname] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const load = useCallback(() => {
    apiClient.clientUsers().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
    apiClient.listPartnerOptions().then(setPartners).catch(() => setPartners([]));
  }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (me && !allowed) return <div style={{ padding: "8px clamp(14px, 4vw, 32px) 32px" }}><h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24 }}>Client logins</h1><p style={muted}>Client logins are managed by organisation administrators.</p></div>;

  const invite = async () => {
    setErr(null); setOk(null);
    try { await apiClient.clientInvite({ email, forename, surname, partnerId }); setOk(`${forename} ${surname} can now sign in with ${email}.`); setEmail(""); setForename(""); setSurname(""); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not add them."); }
  };

  return (
    <div style={{ display: "grid", gap: 4, padding: "8px clamp(14px, 4vw, 32px) 32px" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24 }}>Client logins</h1>
      <p style={muted}>Give a client contact a login to follow and raise their own quality complaints. They see only complaints from their own client, and nothing else. To remove access, archive the person on the Users page.</p>
      {err && <Notice tone="error">{err}</Notice>}
      {ok && <Notice tone="success">{ok}</Notice>}
      <Section title="Add a client login" defaultOpen>
        <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
          <Field label="Client (stakeholder)">
            <select style={inputStyle} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="">Choose a client</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="First name"><input style={inputStyle} value={forename} onChange={(e) => setForename(e.target.value)} /></Field>
          <Field label="Last name"><input style={inputStyle} value={surname} onChange={(e) => setSurname(e.target.value)} /></Field>
          <Field label="Email address" hint="They sign in with this Microsoft account or email."><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <div><Button disabled={!partnerId || !email.trim() || !forename.trim() || !surname.trim()} onClick={invite}>Add client login</Button></div>
        </div>
      </Section>
      <Section title="Current client logins" defaultOpen>
        {rows === null ? <p style={muted}>Loading…</p> : rows.length === 0 ? <p style={muted}>No client logins yet.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {rows.map((r) => <li key={r.id} style={{ fontSize: 13.5 }}><strong>{r.name}</strong> ({r.email}) for {r.partnerName ?? "a client"} <Pill tone={r.status === "ACTIVE" ? "good" : "neutral"}>{r.status === "INVITED" ? "Invited" : r.status === "ACTIVE" ? "Active" : r.status}</Pill></li>)}
          </ul>
        )}
      </Section>
    </div>
  );
}
