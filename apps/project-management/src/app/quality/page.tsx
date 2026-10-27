"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  PagedResult,
  PartnerPerformanceMetric,
  PartnerOption,
  ProductCatalogMatch,
  ProductSourceApprovalSummary,
  QualityDashboardSummary,
} from "@universe/types";
import { commodityGroupLabel, STAKEHOLDER_CATEGORY_LABELS } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import {
  Button,
  Select,
  Pill,
  TextLink,
  ShieldIcon,
  CheckCircleIcon,
  AlertIcon,
  ClockIcon,
  GaugeIcon,
  PlusIcon,
  ProductPicker,
  Pagination,
  type PageSize,
  type ProductPickerOption,
  StandardsReference,
  StatTile,
} from "@universe/ui";
import { ScorecardSettingsPanel } from "../../components/ScorecardSettingsPanel";
import { OwnDataExportButton } from "../../components/OwnDataExportButton";

const STATUS_FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "WARNING", "QUALIFIED"] as const;
const PERFORMANCE_ROLE_FILTERS = ["", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER"] as const;
const ROLE_LABELS: Record<string, string> = STAKEHOLDER_CATEGORY_LABELS;

/**
 * Quality Assurance section — added 2026-10-01 (round 3 feedback, item 6).
 *
 * "Qualified product" is deliberately its own first-class record
 * (ProductSourceApproval), not something computed purely from order
 * history — Lewis confirmed this via AskUserQuestion 2026-10-01 over the
 * cheaper alternative, since an order line existing doesn't mean anyone
 * ever reviewed/approved that sourcing combination. See
 * architecture-decisions.md's "Quality Assurance" section for the full
 * rationale and apps/api/src/quality/ for the cross-reference logic this
 * page reads (ProductSourceApprovalsService.getQualificationStatus):
 * APPROVED here AND the manufacturer (and supplier, if set) are both
 * currently Partner.approvalStatus APPROVED, with no expired
 * PartnerCertification and no overdue review date.
 *
 * Performance scorecards (manufacturer/supplier/freight forwarder on-time,
 * in-full, OTIF, flagged issues) are a documented v1 approximation — see
 * PartnerPerformanceService's doc comment — since the schema doesn't yet
 * separate "was the freight forwarder on time" from "was the supplier on
 * time" at the data-entry level.
 */
export default function QualityPage() {
  const me = useCurrentUser();
  // QA/procurement segregation of duties (Lewis, 2026-10-08) — purely
  // cosmetic (products.approve is enforced server-side regardless); keeps
  // a procurement-only user from hitting an always-403 status change.
  const canSeeComplaints = (me?.platformStaffRole ?? "NONE") !== "NONE" || (me?.permissions.includes("quality.complaints.view") ?? false);
  const canApproveProducts = me?.permissions.includes("products.approve") ?? false;
  const [dashboard, setDashboard] = useState<QualityDashboardSummary | null>(null);
  const [approvals, setApprovals] = useState<ProductSourceApprovalSummary[] | null>(null);
  // Server-paged (2026-10-17, scale work).
  const [approvalsTotal, setApprovalsTotal] = useState(0);
  const [approvalsPage, setApprovalsPage] = useState(0);
  const [approvalsPageSize, setApprovalsPageSize] = useState<PageSize>(25);
  const [performanceResult, setPerformanceResult] = useState<PagedResult<PartnerPerformanceMetric> | null>(null);
  const [perfPageSize, setPerfPageSize] = useState<PageSize>(25);
  const [perfPage, setPerfPage] = useState(0);
  const performance = performanceResult?.items ?? null;
  const [scores, setScores] = useState<Record<string, { overallScore: number | null; band: string; attention: number }>>({});
  useEffect(() => {
    const ids = (performanceResult?.items ?? []).map((p) => p.partnerId).filter((id) => !(id in scores));
    if (!ids.length) return;
    let off = false;
    apiClient.getPartnerScorecardScores(ids).then((r) => { if (!off) setScores((prev) => ({ ...prev, ...Object.fromEntries(r.map((x) => [x.partnerId, { overallScore: x.overallScore, band: x.band, attention: x.attention }])) })); }).catch(() => { if (!off) setScores((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, { overallScore: null, band: "NOT_ENOUGH_DATA", attention: 0 }])) })); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceResult]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("");
  const [performanceRole, setPerformanceRole] = useState<(typeof PERFORMANCE_ROLE_FILTERS)[number]>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    apiClient.getQualityDashboard().then(setDashboard).catch(() => setDashboard(null));
    apiClient
      .listProductSourceApprovalsPage({ status: statusFilter || undefined, page: approvalsPage + 1, pageSize: approvalsPageSize === "all" ? 100 : approvalsPageSize })
      .then((data) => {
        setApprovals(data.items);
        setApprovalsTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        // The raw message here is "API request failed: 500 Internal Server
        // Error — {...}" (packages/api-client's request() helper) — fine
        // for a developer console, not for a user-facing banner (2026-10-02,
        // Lewis flagged this exact JSON dump showing up on a tablet). Full
        // detail still goes to the console; the banner below stays plain-
        // English and offers a retry instead.
        console.error("Failed to load product sourcing approvals:", err);
        setApprovals(null);
        setError("Couldn't load product sourcing approvals. This is usually temporary — try again in a moment.");
      });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, approvalsPage, approvalsPageSize]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getPartnerPerformancePage({ roleType: performanceRole || undefined, page: perfPage + 1, pageSize: perfPageSize === "all" ? 100 : perfPageSize })
      .then((r) => {
        if (!cancelled) setPerformanceResult(r);
      })
      .catch(() => {
        if (!cancelled) setPerformanceResult({ items: [], total: 0, page: 1, pageSize: 25 });
      });
    return () => {
      cancelled = true;
    };
  }, [performanceRole, perfPage, perfPageSize]);

  async function handleStatusChange(id: string, status: string) {
    await apiClient.updateProductSourceApproval(id, { status });
    reload();
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "var(--u-org-accent, var(--u-brand-violet))",
              marginBottom: 10,
            }}
          />
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldIcon size={24} /> Quality Assurance
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6 }}>
            Approved sourcing relationships, cross-referenced against current partner approval status, plus
            performance scorecards.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <OwnDataExportButton entity="certifications" label="Export certifications" />
          <OwnDataExportButton entity="evidence" label="Export evidence" />
          <Link href="/quality/evidence-standards" style={{ textDecoration: "none" }}>
            <Button variant="secondary">Evidence Standards</Button>
          </Link>
          <Link href="/quality/qa-queue" style={{ textDecoration: "none" }}>
            <Button variant="secondary">QA Queue</Button>
          </Link>
          <Link href="/batches" style={{ textDecoration: "none" }}>
            <Button variant="secondary">Batches</Button>
          </Link>
          <Link href="/quality/re-verification" style={{ textDecoration: "none" }}>
            <Button variant="secondary">Re-verification Due</Button>
          </Link>
          {canSeeComplaints && (
            <Link href="/quality/complaints" style={{ textDecoration: "none" }}>
              <Button variant="secondary">Complaints</Button>
            </Link>
          )}
          <Link href="/quality/controlled-documents" style={{ textDecoration: "none" }}>
            <Button variant="secondary">Controlled Documents</Button>
          </Link>
          <Button variant="primary" icon={<PlusIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))" onClick={() => setShowNewForm((v) => !v)}>
            New Product Approval
          </Button>
        </div>
      </div>

      <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 16, marginBottom: 32 }}>
        <StatTile label="Qualified products" value={dashboard?.qualifiedCount} icon={<CheckCircleIcon size={20} />} tone="good" active={statusFilter === "QUALIFIED"} onClick={() => { setStatusFilter(statusFilter === "QUALIFIED" ? "" : "QUALIFIED"); setApprovalsPage(0); }} />
        <StatTile label="Needs attention" value={dashboard?.warningCount} icon={<AlertIcon size={20} />} tone="warning" active={statusFilter === "WARNING"} onClick={() => { setStatusFilter(statusFilter === "WARNING" ? "" : "WARNING"); setApprovalsPage(0); }} />
        <StatTile label="Pending review" value={dashboard?.pendingCount} icon={<ClockIcon size={20} />} tone="neutral" active={statusFilter === "PENDING"} onClick={() => { setStatusFilter(statusFilter === "PENDING" ? "" : "PENDING"); setApprovalsPage(0); }} />
        <StatTile label="Total sourcing approvals" value={dashboard?.totalProducts} icon={<ShieldIcon size={20} />} tone="brand" active={statusFilter === ""} onClick={() => { setStatusFilter(""); setApprovalsPage(0); }} />
      </div>

      {showNewForm && (
        <NewApprovalForm
          onCreated={() => {
            setShowNewForm(false);
            reload();
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {dashboard && dashboard.needsAttention.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: "0 0 12px" }}>Needs attention</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dashboard.needsAttention.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 16px",
                  borderRadius: "var(--u-radius-md)",
                  border: "1px solid var(--u-border)",
                  backgroundColor: "var(--u-status-warning-wash)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>{a.productMasterName}</div>
                  <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                    <Link href={`/partners/detail?id=${a.manufacturerId}`} style={{ textDecoration: "none" }}>
                      <TextLink as="span">{a.manufacturerName}</TextLink>
                    </Link>
                    {a.supplierId && (
                      <>
                        {" · "}
                        <Link href={`/partners/detail?id=${a.supplierId}`} style={{ textDecoration: "none" }}>
                          <TextLink as="span">{a.supplierName}</TextLink>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--u-status-warning-text)", fontWeight: 600, flexShrink: 0 }}>
                  {a.isReviewOverdue ? "Review overdue" : a.hasExpiredCertification ? "Certification expired" : "Partner no longer approved"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>Product sourcing approvals</h2>
          <div style={{ width: 200 }}>
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as (typeof STATUS_FILTERS)[number]); setApprovalsPage(0); }}
              allLabel="All statuses"
              ariaLabel="Filter by status"
              options={STATUS_FILTERS.filter(Boolean).map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              marginBottom: 12,
              borderRadius: "var(--u-radius-md)",
              border: "1px solid var(--u-status-critical)",
              backgroundColor: "var(--u-status-critical-tint)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--u-ink)" }}>
              <AlertIcon size={16} />
              {error}
            </div>
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          </div>
        )}
        {!error && !approvals && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}
        {approvals && approvals.length === 0 && (
          <div
            style={{
              padding: 28,
              borderRadius: "var(--u-radius-lg)",
              border: "1px solid var(--u-border)",
              backgroundColor: "var(--u-surface-raised)",
              textAlign: "center",
              color: "var(--u-ink-secondary)",
              fontSize: 14,
            }}
          >
            No sourcing approvals recorded yet.
          </div>
        )}

        {approvals && approvals.length > 0 && (
          <div style={{ overflowX: "auto", borderRadius: "var(--u-radius-lg)", border: "1px solid var(--u-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--u-surface-alt)", textAlign: "left" }}>
                  {["Product", "Manufacturer", "Supplier", "Status", "Qualified", "Next review", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: "var(--u-ink-secondary)", fontSize: 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--u-ink)" }}>{a.productMasterName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{commodityGroupLabel(a.productCategory)}</div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <Link href={`/partners/detail?id=${a.manufacturerId}`} style={{ textDecoration: "none" }}>
                        <TextLink as="span">{a.manufacturerName}</TextLink>
                      </Link>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {a.supplierId ? (
                        <Link href={`/partners/detail?id=${a.supplierId}`} style={{ textDecoration: "none" }}>
                          <TextLink as="span">{a.supplierName}</TextLink>
                        </Link>
                      ) : (
                        <span style={{ color: "var(--u-ink-secondary)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", width: 150 }}>
                      {canApproveProducts ? (
                        <Select
                          value={a.status}
                          onChange={(v) => handleStatusChange(a.id, v)}
                          ariaLabel={`Status for ${a.productMasterName}`}
                          options={[
                            { value: "PENDING", label: "Pending" },
                            { value: "APPROVED", label: "Approved" },
                            { value: "REJECTED", label: "Rejected" },
                          ]}
                        />
                      ) : (
                        <Pill tone="neutral">{a.status}</Pill>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {a.isQualified ? (
                        <Pill tone="good" icon={<CheckCircleIcon size={12} />}>
                          Qualified
                        </Pill>
                      ) : a.status === "APPROVED" ? (
                        <Pill tone="warning" icon={<AlertIcon size={12} />}>
                          Warning
                        </Pill>
                      ) : (
                        <Pill tone="neutral">—</Pill>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", color: a.isReviewOverdue ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)" }}>
                      {a.nextReviewDue ? new Date(a.nextReviewDue).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }} />
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              pageSize={approvalsPageSize}
              onPageSizeChange={(sz) => { setApprovalsPageSize(sz); setApprovalsPage(0); }}
              page={approvalsPage}
              pageCount={Math.max(1, Math.ceil(approvalsTotal / (approvalsPageSize === "all" ? 100 : approvalsPageSize)))}
              onPageChange={setApprovalsPage}
              totalCount={approvalsTotal}
            />
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <GaugeIcon size={17} /> Partner performance
          </h2>
          <div style={{ width: 220 }}>
            <Select
              value={performanceRole}
              onChange={(v) => { setPerformanceRole(v as (typeof PERFORMANCE_ROLE_FILTERS)[number]); setPerfPage(0); }}
              allLabel="All roles"
              ariaLabel="Filter by role"
              options={PERFORMANCE_ROLE_FILTERS.filter(Boolean).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </div>
        </div>

        <ScorecardSettingsPanel />

        {!performance && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}
        {performance && performance.length === 0 && (
          <div
            style={{
              padding: 28,
              borderRadius: "var(--u-radius-lg)",
              border: "1px solid var(--u-border)",
              backgroundColor: "var(--u-surface-raised)",
              textAlign: "center",
              color: "var(--u-ink-secondary)",
              fontSize: 14,
            }}
          >
            No project-line activity recorded against any manufacturer, supplier or freight forwarder yet.
          </div>
        )}

        {performance && performance.length > 0 && (
          <div style={{ overflowX: "auto", borderRadius: "var(--u-radius-lg)", border: "1px solid var(--u-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--u-surface-alt)", textAlign: "left" }}>
                  {["Partner", "Role", "Score", "Lines", "On time", "In full", "OTIF", "Avg. days late", "Flagged issues", ...(canSeeComplaints ? ["Complaints (upheld)"] : [])].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: "var(--u-ink-secondary)", fontSize: 12 }}>
                      {h === "OTIF" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {h}
                          <StandardsReference
                            label=""
                            detail="On-Time In-Full — a standard supply-chain performance metric used by CIPS, the UN, and PAHO, among others. See procurement-lifecycle-benchmarking.md."
                          />
                        </span>
                      ) : (
                        h
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={`${p.partnerId}-${p.roleType}`} style={{ borderTop: "1px solid var(--u-border)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <Link href={`/partners/detail?id=${p.partnerId}`} style={{ textDecoration: "none" }}>
                        <TextLink as="span">{p.partnerName}</TextLink>
                      </Link>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--u-ink-secondary)" }}>{ROLE_LABELS[p.roleType]}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                      {scores[p.partnerId] === undefined ? <span style={{ color: "var(--u-ink-secondary)" }}>…</span> : scores[p.partnerId].overallScore === null ? "—" : (
                        <Link href={`/partners/detail?id=${p.partnerId}`} style={{ textDecoration: "none", color: scores[p.partnerId].band === "STRONG" || scores[p.partnerId].band === "SATISFACTORY" ? "var(--u-status-good-text)" : scores[p.partnerId].band === "WATCH" ? "var(--u-status-warning-text)" : "var(--u-status-critical-text)" }} title={scores[p.partnerId].band.replace("_", " ").toLowerCase()}>{scores[p.partnerId].overallScore}</Link>
                      )}
                      {scores[p.partnerId]?.attention > 0 && <span title={`${scores[p.partnerId].attention} measure(s) need attention`} style={{ marginLeft: 6, color: "var(--u-status-critical-text)", fontSize: 12 }}>⚑ {scores[p.partnerId].attention}</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{p.totalLines}</td>
                    <td style={{ padding: "10px 14px" }}>{p.onTimePercent === null ? "—" : `${p.onTimePercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.inFullPercent === null ? "—" : `${p.inFullPercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.otifPercent === null ? "—" : `${p.otifPercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.avgDaysLate === null ? "—" : `${p.avgDaysLate}d`}</td>
                    <td style={{ padding: "10px 14px", color: p.issueCount > 0 ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)" }}>
                      {p.issueCount}
                    </td>
                    {canSeeComplaints && <td style={{ padding: "10px 14px", color: p.complaintsUpheld > 0 ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)" }}>
                      {p.complaintsTotal === 0 ? "—" : (
                        <Link href={`/quality/complaints`} style={{ textDecoration: "none", color: "inherit" }}>{p.complaintsTotal} ({p.complaintsUpheld})</Link>
                      )}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              pageSize={perfPageSize}
              onPageSizeChange={(sz) => { setPerfPageSize(sz); setPerfPage(0); }}
              page={perfPage}
              pageCount={Math.max(1, Math.ceil((performanceResult?.total ?? 0) / (perfPageSize === "all" ? 100 : perfPageSize)))}
              onPageChange={setPerfPage}
              totalCount={performanceResult?.total ?? 0}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function NewApprovalForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  // Product field now shares the exact ProductPicker component (and the
  // ProductCatalogService backend it talks to) used by the project
  // line-item "Matched Product" field in LineForm.tsx, per Lewis's
  // instruction that this screen's existing product search "can be
  // enhanced and utilised again... to ensure everything is tied together
  // and consistent" rather than keeping its own bespoke dropdown. This
  // also gains the "+ Add to the catalogue" affordance the old inline
  // dropdown never had.
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductCatalogMatch[]>([]);
  const [productId, setProductId] = useState("");
  const [productLabel, setProductLabel] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [manufacturers, setManufacturers] = useState<PartnerOption[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerOption[]>([]);
  const [manufacturerId, setManufacturerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listPartnerOptions("MANUFACTURER").then(setManufacturers).catch(() => setManufacturers([]));
    apiClient.listPartnerOptions("SUPPLIER").then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient.searchProductCatalog(productQuery).then(setProductOptions).catch(() => setProductOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [productQuery]);

  function handleSelectProduct(option: ProductPickerOption) {
    setProductId(option.id);
    setProductLabel(option.name);
    setProductQuery("");
    setProductOptions([]);
  }

  function handleClearProduct() {
    setProductId("");
    setProductLabel(null);
  }

  async function handleCreateProduct(name: string) {
    if (!name) return;
    setCreatingProduct(true);
    try {
      const created = await apiClient.createProductCatalogEntry({ name, category: "CONSUMABLES" });
      handleSelectProduct(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add product to the catalogue");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSubmit() {
    if (!productId || !manufacturerId) {
      setFormError("A product and a manufacturer are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.createProductSourceApproval({
        productMasterId: productId,
        manufacturerId,
        supplierId: supplierId || undefined,
        status,
      });
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create approval");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 32,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--u-ink)" }}>New sourcing approval</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Product (search the shared catalogue)
          <ProductPicker
            query={productQuery}
            onQueryChange={setProductQuery}
            options={productOptions}
            selectedId={productId}
            selectedLabel={productLabel}
            onSelect={handleSelectProduct}
            onClear={handleClearProduct}
            onCreateNew={handleCreateProduct}
            creating={creatingProduct}
            placeholder="Start typing a product name…"
            ariaLabel="Search the product catalogue"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Manufacturer
          <Select
            value={manufacturerId}
            onChange={setManufacturerId}
            allLabel="Select a manufacturer"
            ariaLabel="Manufacturer"
            options={manufacturers.map((m) => ({ value: m.id, label: m.name }))}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Supplier (optional)
          <Select
            value={supplierId}
            onChange={setSupplierId}
            allLabel="No supplier / direct from manufacturer"
            ariaLabel="Supplier"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Initial status
          <Select
            value={status}
            onChange={setStatus}
            ariaLabel="Initial status"
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
        </label>
      </div>

      {formError && <div style={{ color: "var(--u-status-critical-text)", fontSize: 13 }}>{formError}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save approval"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
