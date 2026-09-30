"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge, StageTracker, ACTIVE_STAGES, TERMINAL_STAGES } from "@universe/ui";
import type { PartnerSummary, ProjectDetail, UpdateProjectInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { LineForm } from "./LineForm";

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

  if (!id) return <main style={{ padding: 32, color: "#B91C1C" }}>No project specified.</main>;
  if (error) return <main style={{ padding: 32, color: "#B91C1C" }}>{error}</main>;
  if (!project) return <main style={{ padding: 32 }}>Loading…</main>;

  const isPharma = project.projectType === "PHARMACEUTICAL";

  return (
    <main style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{project.title}</h1>
          <p style={{ color: "#6B7280", margin: 0 }}>{project.referenceNumber}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div style={{ marginTop: 20 }}>
        <StageTracker status={project.status} statusHistory={project.statusHistory} reasonForCancellation={project.reasonForCancellation} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <label style={{ fontSize: 13, color: "#6B7280" }}>
            Change status
            <select
              style={{ ...fieldInputStyle, marginTop: 2, width: "auto", display: "inline-block", marginLeft: 8 }}
              value={project.status}
              disabled={changingStatus}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          {project.status === "COMPLETED" && (
            <label style={{ fontSize: 13, color: "#6B7280" }}>
              Completion stage
              <select
                style={{ ...fieldInputStyle, marginTop: 2, width: "auto", display: "inline-block", marginLeft: 8 }}
                value={project.completionStage ?? ""}
                onChange={(e) => apiClient.updateProject(id, { completionStage: e.target.value || null }).then(setProject)}
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
        </div>
      </div>

      {!editingHeader && (
        <>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <label style={{ fontSize: 12, color: "#6B7280" }}>
              <input type="checkbox" checked={showAllFields} onChange={(e) => setShowAllFields(e.target.checked)} style={{ marginRight: 6 }} />
              Show all fields
            </label>
          </div>
          <dl style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <dt style={{ fontWeight: 600 }}>Client</dt>
              <dd>{project.clientName ?? "—"}</dd>
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
          <button onClick={startEditHeader} style={{ marginTop: 16, padding: "8px 16px" }}>
            Edit Project Details
          </button>
        </>
      )}

      {editingHeader && (
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 20, marginTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              Status
              <select
                style={fieldInputStyle}
                value={headerForm.status ?? ""}
                onChange={(e) => setHeaderForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Client
              <select
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
                <select
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
            <button onClick={saveHeader} disabled={savingHeader} style={{ padding: "8px 16px" }}>
              {savingHeader ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditingHeader(false)} style={{ padding: "8px 16px" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Line Items ({project.lines.length})</h2>
        {!addingLine && (
          <button onClick={() => setAddingLine(true)} style={{ padding: "8px 16px" }}>
            + Add Line
          </button>
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
        <p style={{ color: "#6B7280", marginTop: 8 }}>No line items yet.</p>
      )}

      {project.lines.map((line) => (
        <div key={line.id} style={{ border: "1px solid #E5E7EB", borderRadius: 8, marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>
                {line.clientProductDescription || "(no description yet)"}
              </p>
              <p style={{ color: "#6B7280", fontSize: 13, margin: "4px 0 0" }}>
                Qty {line.quantity ?? "—"} · {line.productCategory ?? "—"} · Supplier: {line.supplierName ?? "—"} ·
                Manufacturer: {line.manufacturerName ?? "—"}
              </p>
              <p style={{ color: "#6B7280", fontSize: 13, margin: "4px 0 0" }}>
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
              <button onClick={() => setEditingLineId(line.id)} style={{ padding: "6px 12px" }}>
                Edit
              </button>
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
        </div>
      ))}
    </main>
  );
}

const fieldInputStyle = {
  display: "block",
  width: "100%",
  padding: 6,
  marginTop: 2,
  border: "1px solid #D1D5DB",
  borderRadius: 6,
  fontSize: 13,
} as const;
