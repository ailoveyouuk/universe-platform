"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { categoryLabel, PARTNER_ROLE_TYPES, STAKEHOLDER_CATEGORY_KEYS, CRM_STATUS_LABELS, CRM_STATUSES, CRM_WORK_FILTER_LABELS, CRM_WORK_FILTERS, type CrmPortfolioMap, type CrmRelationshipPage, type CrmTag } from "@universe/types";
import { BanIcon, CheckCircleIcon, ClipboardCheckIcon, Pagination, Pill, ProjectsIcon, SearchInput, Select, StatTile, StatTileGrid, TrendingUpIcon, WorldMap, type PageSize, type WorldMapPoint } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { accentVar } from "../../lib/category";
import { ErrorNote, Heading, Page, fmtDate, humanise } from "../../lib/ui";
import { useCountries } from "../../lib/useCountries";
import { sinceAgo, WORK_STATUS_TONE } from "../../lib/since";
import { SavedFilters } from "../../components/SavedFilters";
import { useCurrentUser } from "../../lib/AuthContext";
import { PORTFOLIO_COLUMNS } from "../../components/PortfolioStrip";

type Filters = { q: string; role: string; status: string; work: string; tag: string; country: string };
const EMPTY: Filters = { q: "", role: "", status: "", work: "", tag: "", country: "" };
const KIND_COLOUR: Record<string, string> = { ...Object.fromEntries(STAKEHOLDER_CATEGORY_KEYS.map((k) => [k, accentVar(k)])), OTHER: "var(--u-module-admin)" };
const TILES = [
  { key: "inProgress", work: "in_progress", label: "In progress", icon: <ProjectsIcon />, tone: "brand" as const },
  { key: "submitted", work: "submitted", label: "Submitted", icon: <ClipboardCheckIcon />, tone: "warning" as const },
  { key: "awarded", work: "awarded", label: "Awarded, under way", icon: <TrendingUpIcon />, tone: "good" as const },
  { key: "completed", work: "completed", label: "Completed", icon: <CheckCircleIcon />, tone: "neutral" as const },
  { key: "unawarded", work: "unawarded", label: "Unawarded or declined", icon: <BanIcon />, tone: "critical" as const },
];
const ROLE_OPTIONS = PARTNER_ROLE_TYPES;
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", color: "var(--u-ink-secondary)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--u-border)", whiteSpace: "nowrap" };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top", fontSize: 13.5 };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

/**
 * Portfolio: every stakeholder with how much work there has been together, by outcome, plus their people, places and sites.
 * The counts come from Project Management's projects (one project counts once per stakeholder). Filtered, counted and paged by the database.
 */
export default function Portfolio() {
  const me = useCurrentUser();
  const canManage = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const [f, setF] = useState<Filters>(EMPTY);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [data, setData] = useState<CrmRelationshipPage | null>(null);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dq, setDq] = useState("");
  const [map, setMap] = useState<CrmPortfolioMap | null>(null);
  const countries = useCountries();
  const seq = useRef(0);
  useEffect(() => { const p = new URLSearchParams(window.location.search); setF({ q: p.get("q") ?? "", role: p.get("role") ?? "", status: p.get("status") ?? "", work: p.get("work") ?? "", tag: p.get("tag") ?? "", country: p.get("country") ?? "" }); setReady(true); }, []);
  useEffect(() => { apiClient.crmTags().then(setTags).catch(() => setTags([])); }, []);
  useEffect(() => { const t = setTimeout(() => setDq(f.q), 250); return () => clearTimeout(t); }, [f.q]);
  const load = useCallback(() => {
    if (!ready) return;
    const mine = ++seq.current; setBusy(true);
    apiClient.crmRelationships({ ...f, q: dq, view: "portfolio", page, pageSize: pageSize === "all" ? 100 : pageSize, sort: "name" })
      .then((d) => { if (mine === seq.current) { setData(d); setErr(null); } })
      .catch((e) => { if (mine === seq.current) setErr(e instanceof Error ? e.message : "Could not load the portfolio."); })
      .finally(() => { if (mine === seq.current) setBusy(false); });
  }, [f, dq, page, pageSize, ready]);
  useEffect(() => { load(); }, [load]);
  // The map follows every filter except the country you pick on it, so you can still see the other countries to change your mind.
  useEffect(() => {
    if (!ready) return;
    let live = true; const { country: _c, ...rest } = f;
    apiClient.crmPortfolioMap({ ...rest, q: dq }).then((m) => { if (live) setMap(m); }).catch(() => { if (live) setMap(null); });
    return () => { live = false; };
  }, [f.role, f.status, f.work, f.tag, dq, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const points: WorldMapPoint[] = (map?.points ?? []).flatMap((p) => {
    const c = byCode.get(p.countryCode); if (!c || c.latitude === null || c.longitude === null) return [];
    return [{ id: `${p.countryCode}:${p.kind}`, latitude: c.latitude, longitude: c.longitude, label: `${c.name}: ${categoryLabel(p.kind)}`, color: KIND_COLOUR[p.kind] ?? KIND_COLOUR.OTHER, value: p.count, tooltipLines: [{ text: `${p.count} stakeholder${p.count === 1 ? "" : "s"}` }, { text: "Select to filter the table" }] }];
  });
  const legend = Object.keys(KIND_COLOUR).filter((k) => (map?.points ?? []).some((p) => p.kind === k)).map((k) => ({ color: KIND_COLOUR[k], label: k === "OTHER" ? "Other" : categoryLabel(k) }));
  const set = (patch: Partial<Filters>) => { setF((c) => ({ ...c, ...patch })); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const noProjects = data?.items.length ? data.items.every((i) => i.portfolio === null) : false;

  return (
    <Page>
      <Heading title="Portfolio" sub="Every stakeholder with the work you have done together, by outcome, and where and with whom they operate. Counts come from Project Management; a project counts once per stakeholder." />
      <ErrorNote message={err} />
      <SavedFilters view="PORTFOLIO" current={f} onApply={(sf) => { setF({ ...EMPTY, ...sf }); setPage(1); }} canShare={canManage} onError={setErr} />
      {(!map || map.work) && <StatTileGrid>
        {TILES.map((t) => <StatTile key={t.key} label={t.label} value={map?.work ? map.work[t.work] : undefined} icon={t.icon} tone={t.tone} active={f.work === t.work} onClick={() => set({ work: f.work === t.work ? "" : t.work })} />)}
      </StatTileGrid>}
      <section aria-label="Where your stakeholders are based" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg, 12px)", padding: 10, display: "grid", gap: 6 }}>
        <WorldMap points={points} legend={legend} maxHeight={360} cluster={false} onPointClick={(p) => set({ country: p.id.split(":")[0] === f.country ? "" : p.id.split(":")[0] })} emptyMessage={map ? "No stakeholders with a country match these filters." : "Loading the map…"} />
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Pips show where each kind of stakeholder is based, sized by how many. Select one to filter the table to that country.{map?.noCountry ? ` ${map.noCountry} have no country recorded.` : ""}{map?.capped ? " Showing the first 6,000." : ""}</p>
        {f.country && <p style={{ margin: 0, fontSize: 13 }}>Showing {byCode.get(f.country)?.name ?? f.country}. <button type="button" onClick={() => set({ country: "" })} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--u-link, var(--u-brand-violet))", textDecoration: "underline", cursor: "pointer" }}>Show all countries</button></p>}
      </section>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}><SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Search name or country…" /></div>
        <div style={{ minWidth: 170 }}><Select value={f.role} onChange={(v) => set({ role: v })} allLabel="Any kind of stakeholder" options={ROLE_OPTIONS.map((t) => ({ value: t, label: categoryLabel(t) }))} ariaLabel="Filter by kind of stakeholder" /></div>
        <div style={{ minWidth: 190 }}><Select value={f.work} onChange={(v) => set({ work: v })} allLabel="Any work history" options={CRM_WORK_FILTERS.map((w) => ({ value: w, label: CRM_WORK_FILTER_LABELS[w] }))} ariaLabel="Filter by work history" /></div>
        <div style={{ minWidth: 150 }}><Select value={f.status} onChange={(v) => set({ status: v })} allLabel="Any status" options={CRM_STATUSES.map((t) => ({ value: t, label: CRM_STATUS_LABELS[t] }))} ariaLabel="Filter by relationship status" /></div>
        {tags.length > 0 && <div style={{ minWidth: 160 }}><Select value={f.tag} onChange={(v) => set({ tag: v })} allLabel="Any tag" options={tags.map((t) => ({ value: t.id, label: `${t.name} (${t.count})` }))} ariaLabel="Filter by tag" /></div>}
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} stakeholder${data.total === 1 ? "" : "s"}` : "Loading…"}</span>
      </div>
      {noProjects && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Project counts are hidden because your account cannot view projects. Ask your administrator for the Project Management app and project access.</p>}
      <div style={{ overflowX: "auto", opacity: busy && data ? 0.55 : 1, transition: "opacity .15s" }} aria-busy={busy}>
        <table aria-label="Stakeholder portfolio" style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
          <thead>
            <tr>
              <th scope="col" style={th}>Stakeholder</th><th scope="col" style={th}>Kind</th><th scope="col" style={th}>Location</th><th scope="col" style={th}>Added</th><th scope="col" style={th}>Last project</th>
              <th scope="col" style={thNum}>Contacts</th><th scope="col" style={thNum}>Sites</th>
              {PORTFOLIO_COLUMNS.map((c) => <th key={c.key} scope="col" style={thNum}>{c.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td style={td}><Link href={`/relationships?id=${r.id}`}><strong>{r.name}</strong></Link></td>
                <td style={td}>{r.roles.map(categoryLabel).join(", ") || "—"}</td>
                <td style={td}>{[r.countryCode, ...(r.siteCountries ?? []).filter((c) => c !== r.countryCode)].filter(Boolean).join(", ") || "—"}</td>
                <td style={td}>{r.partnerAddedAt ? <>{fmtDate(r.partnerAddedAt)}<br /><span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{sinceAgo(r.partnerAddedAt)}</span></> : "—"}</td>
                <td style={td}>{r.portfolio?.lastProject ? <>{fmtDate(r.portfolio.lastProject.date)} <Pill tone={WORK_STATUS_TONE[r.portfolio.lastProject.status] ?? "neutral"}>{humanise(r.portfolio.lastProject.status)}</Pill><br /><span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{r.portfolio.lastProject.referenceNumber} · {sinceAgo(r.portfolio.lastProject.date)}</span></> : "—"}</td>
                <td style={tdNum}>{r.contactCount ?? "—"}</td>
                <td style={tdNum}>{r.siteCount ?? "—"}</td>
                {PORTFOLIO_COLUMNS.map((c) => <td key={c.key} style={tdNum}>{r.portfolio ? r.portfolio[c.key] : "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.items.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No stakeholders match these filters.</p>}
      {data && <Pagination pageSize={pageSize} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} page={page} pageCount={pages} onPageChange={setPage} totalCount={data.total} />}
    </Page>
  );
}
