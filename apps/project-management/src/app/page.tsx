"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectSummary, PartnerSummary } from "@universe/types";
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
} from "@universe/ui";
import { useCurrentUser } from "../lib/AuthContext";
import { apiClient } from "../lib/apiClient";

/**
 * The Project Management landing dashboard — 2026-10-01, replacing the
 * single-line "Welcome back" placeholder, then revised the same day per
 * Lewis's follow-up: every stat tile is now a working link into the
 * filtered Projects/Stakeholders view behind it (see those pages' own
 * `?status=`/`?role=`/`?approval=` query-param handling), "Partners" is
 * "Clients" (counts CLIENT-role stakeholders specifically) with a new
 * "QA Approved" tile alongside it (APPROVED-status stakeholders), and
 * "New Partner" is the same AddMenu concertina used on the Stakeholders
 * page rather than a single flat button.
 */
export default function HomePage() {
  const me = useCurrentUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [partners, setPartners] = useState<PartnerSummary[] | null>(null);

  useEffect(() => {
    apiClient.listProjects().then(setProjects).catch(() => setProjects([]));
    apiClient.listPartners().then(setPartners).catch(() => setPartners([]));
  }, []);

  const stats = useMemo(() => {
    if (!projects) return null;
    const active = projects.filter((p) => !["COMPLETED", "UNAWARDED", "DECLINED", "CANCELLED"].includes(p.status));
    const awaitingSubmission = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "IDENTIFIED");
    const awarded = projects.filter((p) => p.status === "AWARDED" || p.status === "COMPLETED");
    return { active: active.length, awaitingSubmission: awaitingSubmission.length, awarded: awarded.length };
  }, [projects]);

  const stakeholderStats = useMemo(() => {
    if (!partners) return null;
    const clients = partners.filter((p) => p.roles.some((r) => r.roleType === "CLIENT"));
    const qaApproved = partners.filter(
      (p) => p.approvalStatus === "APPROVED" && p.roles.some((r) => r.roleType === "MANUFACTURER" || r.roleType === "SUPPLIER")
    );
    return { clients: clients.length, qaApproved: qaApproved.length };
  }, [partners]);

  const recent = useMemo(() => (projects ?? []).slice(0, 6), [projects]);

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
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatTile href="/projects" label="Active projects" value={stats?.active} icon={<ProjectsIcon size={20} />} tone="brand" />
        <StatTile href="/projects?status=IN_PROGRESS" label="In progress / identified" value={stats?.awaitingSubmission} icon={<ClockIcon size={20} />} tone="warning" />
        <StatTile href="/projects?status=AWARDED" label="Awarded or completed" value={stats?.awarded} icon={<CheckCircleIcon size={20} />} tone="good" />
        <StatTile href="/partners?role=CLIENT" label="Clients" value={stakeholderStats?.clients} icon={<BuildingIcon size={20} />} tone="neutral" />
        <StatTile href="/partners?approval=APPROVED" label="QA Approved Mfg. & Suppliers" value={stakeholderStats?.qaApproved} icon={<CheckCircleIcon size={20} />} tone="good" />
      </div>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>Recent projects</h2>
          <Link href="/projects" style={{ fontSize: 13, fontWeight: 600, color: "var(--u-brand-violet)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            View all <TrendingUpIcon size={13} />
          </Link>
        </div>

        {!projects && (
          <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>
        )}

        {projects && recent.length === 0 && (
          <div
            className="u-card-hover"
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
            No projects yet.{" "}
            <Link href="/projects/new" style={{ color: "var(--u-brand-violet)", fontWeight: 600 }}>
              Create your first one
            </Link>
            .
          </div>
        )}

        {projects && recent.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((p) => (
              <Link key={p.id} href={`/projects/detail?id=${p.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="u-card-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 18px",
                    borderRadius: "var(--u-radius-md)",
                    border: "1px solid var(--u-border)",
                    backgroundColor: "var(--u-surface-raised)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--u-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                      {p.referenceNumber} {p.clientName ? `· ${p.clientName}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    {p.dueDate && (
                      <Pill tone="neutral" icon={<ClockIcon size={12} />}>
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
  tone: "brand" | "warning" | "good" | "neutral";
}) {
  const toneColors: Record<string, string> = {
    brand: "var(--u-org-accent, var(--u-brand-violet))",
    warning: "var(--u-status-warning)",
    good: "var(--u-status-good)",
    neutral: "var(--u-ink-secondary)",
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
