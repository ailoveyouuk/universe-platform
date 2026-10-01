"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge, StageTracker, ACTIVE_STAGES, TERMINAL_STAGES, Button, PlusIcon, Select, TextLink } from "@universe/ui";
import type { PartnerSummary, ProjectDetail, UpdateProjectInput } from "@universe/types";
import Link from "next/link";
import { apiClient } from "../../../lib/apiClient";
import { LineForm } from "./LineForm";
import { SupplierEnquiries } from "./SupplierEnquiries";
import { ProjectDocuments } from "./ProjectDocuments";

const STATUSES = [...ACTIVE_STAGES, ...TERMINAL_STAGES] as const;
const COMPLETION_STAGES = ["DELIVERED", "FINANCIALLY_CLOSED", "CLOSEOUT_FILED"] as const;

/**
 * Which header fields foreground at which stage — see
 * project-stage-navigation-plan.md "Field visibility per stage" and
 * procurement-lifecycle-benchmarking.md rec. #8 (deadline/due-date fields
 * should be the most prominent element pre-submission, per the tender-
 * software research finding). "core" fields are always shown; everything
 * else is gated as commented below. The underlying data is never hidden —
 * this only controls what's foregrounded by default, matching
 * ProjectFieldGroup's own doc comment in schema.prisma — a "Show all
 * fields" toggle below bypasses all of this.
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

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [clients, setClients] = useState<PartnerSummary[]>([]);
  const [manufacturers, setManufacturers] = useState<PartnerSummary[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerSummary[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<PartnerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState<UpdateProjectInput>({});
  const [savingHeader, setSavingHeader] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [addingLine, setAddingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

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
  }, []);

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
          <h1 style={{ marginBottom: 4 }}>{project.title}</h1>
          <p style={{ color: "var(--u-ink-secondary)", margin: 0 }}>{project.referenceNumber}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div style={{ marginTop: 20 }}>
        <StageTracker status={project.status} statusHistory={project.statusHistory} reasonForCancellation={project.reasonForCancellation} />
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
          <dl style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <dd>{project.deliveryCountryCode ?? "—"}</dd>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <label style={{ fontSize: 13 }}>
              Delivery Country
              <input
                style={fieldInputStyle}
                maxLength={2}
                value={headerForm.deliveryCountryCode ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, deliveryCountryCode: e.target.value.toUpperCase() || null }))}
              />
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
          manufacturers={manufacturers}
          suppliers={suppliers}
          freightForwarders={freightForwarders}
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
                {line.otif !== null && <>OTIF: {line.otif ? "Yes" : "No"}</>}
              </p>
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
              manufacturers={manufacturers}
              suppliers={suppliers}
              freightForwarders={freightForwarders}
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

      <ProjectDocuments project={project} onUpdated={setProject} />
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
function PartnerRef({ id, name }: { id: string | null; name: string | null }) {
  if (!id) return <>{name ?? "—"}</>;
  return (
    <Link href={`/partners/detail?id=${id}`} style={{ textDecoration: "none" }}>
      <TextLink as="span">{name ?? "—"}</TextLink>
    </Link>
  );
}
