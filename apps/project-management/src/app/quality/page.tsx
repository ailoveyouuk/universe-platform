"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  PartnerPerformanceMetric,
  PartnerSummary,
  ProductMasterOption,
  ProductSourceApprovalSummary,
  QualityDashboardSummary,
} from "@universe/types";
import { apiClient } from "../../lib/apiClient";
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
} from "@universe/ui";

const STATUS_FILTERS = ["", "PENDING", "APPROVED", "REJECTED"] as const;
const PERFORMANCE_ROLE_FILTERS = ["", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER"] as const;
const ROLE_LABELS: Record<string, string> = {
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
};

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
  const [dashboard, setDashboard] = useState<QualityDashboardSummary | null>(null);
  const [approvals, setApprovals] = useState<ProductSourceApprovalSummary[] | null>(null);
  const [performance, setPerformance] = useState<PartnerPerformanceMetric[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("");
  const [performanceRole, setPerformanceRole] = useState<(typeof PERFORMANCE_ROLE_FILTERS)[number]>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    apiClient.getQualityDashboard().then(setDashboard).catch(() => setDashboard(null));
    apiClient
      .listProductSourceApprovals(statusFilter || undefined)
      .then(setApprovals)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load product approvals"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    apiClient
      .getPartnerPerformance(performanceRole || undefined)
      .then(setPerformance)
      .catch(() => setPerformance([]));
  }, [performanceRole]);

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
        <Button variant="primary" icon={<PlusIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))" onClick={() => setShowNewForm((v) => !v)}>
          New Product Approval
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 32 }}>
        <QaTile label="Qualified products" value={dashboard?.qualifiedCount} icon={<CheckCircleIcon size={20} />} tone="good" />
        <QaTile label="Needs attention" value={dashboard?.warningCount} icon={<AlertIcon size={20} />} tone="warning" />
        <QaTile label="Pending review" value={dashboard?.pendingCount} icon={<ClockIcon size={20} />} tone="neutral" />
        <QaTile label="Total sourcing approvals" value={dashboard?.totalProducts} icon={<ShieldIcon size={20} />} tone="brand" />
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
                  backgroundColor: "rgba(250,178,25,0.08)",
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
                <div style={{ fontSize: 12, color: "#946014", fontWeight: 600, flexShrink: 0 }}>
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
              onChange={(v) => setStatusFilter(v as (typeof STATUS_FILTERS)[number])}
              allLabel="All statuses"
              ariaLabel="Filter by status"
              options={STATUS_FILTERS.filter(Boolean).map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))}
            />
          </div>
        </div>

        {error && <div style={{ color: "var(--u-status-critical)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {!approvals && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}
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
                      <div style={{ fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{a.productCategory}</div>
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
                    <td style={{ padding: "10px 14px", color: a.isReviewOverdue ? "var(--u-status-critical)" : "var(--u-ink-secondary)" }}>
                      {a.nextReviewDue ? new Date(a.nextReviewDue).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }} />
                  </tr>
                ))}
              </tbody>
            </table>
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
              onChange={(v) => setPerformanceRole(v as (typeof PERFORMANCE_ROLE_FILTERS)[number])}
              allLabel="All roles"
              ariaLabel="Filter by role"
              options={PERFORMANCE_ROLE_FILTERS.filter(Boolean).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </div>
        </div>

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
                  {["Partner", "Role", "Lines", "On time", "In full", "OTIF", "Avg. days late", "Flagged issues"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontWeight: 600, color: "var(--u-ink-secondary)", fontSize: 12 }}>
                      {h}
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
                    <td style={{ padding: "10px 14px" }}>{p.totalLines}</td>
                    <td style={{ padding: "10px 14px" }}>{p.onTimePercent === null ? "—" : `${p.onTimePercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.inFullPercent === null ? "—" : `${p.inFullPercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.otifPercent === null ? "—" : `${p.otifPercent}%`}</td>
                    <td style={{ padding: "10px 14px" }}>{p.avgDaysLate === null ? "—" : `${p.avgDaysLate}d`}</td>
                    <td style={{ padding: "10px 14px", color: p.issueCount > 0 ? "var(--u-status-critical)" : "var(--u-ink-secondary)" }}>
                      {p.issueCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function QaTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  tone: "brand" | "warning" | "good" | "neutral";
}) {
  const toneColors: Record<string, string> = {
    brand: "var(--u-org-accent, var(--u-brand-violet))",
    warning: "var(--u-status-warning)",
    good: "var(--u-status-good)",
    neutral: "var(--u-ink-secondary)",
  };
  return (
    <div
      className="u-card-hover"
      style={{
        padding: "18px 20px",
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color: toneColors[tone], display: "flex" }}>{icon}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>
        {value === undefined ? "—" : value}
      </span>
    </div>
  );
}

function NewApprovalForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductMasterOption[]>([]);
  const [productId, setProductId] = useState("");
  const [manufacturers, setManufacturers] = useState<PartnerSummary[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerSummary[]>([]);
  const [manufacturerId, setManufacturerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listPartners("MANUFACTURER").then(setManufacturers).catch(() => setManufacturers([]));
    apiClient.listPartners("SUPPLIER").then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      apiClient.searchQualityProducts(productSearch || undefined).then(setProductOptions).catch(() => setProductOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [productSearch]);

  const productLabel = useMemo(() => productOptions.find((p) => p.id === productId)?.name ?? "", [productOptions, productId]);

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--u-ink-secondary)", fontWeight: 600 }}>
          Product (search the shared catalog)
          <input
            value={productId ? productLabel : productSearch}
            onChange={(e) => {
              setProductId("");
              setProductSearch(e.target.value);
            }}
            placeholder="Start typing a product name…"
            style={{
              padding: "9px 12px",
              fontSize: 13.5,
              fontFamily: "var(--u-font-sans)",
              borderRadius: "var(--u-radius-md)",
              border: "1px solid var(--u-border)",
              backgroundColor: "var(--u-surface)",
              color: "var(--u-ink)",
            }}
          />
          {!productId && productSearch && productOptions.length > 0 && (
            <div
              style={{
                border: "1px solid var(--u-border)",
                borderRadius: "var(--u-radius-md)",
                backgroundColor: "var(--u-surface)",
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {productOptions.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setProductId(p.id);
                    setProductSearch("");
                  }}
                  style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "var(--u-ink)" }}
                >
                  {p.name} <span style={{ color: "var(--u-ink-secondary)" }}>· {p.category}</span>
                </div>
              ))}
            </div>
          )}
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

      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{formError}</div>}

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
