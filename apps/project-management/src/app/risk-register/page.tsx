"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { RiskAssessmentListItem, UserSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import {
  SearchInput,
  Select,
  SortableHeader,
  Pagination,
  StatTile,
  Button,
  AlertIcon,
  ShieldIcon,
  ClockIcon,
  type PageSize,
} from "@universe/ui";
import { AuditHistory } from "../../components/AuditHistory";

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];
const LIKELIHOOD_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];
const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "MITIGATED", label: "Mitigated" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "CLOSED", label: "Closed" },
];
// Matches RISK_SUBJECT_TYPES in apps/api/src/risk-assessments/dto/create-risk-assessment.dto.ts.
const SUBJECT_TYPE_OPTIONS = [
  { value: "PARTNER", label: "Stakeholder" },
  { value: "PROJECT", label: "Project" },
  { value: "PRODUCT_BATCH", label: "Product batch" },
  { value: "OTHER", label: "Other" },
];

type SortKey = "title" | "subject" | "severity" | "status" | "review";

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
  fontSize: 13,
};
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: 60, resize: "vertical" };

/** Same convention as RiskRegister.tsx's severityStyle — Pill (@universe/ui)
 * has no "critical" tone, so CRITICAL/HIGH is a plain custom-coloured span
 * rather than inventing a second colour mapping for the same field. */
function severityStyle(severity: string): { bg: string; fg: string } {
  if (severity === "CRITICAL" || severity === "HIGH") return { bg: "rgba(220,38,38,0.1)", fg: "var(--u-status-critical)" };
  if (severity === "MEDIUM") return { bg: "rgba(250,178,25,0.16)", fg: "#946014" };
  return { bg: "var(--u-surface-alt)", fg: "var(--u-ink-secondary)" };
}

function subjectTypeLabel(subjectType: string): string {
  return SUBJECT_TYPE_OPTIONS.find((o) => o.value === subjectType)?.label ?? subjectType.replace(/_/g, " ");
}

/**
 * Risk Register — the cross-cutting view of RiskAssessment, added as a
 * follow-up to RiskRegister.tsx (the embedded, per-subject widget already
 * on Partner/Project detail pages — see that component's doc comment).
 * This page is deliberately the other half of the same feature, not a
 * replacement: the embedded widget stays for "what risks does THIS
 * partner/project carry", this page is for "what does the whole risk
 * register look like right now across every subject" — a compliance or
 * QA lead's working view, with the full edit surface (every field, not
 * just status) and the audit trail for whichever risk is open.
 *
 * GET /risk-assessments/all resolves each row's subject display name
 * server-side (RiskAssessmentsService.listAll) so this table never needs
 * a second round-trip per row to show "Partner: Rhein Pharma" next to a
 * risk's title.
 */
export default function RiskRegisterPage() {
  const [risks, setRisks] = useState<RiskAssessmentListItem[] | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("review");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState<RiskAssessmentListItem | null>(null);

  function reload() {
    apiClient
      .listAllRiskAssessments()
      .then((data) => {
        setRisks(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the risk register"));
  }

  useEffect(() => {
    reload();
    apiClient.listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(() => {
    if (!risks) return [];
    const q = search.trim().toLowerCase();
    return risks.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (severityFilter && r.severity !== severityFilter) return false;
      if (subjectTypeFilter && r.subjectType !== subjectTypeFilter) return false;
      if (q) {
        const haystack = `${r.title} ${r.description ?? ""} ${r.subjectName} ${r.mitigation ?? ""} ${r.ownerName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [risks, search, statusFilter, severityFilter, subjectTypeFilter]);

  const SEVERITY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "subject":
          return a.subjectName.localeCompare(b.subjectName) * dir;
        case "severity":
          return ((SEVERITY_RANK[a.severity] ?? -1) - (SEVERITY_RANK[b.severity] ?? -1)) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "review":
        default:
          return ((a.reviewDate ? new Date(a.reviewDate).getTime() : Infinity) - (b.reviewDate ? new Date(b.reviewDate).getTime() : Infinity)) * dir;
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

  const counts = useMemo(() => {
    const all = risks ?? [];
    const now = Date.now();
    let open = 0;
    let highOrCritical = 0;
    let overdue = 0;
    for (const r of all) {
      if (r.status === "OPEN" || r.status === "MITIGATED") {
        if (r.severity === "HIGH" || r.severity === "CRITICAL") highOrCritical += 1;
        if (r.reviewDate && new Date(r.reviewDate).getTime() < now) overdue += 1;
      }
      if (r.status === "OPEN") open += 1;
    }
    return { total: all.length, open, highOrCritical, overdue };
  }, [risks]);

  function clearFilters() {
    setStatusFilter("");
    setSeverityFilter("");
    setSubjectTypeFilter("");
    setPage(0);
  }

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertIcon size={22} /> Risk Register
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14, maxWidth: 620 }}>
            Every risk logged against a stakeholder, project or product batch, in one place. Click a row to edit it in
            full or review its audit history — logging a new risk still happens from the record itself.
          </p>
        </div>
      </div>

      {/* Section dashboard — key counts at a glance, each a working filter shortcut. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 24 }}>
        <StatTile label="Total risks" value={counts.total} icon={<ShieldIcon size={18} />} onClick={clearFilters} active={!statusFilter && !severityFilter && !subjectTypeFilter} />
        <StatTile label="Open" value={counts.open} icon={<AlertIcon size={18} />} tone="warning" onClick={() => { setStatusFilter("OPEN"); setPage(0); }} active={statusFilter === "OPEN"} />
        <StatTile label="High / critical, unresolved" value={counts.highOrCritical} icon={<AlertIcon size={18} />} tone="critical" onClick={() => { setSeverityFilter("HIGH"); setStatusFilter(""); setPage(0); }} active={severityFilter === "HIGH" || severityFilter === "CRITICAL"} />
        <StatTile label="Review overdue" value={counts.overdue} icon={<ClockIcon size={18} />} tone="neutral" />
      </div>

      {editing && (
        <RiskEditPanel
          risk={editing}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by title, subject, mitigation, owner…" />
        <Select
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(0); }}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
          ariaLabel="Filter by status"
        />
        <Select
          value={severityFilter}
          onChange={(v) => { setSeverityFilter(v); setPage(0); }}
          options={SEVERITY_OPTIONS}
          allLabel="All severities"
          ariaLabel="Filter by severity"
        />
        <Select
          value={subjectTypeFilter}
          onChange={(v) => { setSubjectTypeFilter(v); setPage(0); }}
          options={SUBJECT_TYPE_OPTIONS}
          allLabel="All subject types"
          ariaLabel="Filter by subject type"
        />
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!risks && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {risks && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <SortableHeader label="Risk" sortKey="title" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Subject" sortKey="subject" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Severity" sortKey="severity" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Owner</th>
                <SortableHeader label="Review by" sortKey="review" activeKey={sortKey} direction={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const overdue = r.reviewDate && new Date(r.reviewDate).getTime() < Date.now() && (r.status === "OPEN" || r.status === "MITIGATED");
                return (
                  <tr
                    key={r.id}
                    onClick={() => setEditing(r)}
                    className="u-card-hover"
                    style={{ borderBottom: "1px solid var(--u-border)", cursor: "pointer" }}
                  >
                    <td style={{ padding: 8, fontWeight: 600, color: "var(--u-ink)" }}>{r.title}</td>
                    <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>
                      {subjectTypeLabel(r.subjectType)}: {r.subjectName}
                    </td>
                    <td style={{ padding: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 11px",
                          borderRadius: "var(--u-radius-pill)",
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: severityStyle(r.severity).bg,
                          color: severityStyle(r.severity).fg,
                        }}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status}</td>
                    <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{r.ownerName ?? "—"}</td>
                    <td style={{ padding: 8, color: overdue ? "var(--u-status-critical)" : "var(--u-ink-secondary)" }}>
                      {r.reviewDate ? new Date(r.reviewDate).toLocaleDateString() : "—"}
                      {overdue ? " (overdue)" : ""}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
                    No risks match these filters.
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

function RiskEditPanel({
  risk,
  users,
  onClose,
  onSaved,
}: {
  risk: RiskAssessmentListItem;
  users: UserSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(risk.title);
  const [description, setDescription] = useState(risk.description ?? "");
  const [severity, setSeverity] = useState(risk.severity);
  const [likelihood, setLikelihood] = useState(risk.likelihood);
  const [mitigation, setMitigation] = useState(risk.mitigation ?? "");
  const [ownerId, setOwnerId] = useState(risk.ownerId ?? "");
  const [status, setStatus] = useState(risk.status);
  const [reviewDate, setReviewDate] = useState(risk.reviewDate ? risk.reviewDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerOptions = users.map((u) => ({ value: u.id, label: `${u.forename} ${u.surname}` }));

  async function handleSave() {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateRiskAssessment(risk.id, {
        title: title.trim(),
        description: description.trim() || null,
        severity,
        likelihood,
        mitigation: mitigation.trim() || null,
        ownerId: ownerId || null,
        status,
        reviewDate: reviewDate || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save this risk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {subjectTypeLabel(risk.subjectType)}: {risk.subjectName}
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--u-ink)", margin: "4px 0 0" }}>Edit risk</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 14 }}>
        Title
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10 }}>
        Description
        <textarea style={textareaStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Severity
          <Select value={severity} onChange={setSeverity} options={SEVERITY_OPTIONS} ariaLabel="Severity" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Likelihood
          <Select value={likelihood} onChange={setLikelihood} options={LIKELIHOOD_OPTIONS} ariaLabel="Likelihood" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Status
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Status" />
        </label>
      </div>

      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)", display: "block", marginTop: 10 }}>
        Mitigation / control plan
        <textarea style={textareaStyle} value={mitigation} onChange={(e) => setMitigation(e.target.value)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Owner
          <Select value={ownerId} onChange={setOwnerId} options={ownerOptions} allLabel="Unassigned" ariaLabel="Owner" />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
          Review by
          <input type="date" style={inputStyle} value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </label>
      </div>

      {error && <div style={{ marginTop: 10, color: "var(--u-status-critical)", fontSize: 12 }}>{error}</div>}

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </div>

      <AuditHistory tableName="risk_assessments" recordId={risk.id} />
    </div>
  );
}
