"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryPanel } from "../../components/CategoryPanel";
import { accentStyle, accentVar } from "../../lib/category";
import { Profile360 } from "../../components/Profile360";
import { ExportMenu } from "../../components/ExportMenu";
import { RelationshipTree } from "../../components/RelationshipTree";
import { Detail360, TABS_360, type Tab360 } from "../../components/Detail360";
import { SectionNav } from "../../components/SectionNav";
import { Tags } from "../../components/Tags";
import { SavedFilters } from "../../components/SavedFilters";
import { Hospitality } from "../../components/Hospitality";
import { BulkBar } from "../../components/BulkBar";
import { AddFromUniverse, Network } from "../../components/Network";
import { Interactions } from "../../components/Interactions";
import { Opportunities } from "../../components/Opportunities";
import { People } from "../../components/People";
import { type DataGap, categoryLabel, PARTNER_ROLE_TYPES, CRM_CERT_FILTERS, CRM_CERT_FILTER_LABELS, CRM_QUIET_MONTHS, CRM_HEALTH, CRM_HEALTH_LABELS, CRM_STATUS_LABELS, CRM_STATUSES, CRM_TIER_LABELS, CRM_TIERS, type CrmHealth, type CrmOverview, type CrmPeopleOption, type CrmRelationshipPage, type PartnerScorecard, type CrmTag, type CrmRelationshipRow, type CrmStatus, type CrmTier } from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, ClockIcon, Pagination, PartnersIcon, Pill, SearchInput, Select, StatTile, StatTileGrid, UNIVERSE_APPS, type PageSize } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { ErrorNote, Field, HEALTH_TONE, Heading, OkNote, Page, fmtDate, humanise, inputStyle } from "../../lib/ui";
import { DataHints } from "@universe/ui";
import { SourceNote } from "../../components/SourceNote";

type Filters = { q: string; tier: string; status: string; owner: string; health: string; review: string; role: string; tag: string; quiet: string; certs: string; gap: string };
const EMPTY: Filters = { q: "", tier: "", status: "", owner: "", health: "", review: "", role: "", tag: "", quiet: "", certs: "", gap: "" };
const ROLE_OPTIONS = PARTNER_ROLE_TYPES;

function initialFilters(): Filters {
  if (typeof window === "undefined") return EMPTY;
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", tier: p.get("tier") ?? "", status: p.get("status") ?? "", owner: p.get("owner") ?? "", health: p.get("health") ?? "", review: p.get("review") ?? "", role: p.get("role") ?? "", tag: p.get("tag") ?? "", quiet: p.get("quiet") ?? "", certs: p.get("certs") ?? "", gap: p.get("gap") ?? "" };
}

/**
 * Relationships list. Server-side filtering and paging; the four tiles drill the list; each row expands to show and (for people who can manage
 * relationships) edit owner, tier, status, review interval and a manager's own health judgement. Health itself is calculated and explained.
 */
export default function RelationshipsPage() {
  const me = useCurrentUser();
  const canManage = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const [f, setF] = useState<Filters>(EMPTY);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [data, setData] = useState<CrmRelationshipPage | null>(null);
  const [o, setO] = useState<CrmOverview | null>(null);
  const [people, setPeople] = useState<CrmPeopleOption[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggleOne = (id: string) => setPicked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => { setF(initialFilters()); setReady(true); }, []);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const loadTags = useCallback(() => { apiClient.crmTags().then(setTags).catch(() => setTags([])); }, []);
  useEffect(() => { loadTags(); }, [loadTags]);
  useEffect(() => { apiClient.crmPeople().then(setPeople).catch(() => setPeople([])); }, []);

  // Typing waits a moment before asking the server, so each keystroke is not a request.
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(f.q), 250); return () => clearTimeout(t); }, [f.q]);
  const [focus, setFocus] = useState<CrmRelationshipRow | null>(null);
  useEffect(() => { const sp = new URLSearchParams(window.location.search); const partner = sp.get("partner"); if (partner && !sp.get("id")) { apiClient.crmRelationshipForPartner(partner).then((r) => { setOpen(r.id); return apiClient.crmRelationship(r.id).then(setFocus); }).catch(() => setErr("This stakeholder has no CRM record yet.")); return; } const id = sp.get("id"); if (id) { setOpen(id); apiClient.crmRelationship(id).then(setFocus).catch(() => setErr("That relationship could not be found.")); } }, []);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const loadOverview = useCallback(() => { apiClient.crmOverview().then(setO).catch(() => undefined); }, []);
  // The four tiles describe the chosen view (kind, tier, owner, search and so on), not the whole book; only the tiles' own filters are left out.
  const [counts, setCounts] = useState<{ total: number; active: number; needsAttention: number; reviewDue: number } | null>(null);
  const loadCounts = useCallback(() => {
    if (!ready) return;
    const { status: _s, health: _h, review: _r, ...ctx } = f;
    apiClient.crmRelationshipCounts({ ...ctx, q: dq }).then(setCounts).catch(() => undefined);
  }, [f.q, f.tier, f.owner, f.role, f.tag, f.quiet, f.certs, f.gap, dq, ready]);
  const load = useCallback(() => {
    if (!ready) return;
    const mine = ++seq.current; setBusy(true);
    apiClient.crmRelationships({ ...f, q: dq, page, pageSize: pageSize === "all" ? 100 : pageSize, sort: "name" })
      .then((d) => { if (mine === seq.current) { setData(d); setErr(null); } })
      .catch((e) => { if (mine === seq.current) setErr(e instanceof Error ? e.message : "Could not load relationships."); })
      .finally(() => { if (mine === seq.current) setBusy(false); });
  }, [f, dq, page, pageSize, ready]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (ready) loadOverview(); }, [ready, loadOverview]);
  useEffect(() => { loadCounts(); }, [loadCounts, data]);

  const set = (patch: Partial<Filters>) => { setF((c) => ({ ...c, ...patch })); setPage(1); };
  const tileOn = (patch: Partial<Filters>) => Object.entries(patch).every(([k, v]) => f[k as keyof Filters] === v);
  const toggle = (patch: Partial<Filters>) => set(tileOn(patch) ? Object.fromEntries(Object.keys(patch).map((k) => [k, ""])) : { status: "", health: "", review: "", ...patch });
  const scoped = Object.entries(f).some(([k, v]) => !!v && !["status", "health", "review"].includes(k)) || !!dq;
  const tileKeySet = !!(f.status || f.health || f.review);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const personName = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);

  return (
    <Page>
      <Heading title="Relationships" sub="One record for each stakeholder your organisation works with. Open a row to see why its health is what it is, and to change who looks after it." />
      <ErrorNote message={err} />
      <OkNote message={ok} />
      <StatTileGrid>
        <StatTile label={scoped ? "In this view" : "All relationships"} value={counts?.total ?? (scoped ? undefined : o?.total)} icon={<PartnersIcon size={18} />} tone="brand" onClick={() => (tileKeySet ? set({ status: "", health: "", review: "" }) : set(EMPTY))} active={!tileKeySet} />
        <StatTile label="Active" value={counts?.active} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => toggle({ status: "ACTIVE" })} active={tileOn({ status: "ACTIVE" })} />
        <StatTile label="Need attention" value={counts?.needsAttention} icon={<AlertIcon size={18} />} tone="warning" onClick={() => toggle({ health: "attention" })} active={tileOn({ health: "attention" })} />
        <StatTile label="Reviews due" value={counts?.reviewDue} icon={<ClockIcon size={18} />} tone="critical" onClick={() => toggle({ review: "due" })} active={tileOn({ review: "due" })} />
      </StatTileGrid>
      <SourceNote keys={["overview", "health"]} />

      {canManage && <AddFromUniverse onError={setErr} onAdded={(m, _id, name) => { setOk(m); set({ ...EMPTY, q: name }); loadOverview(); loadCounts(); }} />}
      {canManage && <div style={{ display: "flex", justifyContent: "flex-end" }}><ExportMenu filters={{ ...f, q: dq }} onNote={setOk} onError={(m) => setErr(m || null)} /></div>}
      <SavedFilters view="RELATIONSHIPS" current={f as unknown as Record<string, string>} onApply={(sf) => { setF({ ...EMPTY, ...sf }); setPage(1); }} canShare={canManage} onError={setErr} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }} role="search" aria-label="Filter relationships">
        <div style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}><SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Search name, contact, tag, place, owner, country…" /></div>
        <div style={{ minWidth: 150 }}><Select value={f.tier} onChange={(v) => set({ tier: v })} allLabel="Any tier" options={CRM_TIERS.map((t) => ({ value: t, label: CRM_TIER_LABELS[t] }))} ariaLabel="Filter by tier" /></div>
        <div style={{ minWidth: 150 }}><Select value={f.status} onChange={(v) => set({ status: v })} allLabel="Any status" options={CRM_STATUSES.map((t) => ({ value: t, label: CRM_STATUS_LABELS[t] }))} ariaLabel="Filter by status" /></div>
        <div style={{ minWidth: 170 }}><Select value={f.role} onChange={(v) => set({ role: v })} allLabel="Any kind of stakeholder" options={ROLE_OPTIONS.map((t) => ({ value: t, label: categoryLabel(t) }))} ariaLabel="Filter by kind of stakeholder" /></div>
        <div style={{ minWidth: 170 }}><Select value={f.health} onChange={(v) => set({ health: v })} allLabel="Any health" options={[{ value: "attention", label: "Needs attention or worse" }, { value: "AT_RISK", label: CRM_HEALTH_LABELS.AT_RISK }]} ariaLabel="Filter by health" /></div>
        <div style={{ minWidth: 190 }}><Select value={f.quiet} onChange={(v) => set({ quiet: v })} allLabel="Any recent contact" options={CRM_QUIET_MONTHS.map((m) => ({ value: m, label: `No contact in ${m} months` }))} ariaLabel="Filter by time since last interaction" /></div>
        <div style={{ minWidth: 190 }}><Select value={f.certs} onChange={(v) => set({ certs: v })} allLabel="Any certificate state" options={CRM_CERT_FILTERS.map((m) => ({ value: m, label: CRM_CERT_FILTER_LABELS[m] }))} ariaLabel="Filter by certificate state" /></div>
        <div style={{ minWidth: 190 }}><Select value={f.gap} onChange={(v) => set({ gap: v })} allLabel="Any level of detail" options={[{ value: "noOwner", label: "No owner" }, { value: "noSummary", label: "No summary" }, { value: "noCountry", label: "No country" }, { value: "noReview", label: "No review date" }]} ariaLabel="Filter by missing detail" /></div>
        {tags.length > 0 && <div style={{ minWidth: 170 }}><Select value={f.tag} onChange={(v) => set({ tag: v })} allLabel="Any tag" options={tags.map((t) => ({ value: t.id, label: `${t.name} (${t.count})` }))} ariaLabel="Filter by tag" /></div>}
        <div style={{ minWidth: 170 }}><Select value={f.owner} onChange={(v) => set({ owner: v })} allLabel="Any owner" options={[{ value: "me", label: "Mine" }, { value: "none", label: "No owner" }, ...people.map((p) => ({ value: p.id, label: p.name }))]} ariaLabel="Filter by owner" /></div>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{busy ? "Loading…" : data ? `${data.total} relationship${data.total === 1 ? "" : "s"}` : "Loading…"}</span>
      </div>

      <ul aria-label="Colour key for kinds of stakeholder" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
        {PARTNER_ROLE_TYPES.map((k) => <li key={k} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span aria-hidden="true" style={{ width: 4, height: 14, background: accentVar(k), borderRadius: 2 }} />{categoryLabel(k)}</li>)}
      </ul>
      {focus && (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13.5 }}>Opened from a link. <button type="button" onClick={() => { setFocus(null); setOpen(null); window.history.replaceState(null, "", "/relationships"); }} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--u-link, var(--u-brand-violet))" }}>Close this and show the list</button></p>
          <Row key={`focus-${focus.id}`} r={focus} open={open === focus.id} onToggle={() => setOpen(open === focus.id ? null : focus.id)} canManage={canManage} people={people} allTags={tags} ownerName={focus.ownerUserId ? personName.get(focus.ownerUserId) ?? focus.ownerName : null}
            onSaved={(msg) => { setOk(msg); load(); loadOverview(); loadTags(); apiClient.crmRelationship(focus.id).then(setFocus).catch(() => undefined); }} onError={setErr} />
        </div>
      )}
      {canManage && data && data.items.length > 0 && <BulkBar pageIds={data.items.map((r) => r.id)} picked={picked} setPicked={setPicked} people={people} tags={tags} onDone={(m) => { setOk(m); setPicked(new Set()); load(); loadOverview(); loadTags(); }} onError={setErr} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: busy && data ? 0.55 : 1, transition: "opacity .15s" }} aria-busy={busy}>
        {data?.items.map((r) => <Row key={r.id} selected={canManage ? picked.has(r.id) : null} onSelect={() => toggleOne(r.id)} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} canManage={canManage} people={people} allTags={tags} ownerName={r.ownerUserId ? personName.get(r.ownerUserId) ?? r.ownerName : null}
          onSaved={(msg) => { setOk(msg); load(); loadOverview(); loadTags(); }} onError={setErr} />)}
        {data && data.items.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No relationships match these filters.</p>}
      </div>

      {data && data.total > 0 && (
        <Pagination pageSize={pageSize} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} page={page} pageCount={pages} onPageChange={setPage} totalCount={data.total} />
      )}
    </Page>
  );
}

function Row({ selected, onSelect, r, open, onToggle, canManage, people, allTags, ownerName, onSaved, onError }: { r: CrmRelationshipRow; open: boolean; onToggle: () => void; canManage: boolean; people: CrmPeopleOption[]; allTags: CrmTag[]; ownerName: string | null; onSaved: (m: string) => void; onError: (m: string | null) => void; selected?: boolean | null; onSelect?: () => void }) {
  const [draft, setDraft] = useState({ tier: r.tier as CrmTier, status: r.status as CrmStatus, ownerUserId: r.ownerUserId ?? "", summary: r.summary ?? "", reviewIntervalMonths: r.reviewIntervalMonths, healthOverride: (r.healthOverride ?? "") as CrmHealth | "", healthOverrideReason: r.healthOverrideReason ?? "" });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab360>("overview");
  // A link from search can open a particular tab of this relationship (?id=…&tab=people).
  useEffect(() => { const sp = new URLSearchParams(window.location.search); const t = sp.get("tab"); if (sp.get("id") === r.id && t && TABS_360.some((x) => x.key === t)) setTab(t as Tab360); }, [r.id]);
  const [card, setCard] = useState<PartnerScorecard | null | "none">(null);
  useEffect(() => { if (open && card === null) apiClient.crmScorecard(r.id).then(setCard).catch(() => setCard("none")); }, [open, card, r.id]);
  const pmHref = UNIVERSE_APPS.find((a) => a.key === "project-management")?.href;
  const save = async (extra: { markReviewed?: boolean; archived?: boolean } = {}, done = "Saved.") => {
    setBusy(true); onError(null);
    try {
      await apiClient.updateCrmRelationship(r.id, { tier: draft.tier, status: draft.status, ownerUserId: draft.ownerUserId || null, summary: draft.summary || null, reviewIntervalMonths: draft.reviewIntervalMonths,
        healthOverride: draft.healthOverride || null, healthOverrideReason: draft.healthOverride ? draft.healthOverrideReason : null, ...extra });
      onSaved(`${r.name}: ${done}`);
    } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  const dd: React.CSSProperties = { margin: 0 };
  const dt: React.CSSProperties = { color: "var(--u-ink-secondary)" };
  return (
    <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13.5, background: "var(--u-surface)", ...accentStyle(r.roles) }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
      {selected !== null && selected !== undefined && <label style={{ display: "flex", alignItems: "center", padding: "0 0 0 14px" }}><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${r.name}`} /></label>}
      <button type="button" aria-expanded={open} aria-controls={`rel-${r.id}`} onClick={onToggle} style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", color: "var(--u-ink)" }}>
        <span><span aria-hidden="true" style={{ display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span> <strong>{r.name}</strong> <span style={{ color: "var(--u-ink-secondary)" }}>· {r.roles.map(categoryLabel).join(", ") || "Stakeholder"}{r.countryCode ? ` · ${r.countryCode}` : ""}</span></span>
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {r.tags.slice(0, 2).map((t) => <Pill key={t.id} tone="brand">{t.name}</Pill>)}{r.tags.length > 2 && <span style={{ color: "var(--u-ink-secondary)" }}>+{r.tags.length - 2}</span>}
          <Pill tone="neutral">{CRM_TIER_LABELS[r.tier]}</Pill>
          <Pill tone={r.status === "ACTIVE" ? "good" : "neutral"}>{CRM_STATUS_LABELS[r.status]}</Pill>
          <Pill tone={HEALTH_TONE[r.health]}>{CRM_HEALTH_LABELS[r.health]}</Pill>
          <span style={{ color: "var(--u-ink-secondary)" }}>{ownerName ?? "No owner"}</span>
          <span style={{ color: "var(--u-ink-secondary)" }}>· {r.lastInteractionAt ? `Last contact ${fmtDate(r.lastInteractionAt)}` : "No contact recorded"}</span>
        </span>
      </button>
      </div>
      {open && (
        <div id={`rel-${r.id}`} style={{ padding: "8px 14px 14px", borderTop: "1px solid var(--u-border)", display: "grid", gap: 14 }}>
          <SectionNav label={`${r.name} sections`} idPrefix={`tab-${r.id}`} items={TABS_360} value={tab} onChange={setTab} panelId={`panel-${r.id}`} />
          <div role="tabpanel" id={`panel-${r.id}`} aria-label={TABS_360.find((t) => t.key === tab)?.label} aria-labelledby={`tab-${r.id}-${tab}`} style={{ display: "grid", gap: 14 }}>
          {tab === "interactions" ? <Interactions relId={r.id} canManage={canManage} people={people} /> : tab === "opportunities" ? <Opportunities relId={r.id} canManage={canManage} people={people} /> : tab === "hospitality" ? <Hospitality relId={r.id} canManage={canManage} /> : tab === "network" ? <Network relId={r.id} /> : tab === "connections" ? <RelationshipTree relId={r.id} /> : tab === "people" ? <People relId={r.id} partnerId={r.partnerId} canManage={canManage} /> : tab !== "overview" ? <Detail360 relId={r.id} partnerId={r.partnerId} tab={tab} card={card} canManage={canManage} /> : (<>
          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 14px", margin: "6px 0 0" }}>
            <dt style={dt}>Health</dt>
            <dd style={dd}>{CRM_HEALTH_LABELS[r.health]}{r.healthReasons.length ? `: ${r.healthReasons.join("; ")}` : ". Nothing is overdue and the stakeholder is approved."}{r.healthOverride && <> A manager has recorded <strong>{CRM_HEALTH_LABELS[r.healthOverride]}</strong>: {r.healthOverrideReason}</>} <SourceNote keys={["health"]} /></dd>
            <dt style={dt}>Stakeholder approval</dt><dd style={dd}>{r.approvalStatus ? humanise(r.approvalStatus) : "Not known"}{r.riskTier ? ` · ${humanise(r.riskTier)} risk` : ""}</dd>
            <dt style={dt}>Quality scorecard</dt>
            <dd style={dd}>{card === null ? "Loading…" : card === "none" ? "Not available." : card.overallScore === null ? "Not enough data yet." : <><strong>{Math.round(card.overallScore)}</strong> out of 100, {humanise(card.scoreBand)}{card.attention.length ? `. Needs attention: ${card.attention.join(", ")}` : ""}. Based on {Math.round(card.coverage)}% of the measures.</>}</dd>
            <dt style={dt}>Open complaints</dt><dd style={dd}>{r.openComplaints === null ? "Not shown (restricted to quality roles)" : r.openComplaints}</dd>
            <dt style={dt}>Certificates</dt><dd style={dd}>{r.certsExpired ? `${r.certsExpired} expired` : "None expired"}{r.certsExpiringSoon ? `, ${r.certsExpiringSoon} expiring within 60 days` : ""}</dd>
            <dt style={dt}>Last reviewed</dt><dd style={dd}>{fmtDate(r.lastReviewedAt)}</dd>
            <dt style={dt}>Next review due</dt><dd style={dd}>{fmtDate(r.nextReviewDue)} (every {r.reviewIntervalMonths} months)</dd>
            <dt style={dt}>Tags</dt><dd style={dd}><Tags r={r} allTags={allTags} canManage={canManage} onChanged={(m) => onSaved(`${r.name}: ${m}`)} onError={onError} /></dd>
            <dt style={dt}>In the CRM since</dt><dd style={dd}>{fmtDate(r.createdAt)}</dd>
          </dl>
          <RowGaps r={r} pmHref={pmHref} canManage={canManage} />
          <Profile360 r={r} />
          <CategoryPanel relId={r.id} />
          {canManage ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <Field label="Owner"><select data-field="owner" className="u-native-select" style={inputStyle} value={draft.ownerUserId} onChange={(e) => setDraft({ ...draft, ownerUserId: e.target.value })}><option value="">No owner</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                <Field label="Tier"><select className="u-native-select" style={inputStyle} value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value as CrmTier })}>{CRM_TIERS.map((t) => <option key={t} value={t}>{CRM_TIER_LABELS[t]}</option>)}</select></Field>
                <Field label="Status"><select className="u-native-select" style={inputStyle} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as CrmStatus })}>{CRM_STATUSES.map((t) => <option key={t} value={t}>{CRM_STATUS_LABELS[t]}</option>)}</select></Field>
                <Field label="Review every (months)"><input type="number" min={1} max={60} style={inputStyle} value={draft.reviewIntervalMonths} onChange={(e) => setDraft({ ...draft, reviewIntervalMonths: Number(e.target.value) })} /></Field>
                <Field label="Manager's view of health" hint="Optional. Shown beside the calculated health, never instead of it."><select className="u-native-select" style={inputStyle} value={draft.healthOverride} onChange={(e) => setDraft({ ...draft, healthOverride: e.target.value as CrmHealth | "" })}><option value="">No override</option>{CRM_HEALTH.map((t) => <option key={t} value={t}>{CRM_HEALTH_LABELS[t]}</option>)}</select></Field>
                {draft.healthOverride && <Field label="Reason for the override"><input style={inputStyle} maxLength={500} value={draft.healthOverrideReason} onChange={(e) => setDraft({ ...draft, healthOverrideReason: e.target.value })} /></Field>}
              </div>
              <Field label="Summary" hint="A few lines on what this relationship is for and what matters. Do not record personal opinions about individuals."><textarea data-field="summary" style={{ ...inputStyle, minHeight: 70 }} maxLength={2000} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button size="sm" variant="primary" disabled={busy || (!!draft.healthOverride && !draft.healthOverrideReason.trim())} onClick={() => save()}>Save</Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => save({ markReviewed: true }, "marked as reviewed.")}>Mark as reviewed today</Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => save({ archived: true }, "archived.")}>Archive</Button>
              </div>
            </>
          ) : r.summary && <p style={{ margin: 0 }}>{r.summary}</p>}
          {pmHref && r.partnerId && <p style={{ margin: 0 }}><a href={`${pmHref}/partners/detail?id=${r.partnerId}`}>Open the full stakeholder record in Project Management</a></p>}
          </>)}
          </div>
        </div>
      )}
    </div>
  );
}


/** "Make this richer" for one stakeholder: what is missing, what filling it in improves, and a link straight to the field. */
function RowGaps({ r, pmHref, canManage }: { r: CrmRelationshipRow; pmHref: string | undefined; canManage: boolean }) {
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search); const f = sp.get("focus");
    if (!f || sp.get("id") !== r.id) return;
    const t = setTimeout(() => { const el = document.querySelector<HTMLElement>(`[data-field="${f.replace(/[^a-z]/gi, "")}"]`); if (el) { el.scrollIntoView({ block: "center" }); el.focus(); } }, 700);
    return () => clearTimeout(t);
  }, [r.id]);
  const here = (field: string) => `/relationships?id=${r.id}&focus=${field}`;
  const gaps: DataGap[] = [];
  if (canManage && !r.ownerUserId && r.status !== "ENDED") gaps.push({ key: "owner", label: "No owner", benefit: "Review and quiet-relationship reminders have nobody to go to.", count: 1, total: 1, href: here("owner"), fixLabel: "Choose an owner" });
  if (canManage && !r.summary && r.status !== "ENDED") gaps.push({ key: "summary", label: "No summary", benefit: "Colleagues cannot see at a glance what this relationship is for.", count: 1, total: 1, href: here("summary"), fixLabel: "Write a summary" });
  if (!r.countryCode) gaps.push({ key: "country", label: "No country on the stakeholder record", benefit: "It is missing from the Portfolio map and from country filters.", count: 1, total: 1, href: r.partnerId && pmHref ? `${pmHref}/partners/detail?id=${r.partnerId}&focus=country` : null, fixLabel: r.partnerId && pmHref ? "Add it in Project Management" : null });
  return <DataHints gaps={gaps} />;
}
