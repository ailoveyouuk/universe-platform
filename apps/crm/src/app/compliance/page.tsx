"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CURRENCY_OPTIONS, type CrmComplianceSummary, type CrmGiftPolicy, type CrmPeopleOption } from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, ClipboardCheckIcon, CurrencySelect, DocumentIcon, StatTile, StatTileGrid, UserIcon } from "@universe/ui";
import { DocButton, EvidenceField, HospitalityList } from "../../components/Hospitality";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { ErrorNote, Field, Heading, OkNote, Page, fmtDate, inputStyle } from "../../lib/ui";

/** Compliance: the organisation's own gifts and hospitality policy, what is waiting for approval, and the full register. */
function ComplianceInner() {
  const me = useCurrentUser();
  const focus = useSearchParams().get("id");
  const canManage = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const [sum, setSum] = useState<CrmComplianceSummary | null>(null);
  const [policy, setPolicy] = useState<CrmGiftPolicy | null>(null);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const refresh = useCallback(() => { apiClient.crmComplianceSummary().then(setSum).catch(() => undefined); apiClient.crmGiftPolicy().then(setPolicy).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the policy.")); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const cur = sum?.policyCurrency ?? "GBP";
  const fmt = (n: number | undefined) => (n === undefined ? undefined : `${Math.round(n).toLocaleString("en-GB")} ${cur}`);
  return (
    <Page>
      <Heading title="Compliance" sub="Gifts and hospitality given or received, held against your organisation's own policy. Anything above your thresholds, involving a public official, or a donation or sponsorship waits for a different person to approve it. Nothing is deleted; every change is in the audit log." />
      <ErrorNote message={err} />
      <OkNote message={ok} />
      <StatTileGrid>
        <StatTile label="Waiting for approval" value={sum?.pendingApproval} icon={<ClipboardCheckIcon size={18} />} tone={sum && sum.pendingApproval > 0 ? "warning" : "good"} />
        <StatTile label="For you to decide" value={sum?.awaitingMyDecision} icon={<UserIcon size={18} />} tone="brand" />
        <StatTile label="Records, last 12 months" value={sum?.recordsLast12Months} icon={<DocumentIcon size={18} />} tone="neutral" />
        <StatTile label="Public officials, last 12 months" value={sum?.publicOfficialLast12Months} icon={<AlertIcon size={18} />} tone="neutral" />
      </StatTileGrid>
      <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>Last 12 months in {cur}: given {fmt(sum?.givenLast12Months) ?? "…"}, received {fmt(sum?.receivedLast12Months) ?? "…"} (approved or awaiting approval).</p>

      <section aria-labelledby="policy-h" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h2 id="policy-h" style={{ margin: 0, fontSize: 16 }}>Your gifts and hospitality policy</h2>
          {canManage && !editing && <Button size="sm" variant="secondary" onClick={() => { setEditing(true); setOk(null); }}>{policy?.confirmed ? "Edit policy" : "Set your policy"}</Button>}
        </div>
        {policy && !editing && (
          <>
            {!policy.confirmed && <p role="status" style={{ margin: 0 }}>Your organisation has not set its own thresholds yet, so the defaults below apply. Thresholds are for you to set; they are not legal limits.</p>}
            {sum?.noPolicyDocument && <p style={{ margin: 0 }}>No policy document is attached. Attach the written policy so approvers and auditors can see what the thresholds are based on.</p>}
            {policy.reviewOverdue && <p role="alert" style={{ margin: 0, color: "var(--u-status-critical-text)" }}>The policy review date ({fmtDate(policy.policyReviewDue)}) has passed.</p>}
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              {[["Gift threshold", `${policy.giftThreshold.toLocaleString()} ${policy.currency}`], ["Hospitality threshold (per occasion)", `${policy.hospitalityThreshold.toLocaleString()} ${policy.currency}`], ["Yearly total with one stakeholder", `${policy.annualThreshold.toLocaleString()} ${policy.currency}`],
                ["Public officials", policy.alwaysApprovePublicOfficial ? "Always need approval" : "Treated like anyone else"], ["Who approves", policy.approvers.length ? policy.approvers.map((a) => a.name).join(", ") : "Anyone who manages the CRM, other than the person who recorded it"],
                ["Policy", policy.policyTitle ? `${policy.policyTitle}${policy.policyVersion ? ` (version ${policy.policyVersion})` : ""}` : "Not described"], ["In force from", fmtDate(policy.policyEffectiveFrom)], ["Next review", fmtDate(policy.policyReviewDue)]].map(([k, v]) => (
                <div key={k}><dt style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>
              ))}
            </dl>
            {policy.policyDocumentId && <div><DocButton docId={policy.policyDocumentId} label="Open the policy" /></div>}
            {policy.updatedAt && <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Last changed {fmtDate(policy.updatedAt)}{policy.updatedByName ? ` by ${policy.updatedByName}` : ""}. Changes apply to new records; existing records keep the decision made when they were saved.</p>}
          </>
        )}
        {policy && editing && <PolicyForm policy={policy} onCancel={() => setEditing(false)} onSaved={(p) => { setPolicy(p); setEditing(false); setOk("Policy saved."); refresh(); }} onError={setErr} />}
      </section>

      <section aria-labelledby="reg-h" style={{ display: "grid", gap: 10 }}>
        <h2 id="reg-h" style={{ margin: 0, fontSize: 16 }}>Register</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>To record something new, open the stakeholder and choose its Gifts and hospitality tab.</p>
        <HospitalityList canManage={canManage} refreshKey={key} focusId={focus} onChanged={() => { refresh(); setKey((k) => k + 1); }} />
      </section>
    </Page>
  );
}

function PolicyForm({ policy, onSaved, onCancel, onError }: { policy: CrmGiftPolicy; onSaved: (p: CrmGiftPolicy) => void; onCancel: () => void; onError: (m: string | null) => void }) {
  const [f, setF] = useState({ currency: policy.currency, gift: String(policy.giftThreshold), hosp: String(policy.hospitalityThreshold), annual: String(policy.annualThreshold), official: policy.alwaysApprovePublicOfficial, approvers: policy.approverUserIds,
    title: policy.policyTitle ?? "", version: policy.policyVersion ?? "", from: policy.policyEffectiveFrom ?? "", review: policy.policyReviewDue ?? "" });
  const [doc, setDoc] = useState<string | null>(policy.policyDocumentId);
  const [people, setPeople] = useState<CrmPeopleOption[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiClient.crmPeople().then(setPeople).catch(() => setPeople([])); }, []);
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const save = async () => {
    setBusy(true); onError(null);
    try {
      onSaved(await apiClient.saveCrmGiftPolicy({ currency: f.currency, giftThreshold: num(f.gift), hospitalityThreshold: num(f.hosp), annualThreshold: num(f.annual), alwaysApprovePublicOfficial: f.official, approverUserIds: f.approvers,
        policyDocumentId: doc, policyTitle: f.title || null, policyVersion: f.version || null, policyEffectiveFrom: f.from || null, policyReviewDue: f.review || null }));
    } catch (e) { onError(e instanceof Error ? e.message : "Could not save the policy."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Gifts and hospitality policy" style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>Set the thresholds from your own written policy. A value above a threshold needs a second person to approve it. Amounts in other currencies are converted at the rate on the day.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="Currency for the thresholds"><CurrencySelect value={f.currency} onChange={(c) => setF({ ...f, currency: c || f.currency })} options={CURRENCY_OPTIONS} ariaLabel="Currency for the thresholds" /></Field>
        <Field label="Gift threshold" hint="A gift worth more than this needs approval."><input type="number" min="0" step="0.01" style={inputStyle} value={f.gift} onChange={(e) => setF({ ...f, gift: e.target.value })} required /></Field>
        <Field label="Hospitality threshold" hint="Per occasion: meals, events, travel."><input type="number" min="0" step="0.01" style={inputStyle} value={f.hosp} onChange={(e) => setF({ ...f, hosp: e.target.value })} required /></Field>
        <Field label="Yearly total with one stakeholder" hint="Rolling twelve months, given and received."><input type="number" min="0" step="0.01" style={inputStyle} value={f.annual} onChange={(e) => setF({ ...f, annual: e.target.value })} required /></Field>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.official} onChange={(e) => setF({ ...f, official: e.target.checked })} /> Anything given to or received from a public official needs approval, whatever its value</label>
      <Field label="Approvers" hint="Leave empty to let anyone who manages the CRM approve, other than the person who recorded it. Hold Ctrl or Command to choose several.">
        <select multiple className="u-native-select" style={{ ...inputStyle, minHeight: 90 }} value={f.approvers} onChange={(e) => setF({ ...f, approvers: [...e.target.selectedOptions].map((o) => o.value) })}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="Policy title"><input style={inputStyle} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Version"><input style={inputStyle} maxLength={50} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
        <Field label="In force from"><input type="date" style={inputStyle} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label="Next review"><input type="date" style={inputStyle} value={f.review} onChange={(e) => setF({ ...f, review: e.target.value })} /></Field>
      </div>
      <EvidenceField label="Policy document" hint="Upload the written policy, or paste a link to it." docId={doc} onChange={(id) => setDoc(id)} />
      <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="primary" type="submit" disabled={busy}><CheckCircleIcon size={14} /> {busy ? "Saving…" : "Save policy"}</Button><Button size="sm" variant="secondary" type="button" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export default function CompliancePage() { return <Suspense fallback={null}><ComplianceInner /></Suspense>; }
