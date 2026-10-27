"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CRM_PROJECT_PART_LABELS, CRM_PROJECT_PARTS, type CrmProjectPage, type CrmProjectPart } from "@universe/types";
import { BanIcon, CheckCircleIcon, ClipboardCheckIcon, Pagination, Pill, ProjectsIcon, SearchInput, StatTile, StatTileGrid, TrendingUpIcon, UNIVERSE_APPS, type PageSize } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { fmtDate, humanise } from "../lib/ui";
import { WORK_STATUS_TONE } from "../lib/since";

type Bucket = "inProgress" | "submitted" | "awarded" | "completed" | "unawarded";
const TILES: { key: Bucket; label: string; icon: React.ReactNode; tone: "brand" | "warning" | "good" | "neutral" | "critical" }[] = [
  { key: "inProgress", label: "In progress", icon: <ProjectsIcon />, tone: "brand" },
  { key: "submitted", label: "Submitted", icon: <ClipboardCheckIcon />, tone: "warning" },
  { key: "awarded", label: "Awarded, under way", icon: <TrendingUpIcon />, tone: "good" },
  { key: "completed", label: "Completed", icon: <CheckCircleIcon />, tone: "neutral" },
  { key: "unawarded", label: "Unawarded or declined", icon: <BanIcon />, tone: "critical" },
];

/** A stakeholder's projects: tiles by outcome that drill into a short list, with a filter for the part they played and a search. The database does the filtering. */
export function WorkTab({ relId }: { relId: string }) {
  const [bucket, setBucket] = useState<Bucket | "">("");
  const [part, setPart] = useState<CrmProjectPart | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [data, setData] = useState<CrmProjectPage | null>(null);
  const [counts, setCounts] = useState<CrmProjectPage["counts"]>(null);
  const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0);
  const pm = UNIVERSE_APPS.find((a) => a.key === "project-management")?.href;
  const size = pageSize === "all" ? 50 : pageSize;
  const load = useCallback(() => {
    const mine = ++seq.current;
    apiClient.crmProjects(relId, { bucket, part, q, page, pageSize: size })
      .then((r) => { if (mine !== seq.current) return; setData(r); setCounts(r.counts); setErr(null); })
      .catch((e) => { if (mine === seq.current) setErr(e instanceof Error ? e.message : "Could not load projects."); });
  }, [relId, bucket, part, q, page, size]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  if (err && !data) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{err}</p>;
  if (!data) return <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Loading…</p>;
  const pageCount = Math.max(1, Math.ceil(data.total / size));
  const filtered = !!(bucket || part || q);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {counts && (
        <StatTileGrid>
          {TILES.map((t) => <StatTile key={t.key} label={t.label} value={counts[t.key]} icon={t.icon} tone={t.tone} active={bucket === t.key} onClick={() => { setBucket(bucket === t.key ? "" : t.key); setPage(1); }} />)}
        </StatTileGrid>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: "1 1 220px" }}><SearchInput value={q} onChange={(v: string) => { setQ(v); setPage(1); }} placeholder="Search by reference or title" /></div>
        <label style={{ display: "grid", gap: 3, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Their part
          <select className="u-native-select" value={part} onChange={(e) => { setPart(e.target.value as CrmProjectPart | ""); setPage(1); }} style={{ minHeight: 36, padding: "0 10px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", background: "var(--u-surface)", color: "var(--u-ink)", font: "inherit" }}>
            <option value="">Any part</option>{CRM_PROJECT_PARTS.map((p) => <option key={p} value={p}>{CRM_PROJECT_PART_LABELS[p]}</option>)}
          </select>
        </label>
        {filtered && <button type="button" onClick={() => { setBucket(""); setPart(""); setQ(""); setPage(1); }} style={{ minHeight: 36, background: "none", border: "none", color: "var(--u-link, var(--u-brand-violet))", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Clear filters</button>}
      </div>
      <p role="status" style={{ margin: 0, color: "var(--u-ink-secondary)", fontSize: 13 }}>{data.total === 0 ? (filtered ? "No projects match those filters." : "No projects involve this stakeholder yet.") : `${data.total} project${data.total === 1 ? "" : "s"}${bucket ? `: ${TILES.find((t) => t.key === bucket)?.label.toLowerCase()}` : ""}.`}</p>
      {data.items.length > 0 && (
        <ul aria-label="Projects" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {data.items.map((p) => (
            <li key={p.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13.5 }}>
              {pm ? <a href={`${pm}/projects/detail?id=${p.id}`}><strong>{p.referenceNumber}</strong> · {p.title}</a> : <span><strong>{p.referenceNumber}</strong> · {p.title}</span>}
              <Pill tone={WORK_STATUS_TONE[p.status] ?? "neutral"}>{humanise(p.status)}</Pill>
              <span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{p.involvement.join(", ") || "—"} · Added {fmtDate(p.createdAt)}{p.dueDate ? ` · Due ${fmtDate(p.dueDate)}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
      {data.total > 10 && <Pagination pageSize={pageSize} onPageSizeChange={(s: PageSize) => { setPageSize(s); setPage(1); }} page={page} pageCount={pageCount} onPageChange={setPage} totalCount={data.total} />}
    </div>
  );
}
