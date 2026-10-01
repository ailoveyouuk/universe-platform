"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProjectSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import {
  StatusBadge,
  Button,
  PlusIcon,
  TextLink,
  SearchInput,
  SortableHeader,
  Pagination,
  Select,
  ProjectsIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon,
  type PageSize,
} from "@universe/ui";

const ACTIVE_STAGES = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED", "AWARDED", "COMPLETED"] as const;
const TERMINAL_STAGES = ["UNAWARDED", "DECLINED", "CANCELLED"] as const;
const ALL_STATUSES = [...ACTIVE_STAGES, ...TERMINAL_STAGES] as const;
const PROJECT_TYPES = ["PHARMACEUTICAL", "NON_PHARMACEUTICAL"] as const;

type SortKey = "reference" | "title" | "client" | "status" | "due" | "daysLeft";

/**
 * Full Projects list — reworked 2026-10-01 (Lewis's instruction) from a
 * single unfiltered table into: a section dashboard of key counts (each
 * clickable, filtering the table below), free-text search, status/type
 * filters, click-to-sort columns, and page-size paging (10/25/50/All).
 * Everything here is client-side over the existing listProjects() call —
 * no new API surface — since the list is small enough for that to be
 * instant; revisit server-side filtering if the project count grows large
 * enough to matter.
 */
export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  // Deep-linkable from the dashboard's stat tiles, e.g. /projects?status=SUBMITTED.
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    apiClient
      .listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
  }, []);

  const stats = useMemo(() => {
    const list = projects ?? [];
    const active = list.filter((p) => !TERMINAL_STAGES.includes(p.status as any) && p.status !== "COMPLETED");
    const submitted = list.filter((p) => p.status === "SUBMITTED");
    const awarded = list.filter((p) => p.status === "AWARDED" || p.status === "COMPLETED");
    const overdue = list.filter(
      (p) => p.dueDate && new Date(p.dueDate) < new Date() && !["COMPLETED", "AWARDED", ...TERMINAL_STAGES].includes(p.status as any)
    );
    return { active: active.length, submitted: submitted.length, awarded: awarded.length, overdue: overdue.length };
  }, [projects]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (typeFilter && p.projectType !== typeFilter) return false;
      if (q) {
        const haystack = `${p.referenceNumber} ${p.title} ${p.clientName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter, typeFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "reference":
          return a.referenceNumber.localeCompare(b.referenceNumber) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "client":
          return (a.clientName ?? "").localeCompare(b.clientName ?? "") * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "daysLeft":
          return ((a.daysRemainingForSubmission ?? Infinity) - (b.daysRemainingForSubmission ?? Infinity)) * dir;
        case "due":
        default: {
          const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return (at - bt) * dir;
        }
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("asc");
    }
    setPage(0);
  }

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = pageSize === "all" ? sorted : sorted.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Projects</h1>
        <Link href="/projects/new" style={{ textDecoration: "none" }}>
          <Button variant="primary" icon={<PlusIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))">
            New Project
          </Button>
        </Link>
      </div>

      {/* Section dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
        <SectionStat label="Active" value={stats.active} icon={<ProjectsIcon size={18} />} onClick={() => { setStatusFilter(""); setPage(0); }} active={statusFilter === ""} />
        <SectionStat label="Submitted" value={stats.submitted} icon={<ClockIcon size={18} />} onClick={() => { setStatusFilter("SUBMITTED"); setPage(0); }} active={statusFilter === "SUBMITTED"} />
        <SectionStat label="Awarded / Completed" value={stats.awarded} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => { setStatusFilter("AWARDED"); setPage(0); }} active={statusFilter === "AWARDED"} />
        <SectionStat label="Overdue" value={stats.overdue} icon={<AlertIcon size={18} />} tone="warning" onClick={() => { setSearch(""); setStatusFilter(""); setSortKey("due"); setSortDir("asc"); setPage(0); }} active={false} />
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by reference, title, client…" />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(0); }}
          options={ALL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
          allLabel="All statuses"
          ariaLabel="Filter by status"
        />
        <Select
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(0); }}
          options={PROJECT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
          allLabel="All types"
          ariaLabel="Filter by project type"
        />
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!projects && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {projects && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <SortableHeader label="Reference" sortKey="reference" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Title" sortKey="title" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Client" sortKey="client" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Due" sortKey="due" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Days Left" sortKey="daysLeft" activeKey={sortKey} direction={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                  <td style={{ padding: 8 }}>
                    <Link href={`/projects/detail?id=${p.id}`} style={{ textDecoration: "none" }}>
                      <TextLink as="span">{p.referenceNumber}</TextLink>
                    </Link>
                  </td>
                  <td style={{ padding: 8, color: "var(--u-ink)" }}>{p.title}</td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{p.clientName ?? "—"}</td>
                  <td style={{ padding: 8 }}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{p.daysRemainingForSubmission ?? "—"}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
                    No projects match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={sorted.length}
          />
        </>
      )}
    </main>
  );
}

function SectionStat({
  label,
  value,
  icon,
  onClick,
  active,
  tone = "brand",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
  tone?: "brand" | "good" | "warning";
}) {
  const colors: Record<string, string> = {
    brand: "var(--u-org-accent, var(--u-brand-violet))",
    good: "var(--u-status-good)",
    warning: "var(--u-status-warning)",
  };
  const color = colors[tone];
  return (
    <button
      onClick={onClick}
      className="u-card-hover"
      style={{
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: "var(--u-radius-lg)",
        border: active ? `1px solid ${color}` : "1px solid var(--u-border)",
        backgroundColor: active ? "var(--u-accent-magenta-tint)" : "var(--u-surface-raised)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color, display: "flex" }}>{icon}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{value}</span>
    </button>
  );
}

