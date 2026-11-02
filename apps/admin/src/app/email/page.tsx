"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmailPersonMatch, EmailRulesView } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Field, Notice, Section, inputStyle } from "../../components/form";

const muted: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)", fontSize: 13.5 };

/**
 * Email (2026-11-01, Lewis: configurable by the approved user). For each type of event the organisation chooses who is emailed: a registered
 * user (search by name, job title or role; their address comes from their profile) and/or a typed address. Emails wait in a queue and are sent
 * once the platform's mail provider is set up.
 */
export default function EmailPage() {
  const me = useCurrentUser();
  const allowed = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("org.users.manage"));
  const [view, setView] = useState<EmailRulesView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<EmailPersonMatch[]>([]);
  const [address, setAddress] = useState("");
  const [preview, setPreview] = useState<{ key: string; subject: string; html: string } | null>(null);
  const load = useCallback(() => { apiClient.emailRules().then(setView).catch((e) => setErr(e instanceof Error ? e.message : "Could not load.")); }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);
  useEffect(() => {
    if (q.trim().length < 2) { setMatches([]); return; }
    const t = setTimeout(() => { apiClient.emailPeople(q).then(setMatches).catch(() => setMatches([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (me && !allowed) return <div style={{ padding: "8px clamp(14px, 4vw, 32px) 32px" }}><h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24 }}>Email</h1><p style={muted}>Email recipients are managed by organisation administrators.</p></div>;

  const add = async (eventKey: string, input: { userId?: string; address?: string }, done: string) => {
    setErr(null); setOk(null);
    try { await apiClient.emailAddRecipient({ eventKey, ...input }); setOk(done); setQ(""); setMatches([]); setAddress(""); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
  };
  const showPreview = async (key: string) => {
    setErr(null); setOk(null);
    try { const p = await apiClient.emailPreview(key); setPreview({ key, subject: p.subject, html: p.html }); } catch (e) { setErr(e instanceof Error ? e.message : "Could not load the preview."); }
  };
  const sendSample = async (key: string) => {
    setErr(null); setOk(null);
    try { const r = await apiClient.emailSample(key); setOk(`An example has been queued to ${r.to}. It arrives within a minute once sending is on.`); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not queue the example."); }
  };
  const remove = async (id: string) => {
    setErr(null); setOk(null);
    try { await apiClient.emailRemoveRecipient(id); setOk("Recipient removed."); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
  };

  return (
    <div style={{ display: "grid", gap: 4, padding: "8px clamp(14px, 4vw, 32px) 32px" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24 }}>Email</h1>
      <p style={muted}>Choose who is emailed for each type of event. Add a registered user (search by name, job title or role) and/or type an address, such as a shared mailbox.</p>
      {view && !view.configured && <Notice tone="info">Sending is not switched on yet, so emails are held in a queue ({view.queued} waiting). They go out once the platform&apos;s mail provider is set up.</Notice>}
      {view && view.configured && (view.queued > 0 || view.failed > 0) && <Notice tone="info">{view.queued} waiting to send{view.failed ? `, ${view.failed} could not be sent` : ""}.</Notice>}
      {err && <Notice tone="error">{err}</Notice>}
      {ok && <Notice tone="success">{ok}</Notice>}
      {view?.events.map((e) => (
        <Section key={e.key} title={e.label} defaultOpen={open === e.key || e.recipients.length > 0}>
          <p style={muted}>{e.description}</p>
          {e.recipients.length === 0 ? <p style={muted}>Nobody is emailed for this yet.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "grid", gap: 6 }}>
              {e.recipients.map((r) => (
                <li key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13.5 }}>
                  <span>{r.userName ? <><strong>{r.userName}</strong>{r.userJobTitle ? `, ${r.userJobTitle}` : ""} ({r.resolvedAddress})</> : r.address}</span>
                  <Button size="sm" variant="secondary" onClick={() => remove(r.id)}>Remove</Button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
            <Button size="sm" variant="secondary" onClick={() => showPreview(e.key)}>Preview email</Button>
            <Button size="sm" variant="secondary" onClick={() => sendSample(e.key)}>Send an example to me</Button>
          </div>
          {preview?.key === e.key && (
            <div style={{ margin: "8px 0" }}>
              <p style={muted}>Subject: <strong>{preview.subject}</strong></p>
              <iframe title={`Preview of the ${e.label} email`} sandbox="" srcDoc={preview.html} style={{ width: "100%", height: 520, border: "1px solid var(--u-border)", borderRadius: 8, background: "#fff" }} />
              <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>Close preview</Button>
            </div>
          )}
          {open !== e.key ? <Button size="sm" variant="secondary" onClick={() => { setOpen(e.key); setQ(""); setAddress(""); }}>Add recipient</Button> : (
            <div style={{ display: "grid", gap: 10, maxWidth: 520, marginTop: 8 }}>
              <Field label="Registered user" hint="Type at least two letters of a name, job title or role.">
                <input style={inputStyle} value={q} onChange={(ev) => setQ(ev.target.value)} />
              </Field>
              {matches.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                  {matches.map((m) => (
                    <li key={m.id}>
                      <Button size="sm" variant="secondary" onClick={() => add(e.key, { userId: m.id }, `${m.name} will be emailed.`)}>
                        {m.name}{m.jobTitle ? `, ${m.jobTitle}` : ""}{m.roles.length ? ` · ${m.roles.join(", ")}` : ""}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Field label="Or type an email address">
                <input style={inputStyle} type="email" value={address} onChange={(ev) => setAddress(ev.target.value)} />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" disabled={!address.trim()} onClick={() => add(e.key, { address }, "Address added.")}>Add address</Button>
                <Button size="sm" variant="secondary" onClick={() => setOpen(null)}>Close</Button>
              </div>
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}
