"use client";

import { useEffect, useState } from "react";
import { MINI_PANEL_MAX, MINI_PANEL_MIN, type MiniCompetitionView, type MiniPanelProgress, type MiniPanelView, type QuoteManualKey, type QuoteScheme, type UserOption } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
export const MANUAL_NAME: Record<QuoteManualKey, string> = { quality: "Quality", examples: "Similar contracts", references: "References" };
const SCALE = ["Unacceptable", "Weak", "Below expectations", "Meets expectations", "Good", "Excellent"];

/** Names the evaluation panel and shows who has declared a conflict of interest. Panels are optional: without one, the owner scores as before. */
export function PanelBox({ m, act, busy }: { m: MiniCompetitionView; act: (fn: () => Promise<unknown>) => Promise<void>; busy: boolean }) {
  const p = m.panel;
  const [people, setPeople] = useState<UserOption[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(p?.members.map((x) => x.userId) ?? []);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  useEffect(() => { if (editing && !people) apiClient.listUserOptions(undefined, true).then(setPeople).catch(() => setPeople([])); }, [editing, people]);
  if (!m.scheme || !p) return null;
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MINI_PANEL_MAX ? [...c, id] : c));
  return (
    <div style={{ margin: "8px 0", padding: 10, border: "1px solid var(--u-border)", borderRadius: 8, fontSize: 13.5 }}>
      <strong>Evaluation panel</strong>
      {p.members.length === 0 ? <div style={muted}>No panel: you score each quote yourself. Name {MINI_PANEL_MIN} to {MINI_PANEL_MAX} evaluators if you want independent scoring that you then moderate.</div> : (
        <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
          {p.members.map((x) => <li key={x.userId}>{x.name} <Pill tone={x.coi === "NONE" ? "good" : x.coi === "CONFLICT" ? "critical" : "warning"}>{x.coi === "NONE" ? "no conflict" : x.coi === "CONFLICT" ? "conflict declared" : "has not declared"}</Pill>{x.coi === "CONFLICT" && x.coiNotes ? <span style={muted}> {x.coiNotes}</span> : null}</li>)}
        </ul>
      )}
      {p.me.isMember && p.me.coi === "PENDING" && (
        <div style={{ display: "grid", gap: 6, margin: "6px 0" }}>
          <div>Before you can score, declare whether you have a conflict of interest with any invited supplier.</div>
          <input aria-label="Describe the conflict, if any" style={inputStyle} placeholder="If you have a conflict, say what it is" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.declareMiniConflict(m.id, true))}>I have no conflict</Button>
            <Button size="sm" variant="secondary" disabled={busy || notes.trim().length < 5} onClick={() => act(() => apiClient.declareMiniConflict(m.id, false, notes))}>I have a conflict</Button>
          </span>
        </div>
      )}
      {p.canEditPanel && !editing && <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>{p.members.length ? "Change the panel" : "Name a panel"}</Button>}
      {p.canEditPanel && editing && (
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          <div style={muted}>Choose {MINI_PANEL_MIN} to {MINI_PANEL_MAX} people from your organisation. The panel is locked once scoring starts.</div>
          {!people && <span style={muted}>Loading people…</span>}
          <div style={{ display: "grid", gap: 2, maxHeight: 220, overflow: "auto" }}>
            {people?.map((u) => <label key={u.id}><input type="checkbox" checked={chosen.includes(u.id)} onChange={() => toggle(u.id)} /> {u.forename} {u.surname}</label>)}
          </div>
          <span style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" disabled={busy || chosen.length < MINI_PANEL_MIN} onClick={() => act(async () => { await apiClient.setMiniPanel(m.id, chosen); setEditing(false); })}>Save panel</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </span>
        </div>
      )}
    </div>
  );
}

/** One judged criterion in panel mode: your own score, how many have scored, and (for the owner) moderation once everyone has. */
export function PanelCriterion({ k, scheme, panel, quoteId, progress, canModerate, busy, act }: { k: QuoteManualKey; scheme: QuoteScheme; panel: MiniPanelView; quoteId: string; progress: MiniPanelProgress | undefined; canModerate: boolean; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const mine = panel.mine[quoteId]?.[k];
  const [score, setScore] = useState(mine ? String(mine.score) : "");
  const [reason, setReason] = useState(mine?.reason ?? "");
  const [agreed, setAgreed] = useState(""); const [why, setWhy] = useState("");
  const canScore = panel.me.isMember && panel.me.coi === "NONE" && !progress?.moderated;
  const complete = !!progress && progress.of >= 2 && progress.scored >= progress.of;
  const wide = (progress?.spread ?? 0) > 1;
  return (
    <div style={{ padding: "6px 0", borderTop: "1px dotted var(--u-border)" }}>
      <strong>{MANUAL_NAME[k]} ({scheme.weights[k]}%)</strong>{" "}
      {progress ? <span style={muted}>{progress.scored} of {progress.of} evaluators have scored{progress.moderated ? ", agreed" : ""}</span> : <span style={muted}>not scored yet</span>}
      {canScore && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
          <select aria-label={`Your score for ${MANUAL_NAME[k]}`} style={{ ...inputStyle, width: 190 }} value={score} onChange={(e) => setScore(e.target.value)}>
            <option value="">Your score 0 to 5…</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}: {SCALE[n]}</option>)}
          </select>
          <input aria-label={`Your reason for the ${MANUAL_NAME[k]} score`} style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Your reason (kept on the record)" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={busy || score === "" || reason.trim().length < 5} onClick={() => act(() => apiClient.panelScoreMiniQuote(quoteId, { criterion: k, score: Number(score), reason }))}>{mine ? "Update my score" : "Save my score"}</Button>
        </div>
      )}
      {progress?.scores && (
        <ul style={{ margin: "2px 0", paddingLeft: 18 }}>{progress.scores.map((s) => <li key={s.evaluator}>{s.evaluator}: {s.score} of 5. {s.reason}</li>)}</ul>
      )}
      {complete && !progress.moderated && canModerate && (
        <div style={{ display: "grid", gap: 6, padding: "4px 0" }}>
          {!wide ? (
            <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>Scores are within 1 point. Average: <strong>{progress.average}</strong>.</span>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.moderateMiniQuote(quoteId, { criterion: k }))}>Agree the average</Button>
            </span>
          ) : <span>Scores differ by {progress.spread} points. Agree a score with the panel and record why.</span>}
          <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select aria-label={`Agreed score for ${MANUAL_NAME[k]}`} style={{ ...inputStyle, width: 150 }} value={agreed} onChange={(e) => setAgreed(e.target.value)}>
              <option value="">Agreed score…</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input aria-label={`Why this score was agreed for ${MANUAL_NAME[k]}`} style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Why this score was agreed (at least a sentence)" maxLength={1000} value={why} onChange={(e) => setWhy(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={busy || agreed === "" || why.trim().length < 20} onClick={() => act(() => apiClient.moderateMiniQuote(quoteId, { criterion: k, score: Number(agreed), reason: why }))}>Agree this score</Button>
          </span>
        </div>
      )}
    </div>
  );
}
