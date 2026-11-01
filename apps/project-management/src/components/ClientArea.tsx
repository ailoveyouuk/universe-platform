"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientComplaintDetail, ClientComplaintItem } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const box: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: 10, padding: 18, background: "var(--u-surface)" };
const input: React.CSSProperties = { display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid var(--u-border)", borderRadius: 6, font: "inherit", background: "var(--u-surface)", color: "var(--u-ink)" };
const muted: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)", fontSize: 13.5 };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const STATUS: Record<string, string> = { LOGGED: "Received", ACKNOWLEDGED: "Acknowledged", TRIAGED: "Being assessed", INVESTIGATING: "Being investigated", RESOLVED: "Resolved", CLOSED: "Closed", ON_HOLD: "On hold", WITHDRAWN: "Withdrawn" };

/** What a quality client login sees (2026-11-01): their own complaints, a form to log a new one, and a way to add a message. Nothing else. */
export function ClientArea({ name }: { name: string }) {
  const [items, setItems] = useState<ClientComplaintItem[] | null>(null);
  const [open, setOpen] = useState<ClientComplaintDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => { apiClient.clientComplaints().then(setItems).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your complaints.")); }, []);
  useEffect(() => { load(); }, [load]);

  const show = async (id: string) => { setErr(null); try { setOpen(await apiClient.clientComplaint(id)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open it."); } };
  const submit = async () => {
    setErr(null); setOk(null);
    try { const r = await apiClient.clientLogComplaint({ title, description: desc, urgentSafety: urgent }); setOk(`Thank you. Your complaint is ${r.referenceNumber}. We will acknowledge it shortly.`); setAdding(false); setTitle(""); setDesc(""); setUrgent(false); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not send it."); }
  };
  const send = async () => {
    if (!open) return; setErr(null);
    try { await apiClient.clientMessage(open.id, msg); setMsg(""); await show(open.id); } catch (e) { setErr(e instanceof Error ? e.message : "Could not send it."); }
  };

  return (
    <div style={{ display: "grid", gap: 14, padding: "24px 28px 40px", maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24 }}>Your complaints</h1>
      <p style={muted}>Signed in for {name}. Here you can see the complaints you have raised with us, follow what is happening, add a message, or tell us about a new problem.</p>
      {err && <p role="alert" style={{ color: "var(--u-status-critical-text)", fontSize: 13, margin: 0 }}>{err}</p>}
      {ok && <p role="status" style={{ color: "var(--u-status-good-text)", fontSize: 13, margin: 0 }}>{ok}</p>}

      {!open && (
        <>
          {!adding ? <div><Button onClick={() => { setAdding(true); setOk(null); }}>Raise a new complaint</Button></div> : (
            <div style={{ ...box, display: "grid", gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Short title<input style={input} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} /></label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>What happened?<textarea style={{ ...input, minHeight: 120 }} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
              <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />This may affect patient safety, or the product may not be genuine (we treat these first)</label>
              <div style={{ display: "flex", gap: 8 }}><Button disabled={!title.trim() || !desc.trim()} onClick={submit}>Send complaint</Button><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button></div>
            </div>
          )}
          {items === null ? <p style={muted}>Loading…</p> : items.length === 0 ? <p style={muted}>You have not raised any complaints yet.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {items.map((c) => (
                <li key={c.id} style={{ ...box, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div><strong>{c.referenceNumber}</strong> · {c.title}<p style={muted}>Received {fmt(c.receivedAt)}</p></div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Pill tone="neutral">{STATUS[c.status] ?? c.status}</Pill><Button size="sm" variant="secondary" onClick={() => show(c.id)}>Open</Button></div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {open && (
        <div style={{ ...box, display: "grid", gap: 12 }}>
          <div><Button size="sm" variant="secondary" onClick={() => { setOpen(null); load(); }}>Back to your complaints</Button></div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{open.referenceNumber} · {open.title}</h2>
          <p style={muted}>Status: {STATUS[open.status] ?? open.status}. Received {fmt(open.receivedAt)}{open.acknowledgedAt ? `, acknowledged ${fmt(open.acknowledgedAt)}` : ""}{open.closedAt ? `, closed ${fmt(open.closedAt)}` : ""}.</p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14 }}>{open.description}</p>
          {open.responseSummary && <div><strong>Our response</strong><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>{open.responseSummary}</p></div>}
          <h3 style={{ margin: "6px 0 0", fontSize: 15 }}>What has happened</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {open.events.map((e) => (
              <li key={e.id} style={{ fontSize: 13.5 }}><span style={{ color: "var(--u-ink-secondary)" }}>{fmt(e.at)}</span> · {e.summary}{e.body && <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{e.body}</p>}</li>
            ))}
          </ul>
          {open.status !== "CLOSED" && open.status !== "WITHDRAWN" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Add a message<textarea style={{ ...input, minHeight: 90 }} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
              <div><Button disabled={!msg.trim()} onClick={send}>Send message</Button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
