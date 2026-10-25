"use client";

import { OrgName } from "../../../components/OrgName";
import { DocumentsPanel } from "../../../components/TenderDocuments";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductCatalogMatch, TenderCriterionRecord, TenderDetailForIssuer, TenderLineRecord, TenderOrganisationOption, TenderRecord, TenderRuleRecord, TenderRuleType } from "@universe/types";
import { SERVICE_CATEGORIES, SERVICE_GROUPS, SERVICE_PRICING_BASES, serviceCategoryByCode, serviceCatalogueByCode, CURRENCY_OPTIONS, INCOTERMS, normaliseWeights, INCOTERM_NAMES, QUALIFICATION_OPTIONS, UNIT_OPTIONS } from "@universe/types";
import { Button, CountryMultiSelect, CountrySelect, CurrencySelect, Pill, PlusIcon, ProductPicker, Select, ServiceCataloguePicker, UnitSelect, XIcon } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { readiness } from "../../../lib/stageTiles";
import { Card, ErrorNote, Field, Heading, ORG_TYPE_LABEL, Page, QUALIFICATIONS, RULE_LABEL, TYPE_LABEL, VISIBILITY_LABEL, browserZone, fmtDateTime, fromLocalInput, inputStyle, toLocalInput, zoneList } from "../../../lib/ui";

type Section = "overview" | "items" | "criteria" | "eligibility" | "documents" | "invitations" | "review";
const SECTIONS: [Section, string][] = [["overview", "Overview"], ["items", "Items"], ["criteria", "Criteria"], ["eligibility", "Who can bid"], ["documents", "Documents"], ["invitations", "Invitations"], ["review", "Review and publish"]];
const codes = (s: string | null | undefined) => (s ?? "").split(",").filter(Boolean);
const delimited = (a: string[]) => (a.length ? `,${a.join(",")},` : "");
/** Only the fields the API accepts, with numeric strings (the API returns decimals as strings) turned into numbers. */
const cleanLine = (l: TenderLineRecord): TenderLineRecord => ({ lotNumber: l.lotNumber ?? null, lotTitle: l.lotTitle ?? null, description: l.description.trim(), productMasterId: l.productMasterId ?? null, specification: l.specification ?? null, quantity: l.quantity === null || l.quantity === undefined || l.quantity === "" ? null : Number(l.quantity), unit: l.unit ?? null, destinationCountryCode: l.destinationCountryCode || null, requiredRegistration: l.requiredRegistration ?? null, minShelfLifePercent: l.minShelfLifePercent ?? null, coldChainRequired: !!l.coldChainRequired, ...(l.serviceCategory ? { serviceCategory: l.serviceCategory, servicePricingBasis: l.servicePricingBasis ?? null, serviceCode: l.serviceCode ?? null } : {}) });
const cleanCriterion = (c: TenderCriterionRecord): TenderCriterionRecord => ({ title: c.title.trim(), description: c.description ?? null, kind: c.kind, weight: c.kind === "SCORED" ? Number(c.weight ?? 0) : null, isMandatory: c.isMandatory ?? true, responseFormat: c.responseFormat, acceptedFileTypes: c.acceptedFileTypes ?? null, metric: c.kind === "SCORED" ? c.metric ?? "MANUAL" : "MANUAL" });
const cleanRule = (r: TenderRuleRecord): TenderRuleRecord => ({ ruleType: r.ruleType, ruleValue: r.ruleValue.trim(), explanation: r.explanation || null, isRequired: r.isRequired });
const num = (v: string) => (v === "" ? null : Number(v));

/**
 * The tender builder (2026-10-19). A draft is built section by section; each section saves on its own so nothing is lost, and the
 * last step shows exactly what still blocks publication. After publication content is locked (the manage page handles dates).
 */
export function BuilderView() {
  const id = useSearchParams()?.get("id") ?? "";
  const [detail, setDetail] = useState<TenderDetailForIssuer | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id);

  const load = useCallback(async () => {
    if (!id) return;
    try { const d = await apiClient.getMyTender(id); if (d.tender.status !== "DRAFT") { window.location.href = `/tenders/manage?id=${id}`; return; } setDetail(d); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not load the tender."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <Page><div style={{ color: "var(--u-ink-secondary)" }}>Loading…</div></Page>;
  const created = !!detail;
  const ready = detail ? readiness(detail) : [];

  return (
    <Page>
      <Heading
        title={detail ? `${detail.tender.referenceNumber} ${detail.tender.title}` : "New tender"}
        sub={detail ? "Draft. Only your organisation can see it until you publish." : "Start with the basics. You can fill in the rest step by step; nothing is visible to anyone until you publish."}
        actions={<Link href="/tenders" style={{ textDecoration: "none" }}><Button variant="ghost">Back to tenders</Button></Link>}
      />
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SECTIONS.map(([k, label], i) => {
          const locked = !created && k !== "overview";
          const doneByKey: Record<string, boolean> = detail ? { overview: !!detail.tender.closingAt && !!detail.tender.currency, items: detail.lines.length > 0, criteria: detail.criteria.length > 0, eligibility: detail.rules.length > 0, invitations: detail.invitations.length > 0, review: ready.every((r) => r.ok) } : {};
          return (
            <button key={k} type="button" disabled={locked} onClick={() => setSection(k)} style={{ border: "none", background: "none", padding: 0, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1 }}>
              <Pill tone={section === k ? "brand" : doneByKey[k] ? "good" : "neutral"}>{i + 1}. {label}</Pill>
            </button>
          );
        })}
      </div>

      {section === "overview" && <Overview detail={detail} onSaved={(t) => { if (!id) window.location.href = `/tenders/builder?id=${t.id}`; else void load(); }} />}
      {detail && section === "items" && <Items detail={detail} onSaved={load} />}
      {detail && section === "criteria" && <Criteria detail={detail} onSaved={load} />}
      {detail && section === "eligibility" && <Eligibility detail={detail} onSaved={load} />}
      {detail && section === "documents" && <DocumentsPanel tenderId={detail.tender.id} documents={detail.documents} published={false} onChanged={load} />}
      {detail && section === "invitations" && <Invitations detail={detail} onSaved={load} />}
      {detail && section === "review" && <Review detail={detail} ready={ready} />}
    </Page>
  );
}

function SaveBar({ onSave, saving, label = "Save", note }: { onSave: () => void; saving: boolean; label?: string; note?: string | null }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}><Button variant="primary" onClick={onSave} disabled={saving}>{saving ? "Saving…" : label}</Button>{note && <span style={{ fontSize: 13, color: "var(--u-status-good-text)" }}>{note}</span>}</div>;
}

function useSaver<T = unknown>(onSaved: (result: T) => void) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function run(fn: () => Promise<T | void>, okNote = "Saved") {
    setSaving(true); setErr(null); setNote(null);
    try { const r = await fn(); setNote(okNote); onSaved(r as T); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } finally { setSaving(false); }
  }
  return { saving, err, note, run };
}

// ------------------------------------------------------------------ overview
function Overview({ detail, onSaved }: { detail: TenderDetailForIssuer | null; onSaved: (t: TenderRecord) => void }) {
  const countries = useCountries();
  const t = detail?.tender;
  const [f, setF] = useState({
    title: t?.title ?? "", summary: t?.summary ?? "", tenderType: t?.tenderType ?? "RFQ", visibility: t?.visibility ?? "ELIGIBLE_ORGANISATIONS",
    countries: codes(t?.deliveryCountryCodes), currency: t?.currency ?? "", incoterm: t?.incoterm ?? "", clientName: t?.clientName ?? "",
    timeZone: t?.timeZone ?? browserZone(),
    clarificationDeadline: toLocalInput(t?.clarificationDeadline, t?.timeZone), closingAt: toLocalInput(t?.closingAt, t?.timeZone), evaluationDueAt: toLocalInput(t?.evaluationDueAt, t?.timeZone), awardDueAt: toLocalInput(t?.awardDueAt, t?.timeZone),
    standstillEnabled: t?.standstillEnabled ?? false, standstillWorkingDays: t?.standstillWorkingDays?.toString() ?? "8", publicNotice: t?.publicNotice ?? false,
    allowTemplateSubmission: t?.allowTemplateSubmission ?? true, emergencyProcurement: t?.emergencyProcurement ?? false, emergencyReason: t?.emergencyReason ?? "", allowSingleEvaluator: t?.allowSingleEvaluator ?? false, singleEvaluatorReason: t?.singleEvaluatorReason ?? "", requireIntegrityPledge: t?.requireIntegrityPledge ?? true, requireExclusionDeclaration: t?.requireExclusionDeclaration ?? true,
    bidValidityDays: t?.bidValidityDays?.toString() ?? "", acceptedFileTypes: t?.acceptedFileTypes ?? "pdf,docx,xlsx,csv", maxFileSizeMb: t?.maxFileSizeMb?.toString() ?? "25",
    allowTextSubmission: t?.allowTextSubmission ?? true, termsAndConditions: t?.termsAndConditions ?? "",
    frameworkTermMonths: t?.frameworkTermMonths?.toString() ?? "24", frameworkCeiling: t?.frameworkCeiling?.toString() ?? "", frameworkCallOffMethod: t?.frameworkCallOffMethod ?? "DIRECT", frameworkPriceHoldDays: t?.frameworkPriceHoldDays?.toString() ?? "90",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const s = useSaver<TenderRecord>((r) => onSaved(r));

  const save = () => s.run(async () => {
    const body = {
      title: f.title.trim(), summary: f.summary || undefined, tenderType: f.tenderType as TenderRecord["tenderType"], visibility: f.visibility as TenderRecord["visibility"],
      deliveryCountryCodes: delimited(f.countries), currency: f.currency.trim() ? f.currency.trim().toUpperCase() : undefined, incoterm: f.incoterm || undefined, clientName: f.clientName || undefined,
      timeZone: f.timeZone,
      clarificationDeadline: fromLocalInput(f.clarificationDeadline, f.timeZone), closingAt: fromLocalInput(f.closingAt, f.timeZone), evaluationDueAt: fromLocalInput(f.evaluationDueAt, f.timeZone), awardDueAt: fromLocalInput(f.awardDueAt, f.timeZone),
      standstillEnabled: f.standstillEnabled, standstillWorkingDays: f.standstillEnabled ? num(f.standstillWorkingDays) ?? 8 : undefined, publicNotice: f.publicNotice,
      allowTemplateSubmission: f.allowTemplateSubmission, emergencyProcurement: f.emergencyProcurement, emergencyReason: f.emergencyProcurement ? f.emergencyReason : undefined, allowSingleEvaluator: f.allowSingleEvaluator, singleEvaluatorReason: f.allowSingleEvaluator ? f.singleEvaluatorReason : undefined, requireIntegrityPledge: f.requireIntegrityPledge, requireExclusionDeclaration: f.requireExclusionDeclaration,
      bidValidityDays: num(f.bidValidityDays) ?? undefined, acceptedFileTypes: f.acceptedFileTypes || undefined, maxFileSizeMb: num(f.maxFileSizeMb) ?? undefined,
      allowTextSubmission: f.allowTextSubmission, termsAndConditions: f.termsAndConditions || undefined,
      ...(f.tenderType === "FRAMEWORK" ? { frameworkTermMonths: num(f.frameworkTermMonths) ?? undefined, frameworkCeiling: num(f.frameworkCeiling) ?? undefined, frameworkCallOffMethod: f.frameworkCallOffMethod as "DIRECT" | "ROTATION", frameworkPriceHoldDays: num(f.frameworkPriceHoldDays) ?? undefined } : {}),
    };
    return detail ? await apiClient.updateTender(detail.tender.id, body) : await apiClient.createTender(body);
  }, detail ? "Saved" : "Draft created");

  return (
    <Card title="Overview">
      <ErrorNote message={s.err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16, marginTop: s.err ? 12 : 0 }}>
        <Field label="Title" wide><input style={inputStyle} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={300} placeholder="e.g. Artemether-lumefantrine 20/120 mg dispersible tablets" aria-label="e.g. Artemether-lumefantrine 20/120 mg dispersible tablets" /></Field>
        <Field label="Summary" wide hint="What you are buying and why. Organisations read this before opting in."><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={f.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
        <Field label="Type"><Select value={f.tenderType} onChange={(v) => set("tenderType", v as typeof f.tenderType)} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} /></Field>
        {f.tenderType === "FRAMEWORK" && <>
          <Field label="Framework term (months)" hint="How long the agreement runs from the contract start date."><input type="number" min={1} max={120} style={inputStyle} value={f.frameworkTermMonths} onChange={(e) => set("frameworkTermMonths", e.target.value)} /></Field>
          <Field label="Maximum total value (optional)" hint="A guide for spend. Call-offs above it are allowed but flagged."><input type="number" min={0} style={inputStyle} value={f.frameworkCeiling} onChange={(e) => set("frameworkCeiling", e.target.value)} /></Field>
          <Field label="How call-offs are placed" hint="Direct: the best-ranked supplier for the items. Rotation: the supplier with the fewest call-offs so far."><Select value={f.frameworkCallOffMethod} onChange={(v) => set("frameworkCallOffMethod", v as "DIRECT" | "ROTATION")} options={[{ value: "DIRECT", label: "Direct award to the first-ranked supplier" }, { value: "ROTATION", label: "Rotation between suppliers" }]} /></Field>
          <Field label="Prices held for (days)" hint="Prices come from each supplier's bid and are fixed for this long from signature. After that either side can propose a change to specific items."><input type="number" min={0} max={730} style={inputStyle} value={f.frameworkPriceHoldDays} onChange={(e) => set("frameworkPriceHoldDays", e.target.value)} /></Field>
        </>}
        <Field label="Who can see it" hint={VISIBILITY_LABEL[f.visibility]}><Select value={f.visibility} onChange={(v) => set("visibility", v as typeof f.visibility)} options={[{ value: "ELIGIBLE_ORGANISATIONS", label: "All registered, eligible bid" }, { value: "ALL_REGISTERED", label: "All registered, all can bid" }, { value: "INVITED_ONLY", label: "Invited organisations only" }]} /></Field>
        <Field label="Delivery countries" wide><CountryMultiSelect value={f.countries} onChange={(c) => set("countries", c)} options={countries} /></Field>
        <Field label="Currency"><CurrencySelect value={f.currency} onChange={(c) => set("currency", c)} options={CURRENCY_OPTIONS} ariaLabel="Currency" /></Field>
        <Field label="Incoterm (2020)"><Select value={f.incoterm} onChange={(v) => set("incoterm", v)} allLabel="Not specified" options={INCOTERMS.map((i) => ({ value: i, label: `${i}: ${INCOTERM_NAMES[i]}` }))} /></Field>
        <Field label="Tendering for (client)" hint="Only if you tender on behalf of someone else"><input style={inputStyle} value={f.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
        <Field label="Time zone for these dates" hint="Bidders see every date in this zone and in UTC."><select style={inputStyle} value={f.timeZone} onChange={(e) => set("timeZone", e.target.value)}>{(zoneList().includes(f.timeZone) ? zoneList() : [f.timeZone, ...zoneList()]).map((z) => <option key={z} value={z}>{z}</option>)}</select></Field>
        <Field label="Questions close"><input type="datetime-local" style={inputStyle} value={f.clarificationDeadline} onChange={(e) => set("clarificationDeadline", e.target.value)} /></Field>
        <Field label="Closing date" hint="Bids cannot be submitted after this."><input type="datetime-local" style={inputStyle} value={f.closingAt} onChange={(e) => set("closingAt", e.target.value)} /></Field>
        <Field label="Evaluation due by"><input type="datetime-local" style={inputStyle} value={f.evaluationDueAt} onChange={(e) => set("evaluationDueAt", e.target.value)} /></Field>
        <Field label="Award due by"><input type="datetime-local" style={inputStyle} value={f.awardDueAt} onChange={(e) => set("awardDueAt", e.target.value)} /></Field>
        <Field label="Bid validity (days)" hint="How long a bid must stay valid"><input type="number" min={1} max={730} style={inputStyle} value={f.bidValidityDays} onChange={(e) => set("bidValidityDays", e.target.value)} /></Field>
        <Field label="Accepted upload formats" hint="File extensions, comma separated"><input style={inputStyle} value={f.acceptedFileTypes} onChange={(e) => set("acceptedFileTypes", e.target.value)} /></Field>
        <Field label="Largest file (MB)"><input type="number" min={1} max={200} style={inputStyle} value={f.maxFileSizeMb} onChange={(e) => set("maxFileSizeMb", e.target.value)} /></Field>
        <Field label="Typed answers" hint="Let bidders paste or type answers instead of uploading a file.">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.allowTextSubmission} onChange={(e) => set("allowTextSubmission", e.target.checked)} /> Allow copy and paste answers</label>
        </Field>
        <Field label="Bidder declarations" hint="Bidders must accept these before they can express interest.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.requireIntegrityPledge} onChange={(e) => set("requireIntegrityPledge", e.target.checked)} /> Integrity pledge (no bribery, collusion or conflicts of interest)</label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.requireExclusionDeclaration} onChange={(e) => set("requireExclusionDeclaration", e.target.checked)} /> Exclusion declaration (insolvency, fraud, sanctions and similar)</label>
          </div>
        </Field>
        <Field label="Standstill period" hint="A pause between the award decision and signing, so unsuccessful bidders can ask questions or challenge. Off unless you need it.">
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={f.standstillEnabled} onChange={(e) => set("standstillEnabled", e.target.checked)} /> Use a standstill period</label>
            {f.standstillEnabled && <><input type="number" min={1} max={30} style={{ ...inputStyle, width: 80 }} value={f.standstillWorkingDays} onChange={(e) => set("standstillWorkingDays", e.target.value)} aria-label="Working days" /> working days</>}
          </div>
        </Field>
        <Field label="Public notice" hint="Publishes a read-only notice (title, items, criteria, closing date) that anyone can see without signing in. Never available for simulated tenders. Off by default.">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.publicNotice} onChange={(e) => set("publicNotice", e.target.checked)} /> Publish a public notice</label>
        </Field>
        <Field label="Template submission" hint="Bidders can also download a locked Excel financial offer and Word technical offer generated from your items and criteria, complete them offline and upload them. On by default alongside the online form.">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.allowTemplateSubmission} onChange={(e) => set("allowTemplateSubmission", e.target.checked)} /> Allow template submission</label>
        </Field>
        <Field label="Emergency procurement" hint="Tick only where urgency genuinely justifies it. The reason is recorded, shown to bidders, and lets you waive the standstill at award.">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.emergencyProcurement} onChange={(e) => set("emergencyProcurement", e.target.checked)} /> This is an emergency procurement</label>
          {f.emergencyProcurement && <input style={{ ...inputStyle, marginTop: 8 }} aria-label="Emergency reason" placeholder="Why is this an emergency?" value={f.emergencyReason} onChange={(e) => set("emergencyReason", e.target.value)} />}
        </Field>
        <Field label="Single evaluator" hint="Normally two or more evaluators are needed. Allow one only where your own rules permit it, for example below a financial threshold.">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.allowSingleEvaluator} onChange={(e) => set("allowSingleEvaluator", e.target.checked)} /> Allow a single evaluator</label>
          {f.allowSingleEvaluator && <input style={{ ...inputStyle, marginTop: 8 }} aria-label="Single evaluator reason" placeholder="Basis, e.g. below our EUR 10,000 threshold" value={f.singleEvaluatorReason} onChange={(e) => set("singleEvaluatorReason", e.target.value)} />}
        </Field>
        <Field label="Terms and conditions" wide><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={f.termsAndConditions} onChange={(e) => set("termsAndConditions", e.target.value)} /></Field>
      </div>
      <SaveBar onSave={save} saving={s.saving} label={detail ? "Save overview" : "Create draft"} note={s.note} />
    </Card>
  );
}

// --------------------------------------------------------------------- items
function Items({ detail, onSaved }: { detail: TenderDetailForIssuer; onSaved: () => void }) {
  const countries = useCountries();
  const [lines, setLines] = useState<TenderLineRecord[]>(detail.lines.map(cleanLine));
  const [q, setQ] = useState(""); const [opts, setOpts] = useState<ProductCatalogMatch[]>([]);
  const s = useSaver(onSaved);
  useEffect(() => { if (q.trim().length < 2) { setOpts([]); return; } const h = setTimeout(() => apiClient.searchProductCatalog(q.trim()).then(setOpts).catch(() => setOpts([])), 250); return () => clearTimeout(h); }, [q]);
  const blank = (over: Partial<TenderLineRecord> = {}): TenderLineRecord => ({ lotNumber: null, lotTitle: null, description: "", productMasterId: null, specification: null, quantity: null, unit: null, destinationCountryCode: null, requiredRegistration: null, minShelfLifePercent: null, coldChainRequired: false, ...over });
  const upd = (i: number, p: Partial<TenderLineRecord>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <Card title="Items" action={<span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setLines((l) => [...l, blank()])}>Free-text item</Button><Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setLines((l) => [...l, blank({ serviceCategory: SERVICE_CATEGORIES[0].code, servicePricingBasis: SERVICE_CATEGORIES[0].bases[0] })])}>Service</Button></span>}>
      <Field label="Add from the product catalogue" hint="Linking to the catalogue lets bidders and the platform check registrations, safety notices and shelf life.">
        <ProductPicker query={q} onQueryChange={setQ} options={opts} selectedId={null} onSelect={(p) => { const m = opts.find((o) => o.id === p.id); setLines((l) => [...l, blank({ description: p.name, productMasterId: p.id, unit: m?.standardUnit ?? null })]); setQ(""); setOpts([]); }} onClear={() => setQ("")} ariaLabel="Add a catalogue product" />
      </Field>
      <ErrorNote message={s.err} />
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--u-ink-secondary)" }}>Lots are optional. If you use them, give every item a lot number. Bidders may bid for any lots, but must price every item in a lot they bid for. You can award each item to one supplier, so different suppliers can win different items in the same lot.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {lines.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>No items yet. Add at least one to publish.</p>}
        {lines.map((l, i) => (
          <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, position: "relative" }}>
            <Field label={`Item ${i + 1}${l.productMasterId ? " (catalogue)" : l.serviceCategory ? " (service)" : ""}`} wide><input style={inputStyle} value={l.description} onChange={(e) => upd(i, { description: e.target.value })} maxLength={500} /></Field>
            {l.serviceCategory ? (
              <>
                <Field label="Standard service" wide hint="Starting from a standard service means every bidder quotes the same thing in the same unit.">
                  <ServiceCataloguePicker value={l.serviceCode} category={l.serviceCategory} style={inputStyle} ariaLabel={`Standard service for item ${i + 1}`} onPick={(item) => upd(i, item ? { serviceCode: item.code, serviceCategory: item.category, servicePricingBasis: item.basis, unit: item.unit, description: l.description.trim() ? l.description : item.name } : { serviceCode: null })} />
                </Field>
                <Field label="Type of service">
                  <select className="u-native-select" style={inputStyle} value={l.serviceCategory} onChange={(e) => { const c = serviceCategoryByCode(e.target.value); const keep = l.serviceCode && serviceCatalogueByCode(l.serviceCode)?.category === e.target.value; upd(i, { serviceCategory: e.target.value, serviceCode: keep ? l.serviceCode : null, servicePricingBasis: c && !c.bases.includes((l.servicePricingBasis ?? "") as never) ? c.bases[0] : l.servicePricingBasis }); }}>
                    {SERVICE_GROUPS.map((g) => <optgroup key={g} label={g}>{SERVICE_CATEGORIES.filter((c) => c.group === g).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</optgroup>)}
                  </select>
                </Field>
                <Field label="How bidders state the price">
                  <select className="u-native-select" style={inputStyle} value={l.servicePricingBasis ?? ""} onChange={(e) => upd(i, { servicePricingBasis: e.target.value })}>
                    {SERVICE_PRICING_BASES.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label={SERVICE_PRICING_BASES.find((b) => b.code === l.servicePricingBasis)?.quantityLabel ?? "Quantity"}><input type="number" min={0} style={inputStyle} value={l.quantity ?? ""} onChange={(e) => upd(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
                <Field label="Where it is delivered"><CountrySelect value={l.destinationCountryCode ?? ""} onChange={(c) => upd(i, { destinationCountryCode: c || null })} options={countries} /></Field>
              </>
            ) : (
              <>
            <Field label="Quantity"><input type="number" min={0} style={inputStyle} value={l.quantity ?? ""} onChange={(e) => upd(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Unit"><UnitSelect value={l.unit ?? ""} onChange={(u) => upd(i, { unit: u || null })} options={UNIT_OPTIONS} ariaLabel="Unit" /></Field>
            <Field label="Destination"><CountrySelect value={l.destinationCountryCode ?? ""} onChange={(c) => upd(i, { destinationCountryCode: c || null })} options={countries} /></Field>
            <Field label="Required registration"><UnitSelect value={l.requiredRegistration ?? ""} onChange={(v) => upd(i, { requiredRegistration: v || null })} options={QUALIFICATION_OPTIONS} ariaLabel="Required registration" allLabel="None required" /></Field>
            <Field label="Minimum shelf life left (%)"><input type="number" min={0} max={100} style={inputStyle} value={l.minShelfLifePercent ?? ""} onChange={(e) => upd(i, { minShelfLifePercent: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              </>
            )}
            <Field label="Lot (optional)"><input type="number" min={1} style={inputStyle} value={l.lotNumber ?? ""} onChange={(e) => upd(i, { lotNumber: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            {l.lotNumber ? <Field label={`Title of lot ${l.lotNumber}`} hint="Items with the same lot number share this title."><input style={inputStyle} value={l.lotTitle ?? ""} maxLength={200} onChange={(e) => { const v = e.target.value || null; const n = l.lotNumber; setLines((ls) => ls.map((x, j) => (j === i || x.lotNumber === n ? { ...x, lotTitle: v } : x))); }} /></Field> : null}
            {!l.serviceCategory && <Field label="Cold chain"><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={l.coldChainRequired} onChange={(e) => upd(i, { coldChainRequired: e.target.checked })} /> Required</label></Field>}
            <Field label="Specification" wide><textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={l.specification ?? ""} onChange={(e) => upd(i, { specification: e.target.value || null })} /></Field>
            <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)" }}><XIcon size={16} /></button>
          </div>
        ))}
      </div>
      <SaveBar saving={s.saving} note={s.note} label="Save items" onSave={() => s.run(() => apiClient.setTenderLines(detail.tender.id, lines.filter((l) => l.description.trim()).map(cleanLine)))} />
    </Card>
  );
}

// ------------------------------------------------------------------ criteria
/** Setting one weight rescales the others so the scored criteria always total 100. */
function withWeight(rows: TenderCriterionRecord[], i: number, v: number): TenderCriterionRecord[] {
  const scoredIdx = rows.map((r, k) => (r.kind === "SCORED" ? k : -1)).filter((k) => k >= 0);
  const others = scoredIdx.filter((k) => k !== i);
  const value = Math.max(0, Math.min(100, Math.round(v * 10) / 10));
  const fitted = others.length ? normaliseWeights(others.map((k) => Number(rows[k].weight ?? 0)), Math.round((100 - value) * 10) / 10) : [];
  return rows.map((r, k) => (k === i ? { ...r, weight: others.length ? value : 100 } : others.includes(k) ? { ...r, weight: fitted[others.indexOf(k)] } : r));
}
function rebalanceEqually(rows: TenderCriterionRecord[]): TenderCriterionRecord[] {
  const idx = rows.map((r, k) => (r.kind === "SCORED" ? k : -1)).filter((k) => k >= 0);
  const w = normaliseWeights(idx.map(() => 1));
  return rows.map((r, k) => (idx.includes(k) ? { ...r, weight: w[idx.indexOf(k)] } : r));
}
const PRESETS: { metric: "PRICE" | "LEAD_TIME" | "PAST_PERFORMANCE" | "MANUAL"; title: string; label: string }[] = [
  { metric: "PRICE", title: "Price", label: "Price" }, { metric: "LEAD_TIME", title: "Lead time", label: "Lead time" }, { metric: "PAST_PERFORMANCE", title: "Past performance", label: "Past performance" },
  { metric: "MANUAL", title: "Quality", label: "Quality" }, { metric: "MANUAL", title: "", label: "Other criterion" },
];

function Criteria({ detail, onSaved }: { detail: TenderDetailForIssuer; onSaved: () => void }) {
  const [rows, setRows] = useState<TenderCriterionRecord[]>(detail.criteria.map(cleanCriterion));
  const s = useSaver(onSaved);
  const upd = (i: number, p: Partial<TenderCriterionRecord>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const addGate = () => setRows((r) => [...r, { title: "", description: null, kind: "GATE", weight: null, isMandatory: true, responseFormat: "EITHER", metric: "MANUAL", acceptedFileTypes: null }]);
  const addScored = (p: (typeof PRESETS)[number]) => setRows((r) => rebalanceEqually([...r, { title: p.title, description: null, kind: "SCORED", weight: 0, isMandatory: p.metric === "MANUAL", responseFormat: "EITHER", metric: p.metric, acceptedFileTypes: null }]));
  const has = (m: string) => rows.some((r) => r.kind === "SCORED" && r.metric === m);
  const remove = (i: number) => setRows((r) => rebalanceEqually(r.filter((_, j) => j !== i)).map((x, _k, all) => (all.every((y) => y.kind !== "SCORED") ? x : x)));

  return (
    <Card title="Evaluation criteria" action={<Button size="sm" onClick={addGate}>Pass/fail gate</Button>}>
      <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13.5, lineHeight: 1.5 }}>
        Each bid is scored out of 100. Choose the criteria that matter and set their weights; the others rebalance automatically so the total is always 100. Price and lead time are calculated from the bids (the best scores 100); the rest are scored by your evaluators. Gates are pass or fail: a bid that fails one cannot win.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {PRESETS.map((p) => <Button key={p.label} size="sm" variant="secondary" icon={<PlusIcon size={14} />} disabled={p.metric !== "MANUAL" && has(p.metric)} onClick={() => addScored(p)}>{p.label}</Button>)}
      </div>
      <ErrorNote message={s.err} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>No criteria yet.</p>}
        {rows.map((r, i) => (
          <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12, position: "relative" }}>
            <Field label={r.kind === "GATE" ? "Gate" : r.metric === "MANUAL" ? "Criterion scored by evaluators" : r.metric === "PRICE" ? "Price (calculated)" : r.metric === "PAST_PERFORMANCE" ? "Past performance (calculated)" : "Lead time (calculated)"} wide>
              <input style={inputStyle} value={r.title} readOnly={r.metric !== "MANUAL"} onChange={(e) => upd(i, { title: e.target.value })} placeholder={r.kind === "GATE" ? "e.g. Valid WHO prequalification" : "e.g. Sustainability"} aria-label={r.kind === "GATE" ? "e.g. Valid WHO prequalification" : "e.g. Sustainability"} />
            </Field>
            {r.kind === "SCORED" && <Field label="Weight (%)"><input type="number" min={0} max={100} step={0.5} style={inputStyle} value={r.weight ?? ""} onChange={(e) => setRows((x) => withWeight(x, i, e.target.value === "" ? 0 : Number(e.target.value)))} /></Field>}
            {r.metric === "MANUAL" && <Field label="Bidders respond by"><Select value={r.responseFormat} onChange={(v) => upd(i, { responseFormat: v as TenderCriterionRecord["responseFormat"] })} options={[{ value: "EITHER", label: "Upload or typed answer" }, { value: "UPLOAD", label: "Upload only" }, { value: "TEXT", label: "Typed answer only" }]} /></Field>}
            {r.metric === "MANUAL" && <Field label="Guidance for bidders" wide><textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={r.description ?? ""} onChange={(e) => upd(i, { description: e.target.value || null })} /></Field>}
            {r.metric !== "MANUAL" && <div style={{ fontSize: 13, color: "var(--u-ink-secondary)", alignSelf: "center" }}>{r.metric === "PRICE" ? "Taken from the bid prices. Bidders answer nothing extra." : r.metric === "PAST_PERFORMANCE" ? "Taken from closed Universe contracts (average performance score, at least 3 contracts from 2 owners). Bidders with no history score 70 so newcomers are not penalised. Bidders answer nothing extra." : "Taken from the lead times in the bid. Bidders answer nothing extra."}</div>}
            <button type="button" aria-label={`Remove criterion ${i + 1}`} onClick={() => remove(i)} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)" }}><XIcon size={16} /></button>
          </div>
        ))}
      </div>
      {rows.some((r) => r.kind === "SCORED") && <div style={{ marginTop: 12 }}><Pill tone="good">Weights total 100</Pill></div>}
      <SaveBar saving={s.saving} note={s.note} label="Save criteria" onSave={() => s.run(() => apiClient.setTenderCriteria(detail.tender.id, rows.filter((r) => r.title.trim()).map(cleanCriterion)))} />
    </Card>
  );
}

// --------------------------------------------------------------- eligibility
export function describeRule(r: TenderRuleRecord): string {
  const v = r.ruleValue.split(",").filter(Boolean);
  switch (r.ruleType) {
    case "ORG_TYPE": return `Your organisation must be a ${v.map((x) => ORG_TYPE_LABEL[x] ?? x).join(" or ").toLowerCase()}.`;
    case "COUNTRY": return `You must be registered, operating or distributing in ${v.join(" or ")}.`;
    case "CATEGORY": return `You must supply or manufacture products in ${v.join(" or ")}.`;
    case "QUALIFICATION": return `You must hold ${v.map((x) => QUALIFICATIONS.find((q) => q.value === x)?.label ?? x).join(" and ")}.`;
    case "MIN_SUPPLIER_RATING": return `Your platform performance rating must be ${r.ruleValue.startsWith("STRONG") ? "Strong" : "Good or better"}${r.ruleValue.endsWith(":STRICT") ? "." : ", or you have no history yet."}`;
    default: return "This organisation is excluded from the tender.";
  }
}

function Eligibility({ detail, onSaved }: { detail: TenderDetailForIssuer; onSaved: () => void }) {
  const countries = useCountries();
  const [rules, setRules] = useState<TenderRuleRecord[]>(detail.rules.map(cleanRule));
  const s = useSaver(onSaved);
  const upd = (i: number, p: Partial<TenderRuleRecord>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const add = (ruleType: TenderRuleType) => setRules((r) => [...r, { ruleType, ruleValue: ruleType === "MIN_SUPPLIER_RATING" ? "GOOD" : "", explanation: null, isRequired: true }]);
  const toggle = (i: number, v: string) => { const cur = new Set(rules[i].ruleValue.split(",").filter(Boolean)); cur.has(v) ? cur.delete(v) : cur.add(v); upd(i, { ruleValue: [...cur].join(",") }); };

  return (
    <Card title="Who can bid" action={<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(["ORG_TYPE", "COUNTRY", "CATEGORY", "QUALIFICATION", "MIN_SUPPLIER_RATING"] as TenderRuleType[]).map((t) => <Button key={t} size="sm" onClick={() => add(t)}>+ {RULE_LABEL[t]}</Button>)}</div>}>
      <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13.5, lineHeight: 1.5 }}>Every registered organisation can see your tender. These rules decide who may bid and are checked against each organisation's Universe profile, never self-declared. Organisations that do not yet qualify see exactly what to do to qualify. Invited organisations may always bid. With no rules, every organisation is eligible.</p>
      <ErrorNote message={s.err} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.map((r, i) => (
          <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
            <strong style={{ fontSize: 13.5 }}>{RULE_LABEL[r.ruleType]}</strong>
            {r.ruleType === "ORG_TYPE" && <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{["MANUFACTURER", "SUPPLIER", "PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY"].map((t) => <label key={t} style={{ display: "flex", gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={r.ruleValue.split(",").includes(t)} onChange={() => toggle(i, t)} />{ORG_TYPE_LABEL[t]}</label>)}</div>}
            {r.ruleType === "COUNTRY" && <CountryMultiSelect value={r.ruleValue.split(",").filter(Boolean)} onChange={(c) => upd(i, { ruleValue: c.join(",") })} options={countries} />}
            {r.ruleType === "CATEGORY" && <input style={inputStyle} value={r.ruleValue} onChange={(e) => upd(i, { ruleValue: e.target.value })} placeholder="e.g. Pharmaceuticals or Pharmaceuticals.Antimalarials (comma separated)" aria-label="e.g. Pharmaceuticals or Pharmaceuticals.Antimalarials (comma separated)" />}
            {r.ruleType === "QUALIFICATION" && <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{QUALIFICATIONS.map((q) => <label key={q.value} style={{ display: "flex", gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={r.ruleValue.split(",").includes(q.value)} onChange={() => toggle(i, q.value)} />{q.label}</label>)}</div>}
            {r.ruleType === "MIN_SUPPLIER_RATING" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{[["GOOD", "Good or better"], ["STRONG", "Strong"]].map(([v, l]) => <label key={v} style={{ display: "flex", gap: 6, fontSize: 13.5 }}><input type="radio" name={`rating-${i}`} checked={r.ruleValue.split(":")[0] === v} onChange={() => upd(i, { ruleValue: `${v}${r.ruleValue.endsWith(":STRICT") ? ":STRICT" : ""}` })} />{l}</label>)}</div>
                <label style={{ display: "flex", gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={!r.ruleValue.endsWith(":STRICT")} onChange={(e) => upd(i, { ruleValue: `${r.ruleValue.split(":")[0]}${e.target.checked ? "" : ":STRICT"}` })} />Allow organisations with no history yet (recommended: otherwise newcomers and small local suppliers are locked out)</label>
                <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Based on closed contracts on Universe, shown only once there are at least 3 from 2 tender owners.</span>
              </div>
            )}
            <label style={{ display: "flex", gap: 8, fontSize: 13.5 }}><input type="checkbox" checked={r.isRequired} onChange={(e) => upd(i, { isRequired: e.target.checked })} /> Required to bid (untick for advisory)</label>
            <Field label="Message to organisations that do not meet it (optional)"><input style={inputStyle} value={r.explanation ?? ""} onChange={(e) => upd(i, { explanation: e.target.value || null })} maxLength={500} /></Field>
            {r.ruleValue && <div style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Bidders see: <em>{describeRule(r)}</em></div>}
            <button type="button" aria-label={`Remove rule ${i + 1}`} onClick={() => setRules((x) => x.filter((_, j) => j !== i))} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)" }}><XIcon size={16} /></button>
          </div>
        ))}
        {rules.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>No rules: every registered organisation is eligible.</p>}
      </div>
      <SaveBar saving={s.saving} note={s.note} label="Save rules" onSave={() => s.run(() => apiClient.setTenderRules(detail.tender.id, rules.filter((r) => r.ruleValue.trim()).map(cleanRule)))} />
    </Card>
  );
}

// --------------------------------------------------------------- invitations
export function Invitations({ detail, onSaved }: { detail: TenderDetailForIssuer; onSaved: () => void }) {
  const [q, setQ] = useState(""); const [hits, setHits] = useState<TenderOrganisationOption[]>([]);
  const [chosen, setChosen] = useState<TenderOrganisationOption[]>([]);
  const s = useSaver(() => { setChosen([]); onSaved(); });
  useEffect(() => { if (q.trim().length < 2) { setHits([]); return; } const h = setTimeout(() => apiClient.searchTenderOrganisations(q.trim()).then(setHits).catch(() => setHits([])), 250); return () => clearTimeout(h); }, [q]);
  const invitedIds = new Set(detail.invitations.map((i) => i.invitedOrganizationId));

  return (
    <Card title="Invitations">
      <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13.5, lineHeight: 1.5 }}>Invited organisations are told when you publish and can bid even if they do not meet the eligibility rules. An invited-only tender is visible to nobody else.</p>
      <ErrorNote message={s.err} />
      <Field label="Find a registered organisation"><input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least two letters" aria-label="Type at least two letters" /></Field>
      {hits.length > 0 && <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)" }}>
        {hits.filter((h) => !invitedIds.has(h.id) && !chosen.some((c) => c.id === h.id)).map((h) => (
          <li key={h.id}><button type="button" onClick={() => { setChosen((c) => [...c, h]); setQ(""); setHits([]); }} style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", font: "inherit", color: "var(--u-ink)" }}>{h.name} <span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{ORG_TYPE_LABEL[h.type] ?? h.type}</span></button></li>))}
      </ul>}
      {chosen.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{chosen.map((c) => <Pill key={c.id} tone="brand">{c.name}</Pill>)}</div>}
      <SaveBar saving={s.saving} note={s.note} label={`Invite ${chosen.length || ""}`.trim()} onSave={() => chosen.length ? s.run(() => apiClient.inviteToTender(detail.tender.id, chosen.map((c) => c.id)), "Invited") : undefined} />
      <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>Invited so far ({detail.invitations.length})</h3>
      {detail.invitations.length === 0 ? <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Nobody yet.</p> : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{detail.invitations.map((i) => <Pill key={i.id}><OrgName id={i.invitedOrganizationId} name={i.organizationName} /></Pill>)}</div>}
    </Card>
  );
}

// -------------------------------------------------------------------- review
function Review({ detail, ready }: { detail: TenderDetailForIssuer; ready: { ok: boolean; label: string }[] }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const t = detail.tender; const allOk = ready.every((r) => r.ok);
  async function publish() {
    setBusy(true); setErr(null);
    try { await apiClient.publishTender(t.id); window.location.href = `/tenders/manage?id=${t.id}`; }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not publish."); setBusy(false); }
  }
  return (
    <Card title="Review and publish">
      <ErrorNote message={err} />
      <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {ready.map((r) => <li key={r.label} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: r.ok ? "var(--u-ink)" : "var(--u-status-critical-text)" }}><span aria-hidden style={{ width: 18, textAlign: "center" }}>{r.ok ? "✓" : "✗"}</span>{r.label}</li>)}
      </ul>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: "0 0 18px", fontSize: 13.5 }}>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Visibility</dt><dd style={{ margin: 0 }}>{VISIBILITY_LABEL[t.visibility]}</dd>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Closes</dt><dd style={{ margin: 0 }}>{fmtDateTime(t.closingAt, t.timeZone)}</dd>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Items</dt><dd style={{ margin: 0 }}>{detail.lines.length}</dd>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Criteria</dt><dd style={{ margin: 0 }}>{detail.criteria.filter((c) => c.kind === "GATE").length} gates, {detail.criteria.filter((c) => c.kind === "SCORED").length} weighted</dd>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Eligibility rules</dt><dd style={{ margin: 0 }}>{detail.rules.length || "None (everyone eligible)"}</dd>
        <dt style={{ color: "var(--u-ink-secondary)" }}>Invited</dt><dd style={{ margin: 0 }}>{detail.invitations.length}</dd>
      </dl>
      <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--u-ink-secondary)", lineHeight: 1.5 }}>Once published, items, criteria and rules are locked. You can still move dates later (the closing date only later) and every change is recorded on the tender's timeline.</p>
      <Button variant="primary" disabled={!allOk || busy} onClick={publish}>{busy ? "Publishing…" : "Publish tender"}</Button>
    </Card>
  );
}
