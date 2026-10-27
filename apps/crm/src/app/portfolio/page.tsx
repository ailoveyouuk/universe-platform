"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CRM_STATUS_LABELS, CRM_STATUSES, CRM_WORK_FILTER_LABELS, CRM_WORK_FILTERS, type CrmRelationshipPage, type CrmTag } from "@universe/types";
import { Pagination, SearchInput, Select, type PageSize } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { ErrorNote, Heading, Page, humanise } from "../../lib/ui";
import { PORTFOLIO_COLUMNS } from "../../components/PortfolioStrip";

type Filters = { q: string; role: string; status: string; work: string; tag: string };
const EMPTY: Filters = { q: "", role: "", status: "", work: "", tag: "" };
const ROLE_OPTIONS = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "CLIENT", "WAREHOUSING"];
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", color: "var(--u-ink-secondary)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--u-border)", whiteSpace: "nowrap" };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top", fontSize: 13.5 };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

/**
 * Portfolio: every stakeholder with how much work there has been together, by outcome, plus their people, places and sites.
 * The counts come from Project Management's projects (one project counts once per stakeholder). Filtered, counted and paged by the database.
 */
export default function Portfolio() {
  const [f, setF] = useState<Filters>(EMPTY);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [data, setData] = useState<CrmRelationshipPage | null>(null);
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dq, setDq] = useState("");
  const seq = useRef(0);
  useEffect(() => { const p = new URLSearchParams(window.location.search); setF({ q: p.get("q") ?? "", role: p.get("role") ?? "", status: p.get("status") ?? "", work: p.get("work") ?? "", tag: p.get("tag") ?? "" }); setReady(true); }, []);
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
  const set = (patch: Partial<Filters>) => { setF((c) => ({ ...c, ...patch })); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const noProjects = data?.items.length ? data.items.every((i) => i.portfolio === null) : false;

  return (
    <Page>
      <Heading title="Portfolio" sub="Every stakeholder with the work you have done together, by outcome, and where and with whom they operate. Counts come from Project Management; a project counts once per stakeholder." />
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}><SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Search name or country…" /></div>
        <div style={{ minWidth: 170 }}><Select value={f.role} onChange={(v) => set({ role: v })} allLabel="Any kind of stakeholder" options={ROLE_OPTIONS.map((t) => ({ value: t, label: humanise(t) }))} ariaLabel="Filter by kind of stakeholder" /></div>
        <div style={{ minWidth: 190 }}><Select value={f.work} onChange={(v) => set({ work: v })} allLabel="Any work history" options={CRM_WORK_FILTERS.map((w) => ({ value: w, label: CRM_WORK_FILTER_LABELS[w] }))} ariaLabel="Filter by work history" /></div>
        <div style={{ minWidth: 150 }}><Select value={f.status} onChange={(v) => set({ status: v })} allLabel="Any status" options={CRM_STATUSES.map((t) => ({ value: t, label: CRM_STATUS_LABELS[t] }))} ariaLabel="Filter by relationship status" /></div>
        {tags.length > 0 && <div style={{ minWidth: 160 }}><Select value={f.tag} onChange={(v) => set({ tag: v })} allLabel="Any tag" options={tags.map((t) => ({ value: t.id, label: `${t.name} (${t.count})` }))} ariaLabel="Filter by tag" /></div>}
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} stakeholder${data.total === 1 ? "" : "s"}` : "Loading…"}</span>
      </div>
      {noProjects && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Project counts are hidden because your account cannot view projects. Ask your administrator for the Project Management app and project access.</p>}
      <div style={{ overflowX: "auto", opacity: busy && data ? 0.55 : 1, transition: "opacity .15s" }} aria-busy={busy}>
        <table aria-label="Stakeholder portfolio" style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
          <thead>
            <tr>
              <th scope="col" style={th}>Stakeholder</th><th scope="col" style={th}>Kind</th><th scope="col" style={th}>Location</th>
              <th scope="col" style={thNum}>Contacts</th><th scope="col" style={thNum}>Sites</th>
              {PORTFOLIO_COLUMNS.map((c) => <th key={c.key} scope="col" style={thNum}>{c.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td style={td}><Link href={`/relationships?id=${r.id}`}><strong>{r.name}</strong></Link></td>
                <td style={td}>{r.roles.map(humanise).join(", ") || "—"}</td>
                <td style={td}>{[r.countryCode, ...(r.siteCountries ?? []).filter((c) => c !== r.countryCode)].filter(Boolean).join(", ") || "—"}</td>
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
