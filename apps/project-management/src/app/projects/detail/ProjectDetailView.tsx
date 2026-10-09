"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge, StageTracker, ACTIVE_STAGES, TERMINAL_STAGES, Button, PlusIcon, Select, TextLink, CountrySelect, CurrencySelect, StandardsReference, ScoreLegend, SCORE_BAND_COLORS } from "@universe/ui";
import type { ContactSummary, CountryOption, PartnerSummary, ProjectDetail, ProjectFinancialSummary, ProjectLineSummary, UpdateProjectInput, UserSummary } from "@universe/types";
import { SUPPORTED_CURRENCIES, CURRENCY_OPTIONS } from "@universe/types";
import Link from "next/link";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { LineForm } from "./LineForm";
import { SupplierEnquiries } from "./SupplierEnquiries";
import { ProjectDocuments } from "./ProjectDocuments";
import { StatusHistoryTimeline } from "./StatusHistoryTimeline";
import { ProjectTeam } from "./ProjectTeam";
import { AuditHistory } from "../../../components/AuditHistory";
import { RiskRegister } from "../../../components/RiskRegister";

const STATUSES = [...ACTIVE_STAGES, ...TERMINAL_STAGES] as const;
const COMPLETION_STAGES = ["DELIVERED", "FINANCIALLY_CLOSED", "CLOSEOUT_FILED"] as const;
/** Project-level freight fields (moved here from ProjectLineInput
 * 2026-10-03, per Lewis's request — freight is arranged once for the
 * whole project, not per line). Same lists as
 * apps/api/src/projects/dto/update-project.dto.ts's INCOTERMS/
 * FREIGHT_MODES. */
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const FREIGHT_MODES = ["AIR", "SEA", "LAND"] as const;

/**
 * Which header fields foreground at which stage — see
 * project-stage-navigation-plan.md "Field visibility per stage" and
 * procurement-lifecycle-benchmarking.md rec. #8 (deadline/due-date fields
 * should be the most prominent element pre-submission, per the tender-
 * software research finding). "core" fields are always shown; everything
 * else is gated as commented below. The underlying data is never hidden —
 * this only controls what's foregrounded by default; a "Show all fields"
 * toggle below bypasses all of this.
 */
function isSubmissionDateRelevant(project: ProjectDetail): boolean {
  // Submission Date only exists once a project has actually been submitted.
  return Boolean(project.submissionDate) || ACTIVE_STAGES.indexOf(project.status as (typeof ACTIVE_STAGES)[number]) >= ACTIVE_STAGES.indexOf("SUBMITTED");
}
function isDaysRemainingRelevant(project: ProjectDetail): boolean {
  // Stops being meaningful the moment a project is actually submitted —
  // benchmarking doc rec. #8.
  return !project.submissionDate;
}
function isLinesSectionRelevant(project: ProjectDetail): boolean {
  // 2026-10-01 refinement to project-stage-navigation-plan.md: the whole
  // Project Lines section (and everything within it — manufacturer,
  // supplier, country of manufacture, POs, GAD, freight/logistics,
  // financials, supplier enquiries) is deferred until In Progress. A
  // project that already has lines (imported, or moved backward) still
  // shows them — this only controls default foregrounding, never hides
  // existing data.
  return (
    project.lines.length > 0 ||
    ACTIVE_STAGES.indexOf(project.status as (typeof ACTIVE_STAGES)[number]) >= ACTIVE_STAGES.indexOf("IN_PROGRESS")
  );
}

/**
 * Full project detail: editable header (status/client/dates/notes) plus
 * full line-item CRUD (procurement/financial/logistics/pharma-batch
 * fields via LineForm) — replacing the earlier read-only MVP stub. Still a
 * query-param route, not /projects/[id] — see the note this file used to
 * carry, and Next's static-export + dynamic-route limitation it explains;
 * unchanged by this rework.
 */
export function ProjectDetailView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const countries = useCountries();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [clients, setClients] = useState<PartnerSummary[]>([]);
  const [manufacturers, setManufacturers] = useState<PartnerSummary[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerSummary[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<PartnerSummary[]>([]);
  // Team & Contacts (added 2026-10-08) — org-wide pickable lists, fetched
  // once alongside the partner lists above; see ProjectTeam's doc comment.
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState<UpdateProjectInput>({});
  const [savingHeader, setSavingHeader] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [addingLine, setAddingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Archive/unarchive (Project.isArchived) — soft-delete/retirement, never
  // a hard delete (GDP/21 CFR Part 11 audit-trail posture — see
  // claude/compliance-standards-gap-analysis.md). Archiving is a
  // destructive-feeling action, so it goes through a confirm step rather
  // than firing on a bare click — same pattern as Partner "Remove"
  // (partners/detail/page.tsx) and the Risk Register's "Close" action.
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Financial Summary (added 2026-10-03) — this project's own lines
  // subtotal, the "subtotal of all lines added together" Lewis asked
  // for, alongside the dashboard's org-wide rollup. Same currency-
  // selector pattern as the dashboard (see page.tsx) — Universe is
  // currency-agnostic, so this is a viewer-chosen display lens, not a
  // fixed reporting currency. null while loading/on failure.
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    apiClient
      .getProject(id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load project"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiClient.listPartners("CLIENT").then(setClients).catch(() => {});
    apiClient.listPartners("MANUFACTURER").then(setManufacturers).catch(() => {});
    apiClient.listPartners("SUPPLIER").then(setSuppliers).catch(() => {});
    apiClient.listPartners("FREIGHT_FORWARDER").then(setFreightForwarders).catch(() => {});
    apiClient.listUsers().then(setUsers).catch(() => {});
    apiClient.listContacts().then(setContacts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getSingleProjectFinancialSummary(id, displayCurrency ?? undefined)
      .then((summary) => {
        setFinancialSummary(summary);
        if (displayCurrency === null) setDisplayCurrency(summary.displayCurrencyCode);
      })
      .catch(() => setFinancialSummary(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, displayCurrency, project?.lines.length]);

  function startEditHeader() {
    if (!project) return;
    setHeaderForm({
      title: project.title,
      status: project.status,
      clientId: project.clientId,
      donorReference: project.donorReference,
      deliveryCountryCode: project.deliveryCountryCode,
      startDate: project.startDate,
      dueDate: project.dueDate,
      submissionDate: project.submissionDate,
      managementResponsibility: project.managementResponsibility,
      reasonForCancellation: project.reasonForCancellation,
      projectNotes: project.projectNotes,
      completionStage: project.completionStage,
      incoterm: project.incoterm,
      freightMode: project.freightMode,
      freightForwarderId: project.freightForwarderId,
      freightCost: project.freightCost === null ? null : Number(project.freightCost),
      freightCurrency: project.freightCurrency,
      insuredValue: project.insuredValue === null ? null : Number(project.insuredValue),
      insuredCurrency: project.insuredCurrency,
      freightInsuranceCost: project.freightInsuranceCost === null ? null : Number(project.freightInsuranceCost),
      freightAdditionalCost: project.freightAdditionalCost === null ? null : Number(project.freightAdditionalCost),
      freightAdditionalCostDescription: project.freightAdditionalCostDescription,
      freightMarginPercent: project.freightMarginPercent === null ? null : Number(project.freightMarginPercent),
    });
    setEditingHeader(true);
  }

  async function saveHeader() {
    if (!id) return;
    setSavingHeader(true);
    try {
      const updated = await apiClient.updateProject(id, headerForm);
      setProject(updated);
      setEditingHeader(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSavingHeader(false);
    }
  }

  /** Client-side preview of ProjectsService.applyPricing's freight-total
   * arithmetic (freightCost + freightInsuranceCost + freightAdditionalCost)
   * — purely cosmetic, same convention as LineForm.tsx's computedTotal/
   * invoiceTotalPreview: the API recomputes and returns the authoritative
   * figure on save (project.freightTotalCost / *ReportingCcy), which is
   * what's actually persisted and locked. Ignores currency conversion. */
  function freightTotalPreview(): string {
    const parts = [headerForm.freightCost, headerForm.freightInsuranceCost, headerForm.freightAdditionalCost].filter(
      (v): v is number => v !== null && v !== undefined,
    );
    if (parts.length === 0) return "";
    return String(Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100);
  }

  /** Client-side preview of the freight margin amount (freight total x
   * freightMarginPercent / 100) — same cosmetic-preview convention as
   * above; the authoritative figure is project.freightMarginAmount. */
  function freightMarginAmountPreview(): string {
    const total = freightTotalPreview();
    if (total === "" || headerForm.freightMarginPercent === null || headerForm.freightMarginPercent === undefined) return "";
    return String(Math.round(Number(total) * (headerForm.freightMarginPercent / 100) * 100) / 100);
  }

  /** The small, dedicated status-change control next to the StageTracker —
   * separate from the full "Edit Project Details" form, per
   * project-stage-navigation-plan.md: changing status stays an explicit
   * action, but shouldn't require opening the whole header-edit form just
   * to move a project forward a stage. */
  async function changeStatus(newStatus: string) {
    if (!id || !project) return;
    setChangingStatus(true);
    setError(null);
    try {
      const updated = await apiClient.updateProject(id, { status: newStatus });
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change status");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleArchive() {
    if (!id) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      const updated = await apiClient.archiveProject(id);
      setProject(updated);
      setConfirmingArchive(false);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive this project");
    } finally {
      setArchiving(false);
    }
  }

  async function handleUnarchive() {
    if (!id) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      const updated = await apiClient.unarchiveProject(id);
      setProject(updated);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to unarchive this project");
    } finally {
      setArchiving(false);
    }
  }

  const showSubmissionDate = useMemo(() => (project ? isSubmissionDateRelevant(project) : false), [project]);
  const showDaysRemaining = useMemo(() => (project ? isDaysRemainingRelevant(project) : false), [project]);
  const showLines = useMemo(() => (project ? isLinesSectionRelevant(project) : false), [project]);

  if (!id) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>No project specified.</main>;
  if (error) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>{error}</main>;
  if (!project) return <main style={{ padding: 32 }}>Loading…</main>;

  const isPharma = project.projectType === "PHARMACEUTICAL";

  return (
    <main style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 4, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{project.title}</h1>
          <p style={{ color: "var(--u-ink-secondary)", margin: 0 }}>{project.referenceNumber}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {project.isArchived && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--u-ink-secondary)",
                border: "1px solid var(--u-border)",
                borderRadius: "var(--u-radius-pill)",
                padding: "3px 10px",
              }}
            >
              Archived
            </span>
          )}
          <StatusBadge status={project.status} />
          {project.isArchived ? (
            <Button variant="secondary" onClick={handleUnarchive} disabled={archiving}>
              {archiving ? "Unarchiving…" : "Unarchive"}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingArchive(!confirmingArchive)} disabled={archiving}>
              {confirmingArchive ? "Cancel" : "Archive"}
            </Button>
          )}
        </div>
      </div>

      {archiveError && (
        <p style={{ color: "var(--u-status-critical)", marginTop: 12, fontSize: 13 }}>{archiveError}</p>
      )}

      {confirmingArchive && !project.isArchived && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink)" }}>Archive this project?</div>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
            It will drop out of the default Projects list (a "Show archived" toggle there brings it back) — nothing
            about the project itself, its lines, documents or history is deleted, and it can be unarchived at any
            time.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button variant="danger" onClick={handleArchive} disabled={archiving}>
              {archiving ? "Archiving…" : "Confirm archive"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingArchive(false)} disabled={archiving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <StageTracker status={project.status} statusHistory={project.statusHistory} reasonForCancellation={project.reasonForCancellation} />
        <StatusHistoryTimeline history={project.statusHistory} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--u-ink-secondary)" }}>
            Change status
            <Select
              value={project.status}
              onChange={(v) => !changingStatus && changeStatus(v)}
              options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
              ariaLabel="Change project status"
            />
          </span>
          {project.status === "COMPLETED" && (
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--u-ink-secondary)" }}>
              Completion stage
              <Select
                value={project.completionStage ?? ""}
                onChange={(v) => apiClient.updateProject(id, { completionStage: v || null }).then(setProject)}
                options={COMPLETION_STAGES.map((c) => ({ value: c, label: c.replace(/_/g, " ") }))}
                allLabel="Select…"
                ariaLabel="Change completion stage"
              />
            </span>
          )}
        </div>
      </div>

      {!editingHeader && (
        <>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              <input type="checkbox" checked={showAllFields} onChange={(e) => setShowAllFields(e.target.checked)} style={{ marginRight: 6 }} />
              Show all fields
            </label>
          </div>
          <dl style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <dt style={{ fontWeight: 600 }}>Client</dt>
              <dd>
                {project.clientId ? (
                  <Link href={`/partners/detail?id=${project.clientId}`} style={{ textDecoration: "none" }}>
                    <TextLink as="span">{project.clientName ?? "—"}</TextLink>
                  </Link>
                ) : (
                  project.clientName ?? "—"
                )}
              </dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Project Type</dt>
              <dd>{isPharma ? "Pharmaceutical" : "Non-Pharmaceutical"}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Donor Reference</dt>
              <dd>{project.donorReference ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Delivery Country</dt>
              <dd>{project.deliveryCountryCode ? countries.find((c) => c.code === project.deliveryCountryCode)?.name ?? project.deliveryCountryCode : "—"}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Start Date</dt>
              <dd>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Due Date</dt>
              <dd>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</dd>
            </div>
            {(showAllFields || showSubmissionDate) && (
              <div>
                <dt style={{ fontWeight: 600 }}>Submission Date</dt>
                <dd>{project.submissionDate ? new Date(project.submissionDate).toLocaleDateString() : "—"}</dd>
              </div>
            )}
            {(showAllFields || showDaysRemaining) && (
              <div>
                <dt style={{ fontWeight: 600 }}>Days Remaining for Submission</dt>
                <dd>{project.daysRemainingForSubmission ?? "—"}</dd>
              </div>
            )}
            <div>
              <dt style={{ fontWeight: 600 }}>Management Responsibility</dt>
              <dd>{project.managementResponsibility ?? "—"}</dd>
            </div>
            {(showAllFields || project.status === "CANCELLED") && (
              <div>
                <dt style={{ fontWeight: 600 }}>Reason for Cancellation</dt>
                <dd>{project.reasonForCancellation ?? "—"}</dd>
              </div>
            )}
            <div style={{ gridColumn: "span 2" }}>
              <dt style={{ fontWeight: 600 }}>Notes</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{project.projectNotes ?? "—"}</dd>
            </div>
          </dl>
          <div style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={startEditHeader}>
              Edit Project Details
            </Button>
          </div>
        </>
      )}

      {editingHeader && (
        <div style={{ background: "var(--u-surface-alt)", border: "1px solid var(--u-border)", borderRadius: 8, padding: 20, marginTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              Status
              <div style={{ marginTop: 2 }}>
                <Select
                  value={headerForm.status ?? ""}
                  onChange={(v) => setHeaderForm((f) => ({ ...f, status: v }))}
                  options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                  ariaLabel="Status"
                />
              </div>
            </label>
            <label style={{ fontSize: 13 }}>
              Client
              <select className="u-native-select"
                style={fieldInputStyle}
                value={headerForm.clientId ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, clientId: e.target.value || null }))}
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Donor Reference
              <input
                style={fieldInputStyle}
                value={headerForm.donorReference ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, donorReference: e.target.value || null }))}
              />
            </label>
            <label style={{ fontSize: 13, display: "block" }}>
              <span>Delivery Country</span>
              <div style={{ marginTop: 4 }}>
                <CountrySelect
                  value={headerForm.deliveryCountryCode ?? ""}
                  onChange={(code) => setHeaderForm((f) => ({ ...f, deliveryCountryCode: code || null }))}
                  options={countries}
                  ariaLabel="Delivery country"
                />
              </div>
            </label>
            <label style={{ fontSize: 13 }}>
              Start Date
              <input
                type="date"
                style={fieldInputStyle}
                value={(headerForm.startDate ?? "").slice(0, 10)}
                onChange={(e) => setHeaderForm((f) => ({ ...f, startDate: e.target.value || null }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Due Date
              <input
                type="date"
                style={fieldInputStyle}
                value={(headerForm.dueDate ?? "").slice(0, 10)}
                onChange={(e) => setHeaderForm((f) => ({ ...f, dueDate: e.target.value || null }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Submission Date
              <input
                type="date"
                style={fieldInputStyle}
                value={(headerForm.submissionDate ?? "").slice(0, 10)}
                onChange={(e) => setHeaderForm((f) => ({ ...f, submissionDate: e.target.value || null }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Management Responsibility
              <input
                style={fieldInputStyle}
                value={headerForm.managementResponsibility ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, managementResponsibility: e.target.value || null }))}
              />
            </label>
            {headerForm.status === "CANCELLED" && (
              <label style={{ fontSize: 13, gridColumn: "span 2" }}>
                Reason for Cancellation
                <input
                  style={fieldInputStyle}
                  value={headerForm.reasonForCancellation ?? ""}
                  onChange={(e) => setHeaderForm((f) => ({ ...f, reasonForCancellation: e.target.value || null }))}
                />
              </label>
            )}
            {headerForm.status === "COMPLETED" && (
              <label style={{ fontSize: 13, gridColumn: "span 2" }}>
                Completion Stage
                <select className="u-native-select"
                  style={fieldInputStyle}
                  value={headerForm.completionStage ?? ""}
                  onChange={(e) => setHeaderForm((f) => ({ ...f, completionStage: e.target.value || null }))}
                >
                  <option value="">Select…</option>
                  {COMPLETION_STAGES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ fontSize: 13, gridColumn: "span 2" }}>
              Notes
              <textarea
                style={{ ...fieldInputStyle, minHeight: 80 }}
                value={headerForm.projectNotes ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, projectNotes: e.target.value || null }))}
              />
            </label>
          </div>

          {/* Freight & Logistics (moved here from LineForm.tsx 2026-10-03,
              per Lewis's request — freight is calculated once for the
              whole project, not per product line. See Project's doc
              comment in schema.prisma and ProjectsService.applyProjectFreightPricing. */}
          <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "var(--u-ink-secondary)", marginTop: 24, marginBottom: 8 }}>
            Freight & Logistics
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              Freight Forwarder
              <select className="u-native-select"
                style={fieldInputStyle}
                value={headerForm.freightForwarderId ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightForwarderId: e.target.value || null }))}
              >
                <option value="">—</option>
                {freightForwarders.map((fwd) => (
                  <option key={fwd.id} value={fwd.id}>
                    {fwd.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Incoterm
              <select className="u-native-select" style={fieldInputStyle} value={headerForm.incoterm ?? ""} onChange={(e) => setHeaderForm((f) => ({ ...f, incoterm: e.target.value || null }))}>
                <option value="">—</option>
                {INCOTERMS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Mode
              <select className="u-native-select" style={fieldInputStyle} value={headerForm.freightMode ?? ""} onChange={(e) => setHeaderForm((f) => ({ ...f, freightMode: e.target.value || null }))}>
                <option value="">—</option>
                {FREIGHT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Cost
              <input
                type="number"
                step="0.01"
                style={fieldInputStyle}
                value={headerForm.freightCost ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightCost: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label style={{ fontSize: 13, display: "block" }}>
              <span>Freight Currency</span>
              <div style={{ marginTop: 4 }}>
                <CurrencySelect
                  value={headerForm.freightCurrency ?? ""}
                  onChange={(code) => setHeaderForm((f) => ({ ...f, freightCurrency: code || null }))}
                  options={CURRENCY_OPTIONS}
                  ariaLabel="Freight currency"
                />
              </div>
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Insurance Cost
              <input
                type="number"
                step="0.01"
                style={fieldInputStyle}
                value={headerForm.freightInsuranceCost ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightInsuranceCost: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Additional Cost
              <input
                type="number"
                step="0.01"
                style={fieldInputStyle}
                value={headerForm.freightAdditionalCost ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightAdditionalCost: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Additional Cost Description
              <input
                style={fieldInputStyle}
                value={headerForm.freightAdditionalCostDescription ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightAdditionalCostDescription: e.target.value || null }))}
              />
            </label>
            {/* Computed server-side (freightCost + freightInsuranceCost +
                freightAdditionalCost) — same cosmetic-preview convention
                as LineForm.tsx's calculated fields. */}
            <label style={{ fontSize: 13 }}>
              Freight Total Cost (calculated)
              <input
                type="number"
                step="0.01"
                style={{ ...fieldInputStyle, background: "var(--u-surface-alt)" }}
                value={freightTotalPreview()}
                readOnly
                disabled
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Insured Value
              <input
                type="number"
                step="0.01"
                style={fieldInputStyle}
                value={headerForm.insuredValue ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, insuredValue: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label style={{ fontSize: 13, display: "block" }}>
              <span>Insured Currency</span>
              <div style={{ marginTop: 4 }}>
                <CurrencySelect
                  value={headerForm.insuredCurrency ?? ""}
                  onChange={(code) => setHeaderForm((f) => ({ ...f, insuredCurrency: code || null }))}
                  options={CURRENCY_OPTIONS}
                  ariaLabel="Insured currency"
                />
              </div>
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Margin %
              <input
                type="number"
                step="0.01"
                style={fieldInputStyle}
                value={headerForm.freightMarginPercent ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, freightMarginPercent: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Freight Margin Amount (calculated)
              <input
                type="number"
                step="0.01"
                style={{ ...fieldInputStyle, background: "var(--u-surface-alt)" }}
                value={freightMarginAmountPreview()}
                readOnly
                disabled
              />
            </label>
            {project.reportingCurrencyCode && project.freightTotalCostReportingCcy && (
              <label style={{ fontSize: 13, display: "block" }}>
                <span>{`Freight Cost (${project.reportingCurrencyCode}, locked ${(project.freightPriceLockedAt ?? "").slice(0, 10) || "—"})`}</span>
                <input
                  style={{ ...fieldInputStyle, background: "var(--u-surface-alt)" }}
                  value={`Total: ${project.freightTotalCostReportingCcy}`}
                  readOnly
                  disabled
                />
              </label>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Button variant="primary" onClick={saveHeader} disabled={savingHeader}>
              {savingHeader ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setEditingHeader(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {(showAllFields || showLines) && (
        <>
      {financialSummary && financialSummary.linesWithPricing > 0 && (
        <div
          style={{
            marginTop: 32,
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-lg)",
            backgroundColor: "var(--u-surface-raised)",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Financial Summary (this project)</h3>
            <select
              className="u-native-select"
              value={displayCurrency ?? financialSummary.displayCurrencyCode}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--u-border)" }}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          {financialSummary.conversionUnavailable && (
            <p style={{ fontSize: 12, color: "var(--u-status-critical)", margin: "0 0 8px" }}>
              Could not convert into {displayCurrency} right now — showing {financialSummary.baseCurrencyCode} instead.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <ProjectFinancialStat label="Product cost" value={financialSummary.totalProductCost} currency={financialSummary.displayCurrencyCode} />
            <ProjectFinancialStat label="Freight cost" value={financialSummary.totalFreightCost} currency={financialSummary.displayCurrencyCode} />
            <ProjectFinancialStat label="Margin" value={financialSummary.totalMargin} currency={financialSummary.displayCurrencyCode} />
            <ProjectFinancialStat label="Subtotal (all lines)" value={financialSummary.totalInvoiceValue} currency={financialSummary.displayCurrencyCode} emphasize />
          </div>
        </div>
      )}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Line Items ({project.lines.length})</h2>
        {!addingLine && (
          <Button variant="primary" size="sm" icon={<PlusIcon size={14} />} onClick={() => setAddingLine(true)}>
            Add Line
          </Button>
        )}
      </div>

      {addingLine && (
        <LineForm
          existing={null}
          isPharma={isPharma}
          projectStatus={project.status}
          manufacturers={manufacturers}
          suppliers={suppliers}
          onCancel={() => setAddingLine(false)}
          onSave={async (input) => {
            const updated = await apiClient.addProjectLine(project.id, input);
            setProject(updated);
            setAddingLine(false);
          }}
        />
      )}

      {project.lines.length === 0 && !addingLine && (
        <p style={{ color: "var(--u-ink-secondary)", marginTop: 8 }}>No line items yet.</p>
      )}

      {project.lines.map((line) => (
        <div key={line.id} style={{ border: "1px solid var(--u-border)", borderRadius: 8, marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>
                {line.clientProductDescription || "(no description yet)"}
              </p>
              <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "4px 0 0" }}>
                Qty {line.quantity ?? "—"} · {line.productCategory ?? "—"} · Supplier:{" "}
                <PartnerRef id={line.supplierId} name={line.supplierName} /> · Manufacturer:{" "}
                <PartnerRef id={line.manufacturerId} name={line.manufacturerName} />
              </p>
              <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "4px 0 0" }}>
                {line.supplierPaymentStatus && (
                  <>
                    Payment: {line.supplierPaymentStatus.replace(/_/g, " ")}
                    {line.supplierRemainingBalance !== null && ` (${line.supplierRemainingBalance} remaining)`}
                    {" · "}
                  </>
                )}
                {line.otif !== null && (
                  <>
                    OTIF: {line.otif ? "Yes" : "No"}{" "}
                    <StandardsReference
                      label="OTIF"
                      detail="On-Time In-Full — a standard supply-chain performance metric used by CIPS, the UN, and PAHO, among others. See procurement-lifecycle-benchmarking.md."
                    />
                  </>
                )}
              </p>
              {line.logisticsMetric && <LogisticsMetricBadge metric={line.logisticsMetric} countries={countries} />}
            </div>
            {editingLineId !== line.id && (
              <Button variant="ghost" size="sm" onClick={() => setEditingLineId(line.id)}>
                Edit
              </Button>
            )}
          </div>

          {editingLineId === line.id && (
            <LineForm
              existing={line}
              isPharma={isPharma}
              projectStatus={project.status}
              manufacturers={manufacturers}
              suppliers={suppliers}
              onCancel={() => setEditingLineId(null)}
              onSave={async (input) => {
                const updated = await apiClient.updateProjectLine(project.id, line.id, input);
                setProject(updated);
                setEditingLineId(null);
              }}
            />
          )}

          <SupplierEnquiries projectId={project.id} line={line} suppliers={suppliers} onUpdated={setProject} />
        </div>
      ))}
        </>
      )}
      {!showAllFields && !showLines && (
        <p style={{ color: "var(--u-ink-secondary)", marginTop: 40, fontSize: 13 }}>
          Line items, procurement, freight/logistics and financial details foreground once this project moves to In Progress.
          Use &ldquo;Show all fields&rdquo; above to enter them early.
        </p>
      )}

      <ProjectTeam project={project} users={users} contacts={contacts} onUpdated={setProject} />

      <ProjectDocuments project={project} onUpdated={setProject} />

      <RiskRegister subjectType="PROJECT" subjectId={project.id} />
      <AuditHistory tableName="projects" recordId={project.id} />
    </main>
  );
}

const fieldInputStyle = {
  display: "block",
  width: "100%",
  padding: 6,
  marginTop: 2,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontSize: 13,
} as const;

/** Any field that's really a reference to a stakeholder record (a line's
 * supplier/manufacturer/freight forwarder, a project's client) renders as
 * a link to that record rather than flat text — added 2026-10-01 per
 * Lewis's "anything tied to backend data should be interactive"
 * instruction. Falls back to plain text when there's no id (a line
 * created before this field was populated, or genuinely unset). */
/**
 * Compact, colour-coded summary of a line's computed supply-chain CO2/
 * distance/efficiency metric — added 2026-10-08. See LogisticsMetricSummary
 * (packages/types) and supply-chain-co2-efficiency.md for the full
 * methodology. This is the org-private view (this organisation's own
 * line) — the anonymized cross-tenant dashboard lives at /logistics/global.
 */
function LogisticsMetricBadge({
  metric,
  countries,
}: {
  metric: NonNullable<ProjectLineSummary["logisticsMetric"]>;
  // Standalone component — needs countries passed in rather than reading the
  // page-level variable. Added 2026-10-09, Stage 0 point 2 (country display
  // consistency audit): this previously rendered raw ISO codes.
  countries: CountryOption[];
}) {
  const color = SCORE_BAND_COLORS[metric.scoreBand] ?? "#666";
  const distance = Math.round(Number(metric.distanceKm)).toLocaleString();
  const co2 = Math.round(Number(metric.co2TotalKg)).toLocaleString();
  return (
    <p style={{ fontSize: 13, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: color,
          color: "#fff",
          fontWeight: 700,
          fontSize: 12,
        }}
        title={`Efficiency/CO2 impact score: ${metric.efficiencyScore}/10 (${metric.scoreBand})`}
      >
        {metric.efficiencyScore}
      </span>
      <span style={{ color: "var(--u-ink-secondary)" }}>
        {metric.manufactureCountryCode ? countries.find((c) => c.code === metric.manufactureCountryCode)?.name ?? metric.manufactureCountryCode : "—"}
        {" → "}
        {metric.destinationCountryCode ? countries.find((c) => c.code === metric.destinationCountryCode)?.name ?? metric.destinationCountryCode : "—"}
        {" · "}{distance} km ·{" "}
        {metric.transportMode ?? "—"} · ~{co2} kg CO2e
        {metric.weightEstimated && " (weight estimated)"}
        {metric.durationDays !== null && ` · ${metric.durationDays}d`}
      </span>
      <StandardsReference
        label="GLEC Framework"
        detail="Distance/CO2 estimate: GLEC Framework (aligned with ISO 14083), by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route. See supply-chain-co2-efficiency.md for the full methodology."
      />
      <ScoreLegend label="Score key" />
    </p>
  );
}

function PartnerRef({ id, name }: { id: string | null; name: string | null }) {
  if (!id) return <>{name ?? "—"}</>;
  return (
    <Link href={`/partners/detail?id=${id}`} style={{ textDecoration: "none" }}>
      <TextLink as="span">{name ?? "—"}</TextLink>
    </Link>
  );
}

/** One figure inside the project's Financial Summary panel — same
 * formatting convention as the dashboard's FinancialStat (page.tsx).
 * Added 2026-10-03. */
function ProjectFinancialStat({ label, value, currency, emphasize }: { label: string; value: string; currency: string; emphasize?: boolean }) {
  const formatted = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: emphasize ? 18 : 15, fontWeight: emphasize ? 700 : 600, color: "var(--u-ink)" }}>
        {currency} {formatted}
      </div>
    </div>
  );
}
