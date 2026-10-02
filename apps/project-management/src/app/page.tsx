"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectSummary, PartnerSummary, ProjectFinancialSummary } from "@universe/types";
import {
  Button,
  AddMenu,
  Pill,
  StatusBadge,
  ProjectsIcon,
  BuildingIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon,
} from "@universe/ui";
import { useCurrentUser } from "../lib/AuthContext";
import { apiClient } from "../lib/apiClient";

// Mirrors projects/page.tsx's own STATUS_GROUPS/isOverdue logic exactly —
// kept in sync by hand since this page only needs the counts, not the
// full filterable table. See that file's comment for why "Active" means
// not-yet-submitted and "Awarded" is deliberately AWARDED only.
const ACTIVE_STATUSES = ["IDENTIFIED", "IN_PROGRESS"];
const TERMINAL_STATUSES = ["COMPLETED", "AWARDED", "UNAWARDED", "DECLINED", "CANCELLED"];

/**
 * The Project Management landing dashboard — the "nerve centre" redesign,
 * 2026-10-03, per Lewis's instruction to make it "aesthetically pleasing,
 * intuitive, informative and functional" and, specifically, to visualise
 * Awarded projects (now being worked on, post-submission) with equal
 * prominence to Active ones (not yet submitted) — previously the stat
 * tiles conflated Awarded with Completed into one count, and the single
 * "Recent projects" list below gave no separate visibility to either
 * group. Fixed both: the stat tiles now match the corrected, mutually
 * exclusive Active/Submitted/Awarded/Completed/Overdue breakdown already
 * shipped in projects/page.tsx, and the single "Recent projects" list is
 * now two equally-sized panels — Active and Awarded — side by side.
 *
 * Also adds "+ Add Product" next to "+ Add Stakeholder" (same AddMenu
 * pattern, Non-Pharmaceutical / Pharmaceutical options) routing to the
 * new contextualised /products/new screen, which writes to the same
 * shared product catalogue the Quality module's product search and every
 * project line's "Matched Product" field already read from.
 */
export default function HomePage() {
  const me = useCurrentUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [partners, setPartners] = useState<PartnerSummary[] | null>(null);
  // Financial Overview (added 2026-10-02) — org-wide rollup across every
  // ProjectLine's LOCKED reporting-currency amounts. See
  // ProjectFinancialSummary's doc comment in packages/types for why this
  // lives here rather than per-project: it's a stand-in for the future
  // "Insights" app, per Lewis's own phrasing. null while loading/on
  // failure (e.g. no lines priced yet) — financialSummary renders nothing
  // rather than a misleading all-zero panel in that case.
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);

  useEffect(() => {
    apiClient.listProjects().then(setProjects).catch(() => setProjects([]));
    apiClient.listPartners().then(setPartners).catch(() => setPartners([]));
    apiClient.getProjectFinancialSummary().then(setFinancialSummary).catch(() => setFinancialSummary(null));
  }, []);

  function isOverdue(p: ProjectSummary): boolean {
    return Boolean(p.dueDate) && new Date(p.dueDate as string) < new Date() && !TERMINAL_STATUSES.includes(p.status);
  }

  const stats = useMemo(() => {
    const list = projects ?? [];
    const active = list.filter((p) => ACTIVE_STATUSES.includes(p.status));
    const submitted = list.filter((p) => p.status === "SUBMITTED");
    const awarded = list.filter((p) => p.status === "AWARDED");
    const overdue = list.filter(isOverdue);
    return { active: active.length, submitted: submitted.length, awarded: awarded.length, overdue: overdue.length };
  }, [projects]);

  const activeProjects = useMemo(
    () => (projects ?? []).filter((p) => ACTIVE_STATUSES.includes(p.status)).slice(0, 5),
    [projects]
  );
  const awardedProjects = useMemo(() => (projects ?? []).filter((p) => p.status === "AWARDED").slice(0, 5), [projects]);

  const stakeholderStats = useMemo(() => {
    if (!partners) return null;
    const clients = partners.filter((p) => p.roles.some((r) => r.roleType === "CLIENT"));
    const qaApproved = partners.filter(
      (p) => p.approvalStatus === "APPROVED" && p.roles.some((r) => r.roleType === "MANUFACTURER" || r.roleType === "SUPPLIER")
    );
    return { clients: clients.length, qaApproved: qaApproved.length };
  }, [partners]);

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
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)" }}>
            Welcome back, {me?.forename}.
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6 }}>
            Here's what's happening across {me?.organizationName}'s projects.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/projects/new" style={{ textDecoration: "none" }}>
            <Button variant="primary" icon={<ProjectsIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))">
              New Project
            </Button>
          </Link>
          <AddMenu
            label="Add Stakeholder"
            options={[
              { label: "Client", onSelect: () => router.push("/partners/new?role=CLIENT") },
              { label: "Manufacturer / Supplier", onSelect: () => router.push("/partners/new?role=MANUFACTURER") },
              { label: "Freight Forwarder", onSelect: () => router.push("/partners/new?role=FREIGHT_FORWARDER") },
            ]}
          />
          <AddMenu
            label="Add Product"
            options={[
              { label: "Non-Pharmaceutical", onSelect: () => router.push("/products/new?context=NON_PHARMACEUTICAL") },
              { label: "Pharmaceutical", onSelect: () => router.push("/products/new?context=PHARMACEUTICAL") },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatTile href="/projects?status=ACTIVE" label="Active (not submitted)" value={stats?.active} icon={<ClockIcon size={20} />} tone="warning" />
        <StatTile href="/projects?status=SUBMITTED" label="Submitted" value={stats?.submitted} icon={<ProjectsIcon size={20} />} tone="neutral" />
        <StatTile href="/projects?status=AWARDED" label="Awarded (in progress)" value={stats?.awarded} icon={<CheckCircleIcon size={20} />} tone="brand" />
        <StatTile href="/projects?status=OVERDUE" label="Overdue" value={stats?.overdue} icon={<AlertIcon size={20} />} tone="critical" />
        <StatTile href="/partners?role=CLIENT" label="Clients" value={stakeholderStats?.clients} icon={<BuildingIcon size={20} />} tone="neutral" />
        <StatTile href="/partners?approval=APPROVED" label="QA Approved Mfg. & Suppliers" value={stakeholderStats?.qaApproved} icon={<CheckCircleIcon size={20} />} tone="good" />
      </div>

      {financialSummary && financialSummary.linesWithPricing > 0 && (
        <section
          style={{
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-lg)",
            backgroundColor: "var(--u-surface-raised)",
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUpIcon size={16} />
              Financial Overview ({financialSummary.reportingCurrencyCode})
            </h2>
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              {financialSummary.linesWithPricing} of {financialSummary.totalLines} line{financialSummary.totalLines === 1 ? "" : "s"} priced
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "0 0 14px" }}>
            Each line's native-currency price is converted once, at the FX rate for the date it was entered, and locked — these totals won't shift as rates move.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <FinancialStat label="Total supplier cost" value={financialSummary.totalSupplierCostReportingCcy} currency={financialSummary.reportingCurrencyCode} />
            <FinancialStat label="Total sales value" value={financialSummary.totalSalesValueReportingCcy} currency={financialSummary.reportingCurrencyCode} />
            <FinancialStat label="Total margin" value={financialSummary.totalMarginReportingCcy} currency={financialSummary.reportingCurrencyCode} tone={Number(financialSummary.totalMarginReportingCcy) >= 0 ? "good" : "critical"} />
          </div>
        </section>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 20,
        }}
      >
        <ProjectPanel
          title="Active projects"
          subtitle="Not yet submitted"
          viewAllHref="/projects?status=ACTIVE"
          projects={activeProjects}
          loading={!projects}
          emptyText="No active projects right now."
          icon={<ClockIcon size={14} />}
        />
        <ProjectPanel
          title="Awarded projects"
          subtitle="Now being worked on"
          viewAllHref="/projects?status=AWARDED"
          projects={awardedProjects}
          loading={!projects}
          emptyText="No awarded projects right now."
          icon={<CheckCircleIcon size={14} />}
        />
      </div>
    </div>
  );
}

function ProjectPanel({
  title,
  subtitle,
  viewAllHref,
  projects,
  loading,
  emptyText,
  icon,
}: {
  title: string;
  subtitle: string;
  viewAllHref: string;
  projects: ProjectSummary[];
  loading: boolean;
  emptyText: string;
  icon: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: "var(--u-radius-lg)",
        backgroundColor: "var(--u-surface-raised)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--u-ink-secondary)", display: "flex" }}>{icon}</span>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>{title}</h2>
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{subtitle}</span>
          </div>
        </div>
        <Link href={viewAllHref} style={{ fontSize: 13, fontWeight: 600, color: "var(--u-brand-violet)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          View all <TrendingUpIcon size={13} />
        </Link>
      </div>

      {loading && <div style={{ padding: 20, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}

      {!loading && projects.length === 0 && (
        <div style={{ padding: 20, color: "var(--u-ink-secondary)", fontSize: 13.5, textAlign: "center" }}>{emptyText}</div>
      )}

      {!loading && projects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/detail?id=${p.id}`} style={{ textDecoration: "none" }}>
              <div
                className="u-card-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: "var(--u-radius-md)",
                  border: "1px solid var(--u-border)",
                  backgroundColor: "var(--u-surface-base, var(--u-surface-raised))",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                    {p.referenceNumber} {p.clientName ? `· ${p.clientName}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {p.dueDate && (
                    <Pill tone="neutral" icon={<ClockIcon size={11} />}>
                      {new Date(p.dueDate).toLocaleDateString()}
                    </Pill>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** One figure inside the Financial Overview panel — formats a numeric
 * string (the API's Decimal-as-string convention) with thousands
 * separators, since this is a sum across potentially many lines. */
function FinancialStat({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: string;
  currency: string;
  tone?: "good" | "critical";
}) {
  const formatted = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: tone === "good" ? "var(--u-status-good)" : tone === "critical" ? "var(--u-status-critical)" : "var(--u-ink)" }}>
        {currency} {formatted}
      </div>
    </div>
  );
}

function StatTile({
  href,
  label,
  value,
  icon,
  tone,
}: {
  href: string;
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  tone: "brand" | "warning" | "good" | "neutral" | "critical";
}) {
  const toneColors: Record<string, string> = {
    brand: "var(--u-org-accent, var(--u-brand-violet))",
    warning: "var(--u-status-warning)",
    good: "var(--u-status-good)",
    neutral: "var(--u-ink-secondary)",
    critical: "var(--u-status-critical)",
  };
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
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
          cursor: "pointer",
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
    </Link>
  );
}
