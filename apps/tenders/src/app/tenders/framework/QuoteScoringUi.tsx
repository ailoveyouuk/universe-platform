"use client";

import { useState } from "react";
import { QUOTE_WEIGHT_KEYS, QUOTE_WEIGHT_LABEL, type QuoteManualKey, type QuoteRanking, type QuoteResponses, type QuoteScheme, type QuoteScores } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { Field, inputStyle } from "../../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const fieldRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 } as const;

export const emptyScheme = (): QuoteScheme => ({ weights: { price: 50, leadTime: 0, quality: 50, desirable: 0, examples: 0, references: 0 }, requirements: [], minExamples: 0, exampleYears: 3, minReferences: 0, qualityBrief: null });

const weightTotal = (s: QuoteScheme) => QUOTE_WEIGHT_KEYS.reduce((a, k) => a + (Number(s.weights[k]) || 0), 0);

/** Problems the issuer can fix on the form; the server checks again. */
export function schemeFormProblems(s: QuoteScheme): string[] {
  const out: string[] = [];
  if (Math.abs(weightTotal(s) - 100) > 0.01) out.push(`Weights total ${weightTotal(s)}; they must total 100.`);
  if (s.requirements.some((r) => !r.title.trim())) out.push("Every requirement needs a title.");
  if (s.weights.desirable > 0 && !s.requirements.some((r) => !r.mandatory)) out.push("Add a desirable requirement, or set its weight to 0.");
  if (s.weights.examples > 0 && s.minExamples < 1) out.push("Require at least one similar contract, or set its weight to 0.");
  if (s.weights.references > 0 && s.minReferences < 1) out.push("Require at least one reference, or set its weight to 0.");
  return out;
}

/** Issuer: set how quotes will be judged. Fixed once the competition opens, and shown to every invited supplier. */
export function SchemeEditor({ scheme, onChange }: { scheme: QuoteScheme; onChange: (s: QuoteScheme) => void }) {
  const set = (p: Partial<QuoteScheme>) => onChange({ ...scheme, ...p });
  const total = weightTotal(scheme);
  const problems = schemeFormProblems(scheme);
  return (
    <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 12, marginTop: 12 }}>
      <legend style={{ padding: "0 6px", fontWeight: 600 }}>How quotes will be judged</legend>
      <p style={{ marginTop: 0, fontSize: 13, ...muted }}>Set the share of the score each criterion carries (percentages; 0 switches one off). Suppliers see this before they quote and it cannot be changed once the competition opens.</p>
      <div style={fieldRow}>
        {QUOTE_WEIGHT_KEYS.map((k) => (
          <Field key={k} label={`${QUOTE_WEIGHT_LABEL[k]} (%)`}>
            <input type="number" min={0} max={100} step="1" style={inputStyle} value={scheme.weights[k]} onChange={(e) => set({ weights: { ...scheme.weights, [k]: Number(e.target.value) } })} />
          </Field>))}
      </div>
      <div role="status" style={{ marginTop: 6, fontSize: 13, color: Math.abs(total - 100) > 0.01 ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)" }}>Total: {total}%{Math.abs(total - 100) > 0.01 ? " (must be 100)" : ""}</div>
      <p style={{ fontSize: 12.5, ...muted }}>Price and lead time are calculated (the best eligible quote scores 100, the others in proportion). Quality, similar contracts and references are scored by you from 0 to 5 with a written reason. Desirable requirements are scored by the share the supplier meets.</p>

      <div style={{ marginTop: 8 }}>
        <strong style={{ fontSize: 13.5 }}>Requirements</strong>
        <div style={{ fontSize: 12.5, ...muted }}>Mandatory is pass/fail: a supplier that does not meet one is excluded. Desirable ones are scored.</div>
        {scheme.requirements.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
            <input aria-label={`Requirement ${i + 1}`} style={{ ...inputStyle, flex: 1, minWidth: 220 }} value={r.title} maxLength={300} onChange={(e) => set({ requirements: scheme.requirements.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={r.mandatory} onChange={(e) => set({ requirements: scheme.requirements.map((x, j) => (j === i ? { ...x, mandatory: e.target.checked } : x)) })} /> Mandatory</label>
            <Button size="sm" variant="secondary" onClick={() => set({ requirements: scheme.requirements.filter((_, j) => j !== i) })}>Remove requirement {i + 1}</Button>
          </div>))}
        <Button size="sm" variant="secondary" onClick={() => set({ requirements: [...scheme.requirements, { key: "", title: "", mandatory: true }] })}>Add a requirement</Button>
      </div>

      <div style={{ ...fieldRow, marginTop: 10 }}>
        <Field label="Similar contracts required (0 to 5)"><input type="number" min={0} max={5} style={inputStyle} value={scheme.minExamples} onChange={(e) => set({ minExamples: Number(e.target.value) })} /></Field>
        <Field label="Completed within the last (years)"><input type="number" min={1} max={10} style={inputStyle} value={scheme.exampleYears} onChange={(e) => set({ exampleYears: Number(e.target.value) })} /></Field>
        <Field label="References required (0 to 5)"><input type="number" min={0} max={5} style={inputStyle} value={scheme.minReferences} onChange={(e) => set({ minReferences: Number(e.target.value) })} /></Field>
      </div>
      <Field label="What you will look for when scoring quality (shown to suppliers)">
        <textarea style={{ ...inputStyle, minHeight: 70 }} maxLength={1500} value={scheme.qualityBrief ?? ""} onChange={(e) => set({ qualityBrief: e.target.value || null })} />
      </Field>
      {problems.length > 0 && <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--u-status-critical-text)" }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
    </fieldset>
  );
}

/** Plain-language summary of a scheme, for suppliers and for the issuer's records. */
export function SchemeSummary({ scheme }: { scheme: QuoteScheme }) {
  const on = QUOTE_WEIGHT_KEYS.filter((k) => scheme.weights[k] > 0);
  return (
    <div style={{ fontSize: 13, margin: "6px 0" }}>
      <strong>Judged on:</strong> {on.map((k) => `${QUOTE_WEIGHT_LABEL[k]} ${scheme.weights[k]}%`).join(" · ")}
      {scheme.requirements.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{scheme.requirements.map((r) => <li key={r.key}>{r.title} <Pill tone={r.mandatory ? "warning" : "neutral"}>{r.mandatory ? "mandatory" : "desirable"}</Pill></li>)}</ul>}
      {(scheme.minExamples > 0 || scheme.minReferences > 0) && <div style={muted}>Required: {scheme.minExamples > 0 ? `${scheme.minExamples} similar contract${scheme.minExamples === 1 ? "" : "s"} completed in the last ${scheme.exampleYears} years` : ""}{scheme.minExamples > 0 && scheme.minReferences > 0 ? "; " : ""}{scheme.minReferences > 0 ? `${scheme.minReferences} reference${scheme.minReferences === 1 ? "" : "s"} we may contact` : ""}</div>}
      {scheme.qualityBrief && <div style={muted}>Quality: {scheme.qualityBrief}</div>}
    </div>
  );
}

const blankExample = () => ({ title: "", client: "", valueText: null as string | null, startedOn: "", completedOn: "", scope: "" });
const blankRef = () => ({ forename: "", surname: "", organisation: "", role: null as string | null, email: "", phone: "", relationship: "", contactable: true });

export type ResponsesDraft = { requirements: Record<string, { met: boolean; note: string | null }>; examples: QuoteResponses["examples"]; references: QuoteResponses["references"] };
export const draftFrom = (scheme: QuoteScheme, r: QuoteResponses | null): ResponsesDraft => ({
  requirements: Object.fromEntries(scheme.requirements.map((q) => [q.key, r?.requirements[q.key] ?? { met: false, note: null }])),
  examples: r?.examples?.length ? r.examples : Array.from({ length: scheme.minExamples }, blankExample),
  references: r?.references?.length ? r.references : Array.from({ length: scheme.minReferences }, blankRef),
});

/** Supplier: answer the issuer's requirements and give similar contracts and references. */
export function ResponsesForm({ scheme, draft, onChange }: { scheme: QuoteScheme; draft: ResponsesDraft; onChange: (d: ResponsesDraft) => void }) {
  const ex = (i: number, p: Partial<ResponsesDraft["examples"][number]>) => onChange({ ...draft, examples: draft.examples.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const rf = (i: number, p: Partial<ResponsesDraft["references"][number]>) => onChange({ ...draft, references: draft.references.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div style={{ marginTop: 8 }}>
      {scheme.requirements.length > 0 && (
        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 10 }}>
          <legend style={{ padding: "0 6px", fontWeight: 600 }}>Requirements</legend>
          {scheme.requirements.map((q) => (
            <div key={q.key} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "3px 0" }}>
              <label style={{ flex: 1, minWidth: 220 }}><input type="checkbox" checked={draft.requirements[q.key]?.met ?? false} onChange={(e) => onChange({ ...draft, requirements: { ...draft.requirements, [q.key]: { met: e.target.checked, note: draft.requirements[q.key]?.note ?? null } } })} /> We meet this: {q.title} <Pill tone={q.mandatory ? "warning" : "neutral"}>{q.mandatory ? "mandatory" : "desirable"}</Pill></label>
              <input aria-label={`Evidence or note for: ${q.title}`} style={{ ...inputStyle, width: 240 }} placeholder="Evidence or note (optional)" maxLength={500} value={draft.requirements[q.key]?.note ?? ""} onChange={(e) => onChange({ ...draft, requirements: { ...draft.requirements, [q.key]: { met: draft.requirements[q.key]?.met ?? false, note: e.target.value || null } } })} />
            </div>))}
        </fieldset>)}
      {scheme.minExamples > 0 && (
        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 10, marginTop: 8 }}>
          <legend style={{ padding: "0 6px", fontWeight: 600 }}>Similar contracts completed in the last {scheme.exampleYears} years (at least {scheme.minExamples})</legend>
          {draft.examples.map((e, i) => (
            <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px dotted var(--u-border)" : undefined }}>
              <div style={fieldRow}>
                <Field label={`Contract ${i + 1}: title`}><input style={inputStyle} maxLength={200} value={e.title} onChange={(x) => ex(i, { title: x.target.value })} /></Field>
                <Field label={`Contract ${i + 1}: client`}><input style={inputStyle} maxLength={200} value={e.client} onChange={(x) => ex(i, { client: x.target.value })} /></Field>
                <Field label={`Contract ${i + 1}: value (optional)`}><input style={inputStyle} maxLength={100} value={e.valueText ?? ""} onChange={(x) => ex(i, { valueText: x.target.value || null })} /></Field>
                <Field label={`Contract ${i + 1}: started`}><input type="date" style={inputStyle} value={e.startedOn} onChange={(x) => ex(i, { startedOn: x.target.value })} /></Field>
                <Field label={`Contract ${i + 1}: completed`}><input type="date" style={inputStyle} value={e.completedOn} onChange={(x) => ex(i, { completedOn: x.target.value })} /></Field>
              </div>
              <Field label={`Contract ${i + 1}: what you did and why it is similar`}><textarea style={{ ...inputStyle, minHeight: 56 }} maxLength={1500} value={e.scope} onChange={(x) => ex(i, { scope: x.target.value })} /></Field>
            </div>))}
          {draft.examples.length < 5 && <Button size="sm" variant="secondary" onClick={() => onChange({ ...draft, examples: [...draft.examples, blankExample()] })}>Add another contract</Button>}
        </fieldset>)}
      {scheme.minReferences > 0 && (
        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 10, marginTop: 8 }}>
          <legend style={{ padding: "0 6px", fontWeight: 600 }}>References (at least {scheme.minReferences})</legend>
          {draft.references.map((r, i) => (
            <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px dotted var(--u-border)" : undefined }}>
              <div style={fieldRow}>
                <Field label={`Reference ${i + 1}: forename`}><input style={inputStyle} maxLength={100} value={r.forename} onChange={(x) => rf(i, { forename: x.target.value })} /></Field>
                <Field label={`Reference ${i + 1}: surname`}><input style={inputStyle} maxLength={100} value={r.surname} onChange={(x) => rf(i, { surname: x.target.value })} /></Field>
                <Field label={`Reference ${i + 1}: organisation`}><input style={inputStyle} maxLength={200} value={r.organisation} onChange={(x) => rf(i, { organisation: x.target.value })} /></Field>
                <Field label={`Reference ${i + 1}: job title (optional)`}><input style={inputStyle} maxLength={100} value={r.role ?? ""} onChange={(x) => rf(i, { role: x.target.value || null })} /></Field>
                <Field label={`Reference ${i + 1}: email`}><input type="email" style={inputStyle} maxLength={200} value={r.email} onChange={(x) => rf(i, { email: x.target.value })} /></Field>
                <Field label={`Reference ${i + 1}: phone`}><input type="tel" style={inputStyle} maxLength={40} value={r.phone} onChange={(x) => rf(i, { phone: x.target.value })} /></Field>
              </div>
              <Field label={`Reference ${i + 1}: relationship to your work`}><input style={inputStyle} maxLength={300} value={r.relationship} onChange={(x) => rf(i, { relationship: x.target.value })} /></Field>
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={r.contactable} onChange={(x) => rf(i, { contactable: x.target.checked })} /> The buyer may contact this person</label>
            </div>))}
          {draft.references.length < 5 && <Button size="sm" variant="secondary" onClick={() => onChange({ ...draft, references: [...draft.references, blankRef()] })}>Add another reference</Button>}
        </fieldset>)}
    </div>
  );
}

const SCALE: Record<number, string> = { 0: "Not met or no evidence", 1: "Poor", 2: "Weak", 3: "Acceptable", 4: "Good", 5: "Excellent" };
const MANUAL_LABEL: Record<QuoteManualKey, string> = { quality: "Quality of approach", examples: "Similar contracts", references: "References" };

/** Issuer: one quote's answers, calculated scores and judged scores. */
export function QuoteAssessment({ scheme, responses, scores, ranking, canScore, onScore, busy }: { scheme: QuoteScheme; responses: QuoteResponses | null; scores: QuoteScores | null; ranking: QuoteRanking | null; canScore: boolean; onScore: (criterion: QuoteManualKey, score: number, reason: string) => void; busy: boolean }) {
  const [draft, setDraft] = useState<Partial<Record<QuoteManualKey, { score: string; reason: string }>>>({});
  return (
    <div style={{ marginTop: 4, fontSize: 13 }}>
      {ranking && <div>{ranking.eligible ? <Pill tone="good">meets pass/fail</Pill> : <Pill tone="critical">excluded</Pill>} {ranking.rank != null && <strong>Rank {ranking.rank}</strong>} {ranking.total != null && <span>score {ranking.total} of 100</span>} <span style={muted}>{ranking.price != null ? `price ${ranking.price}` : ""}{ranking.leadTime != null ? ` · lead time ${ranking.leadTime}` : ""}{ranking.desirable != null ? ` · desirable ${ranking.desirable}` : ""}</span></div>}
      {ranking && ranking.problems.length > 0 && <ul style={{ margin: "2px 0", paddingLeft: 18 }}>{ranking.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {responses && responses.requirements && scheme.requirements.length > 0 && <div style={muted}>{scheme.requirements.map((q) => `${responses.requirements[q.key]?.met ? "✓" : "✗"} ${q.title}${responses.requirements[q.key]?.note ? ` (${responses.requirements[q.key]?.note})` : ""}`).join(" · ")}</div>}
      {responses?.examples.map((e, i) => <div key={`e${i}`} style={muted}>Contract {i + 1}: {e.title}, {e.client}{e.valueText ? `, ${e.valueText}` : ""}, {e.startedOn} to {e.completedOn}. {e.scope}</div>)}
      {responses?.references.map((r, i) => <div key={`r${i}`} style={muted}>Reference {i + 1}: {r.forename} {r.surname}{r.role ? `, ${r.role}` : ""}, {r.organisation}. {r.email}, {r.phone}. {r.relationship}{r.contactable ? "" : " (not to be contacted)"}</div>)}
      {ranking?.eligible && (["quality", "examples", "references"] as QuoteManualKey[]).filter((k) => scheme.weights[k] > 0).map((k) => {
        const saved = scores?.[k]; const d = draft[k] ?? { score: saved ? String(saved.score) : "", reason: saved?.reason ?? "" };
        return (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
            <strong style={{ minWidth: 150 }}>{MANUAL_LABEL[k]} ({scheme.weights[k]}%)</strong>
            {canScore ? <>
              <select aria-label={`Score for ${MANUAL_LABEL[k]}`} style={{ ...inputStyle, width: 190 }} value={d.score} onChange={(e) => setDraft((p) => ({ ...p, [k]: { ...d, score: e.target.value } }))}>
                <option value="">Score 0 to 5…</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}: {SCALE[n]}</option>)}
              </select>
              <input aria-label={`Reason for ${MANUAL_LABEL[k]} score`} style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Reason (kept on the record)" maxLength={1000} value={d.reason} onChange={(e) => setDraft((p) => ({ ...p, [k]: { ...d, reason: e.target.value } }))} />
              <Button size="sm" variant="secondary" disabled={busy || d.score === "" || d.reason.trim().length < 5} onClick={() => onScore(k, Number(d.score), d.reason)}>{saved ? "Update score" : "Save score"}</Button>
            </> : <span style={muted}>{saved ? `${saved.score} of 5: ${saved.reason}` : "not scored"}</span>}
          </div>);
      })}
    </div>
  );
}
