"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrganizationSummary } from "@universe/types";
import { BuildingIcon, CheckCircleIcon, ClockIcon, LockIcon, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { IncludeSimulatedToggle } from "../../components/IncludeSimulatedToggle";
import { ORG_TYPE_LABELS } from "../../components/form";
import { useCurrentUser } from "../../lib/AuthContext";
import { useCountries } from "../../lib/useCountries";

const STATUS_COLORS: Record<string, string> = {
  PILOT: "var(--u-status-warning)",
  ACTIVE: "var(--u-status-good)",
  SUSPENDED: "var(--u-ink-secondary)",
};

/**
 * Onboarding is platform-operator-provisioned only during the pilot (see
 * architecture doc) — there is no self-service "create your own
 * organization" path, so this page (and the create form it links to) is
 * meaningful only for platform staff. An org admin can still land here
 * (findAll() server-side just returns their own org), but "+ Create
 * Organization" is hidden for them rather than offered and then rejected
 * server-side — assertPlatformStaff in OrganizationsService.create is the
 * actual enforcement, this is just the UI reflecting it.
 *
 * `me` now comes from AuthContext (populated once by AppShell's useAuth())
 * rather than this page's own apiClient.me() call — see AppShell.tsx.
 */
export default function OrganizationsPage() {
  const me = useCurrentUser();
  const countries = useCountries();
  const [organizations, setOrganizations] = useState<OrganizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "PILOT" | "SUSPENDED">("");

  useEffect(() => {
    apiClient
      .listOrganizations(includeSimulated)
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organisations"));
  }, [includeSimulated]);

  // Section mini-dashboard — shared StatTile/StatTileGrid from
  // @universe/ui, same component Project Management uses.
  const counts = useMemo(() => {
    const list = organizations ?? [];
    return {
      total: list.length,
      active: list.filter((o) => o.status === "ACTIVE").length,
      pilot: list.filter((o) => o.status === "PILOT").length,
      suspended: list.filter((o) => o.status === "SUSPENDED").length,
    };
  }, [organizations]);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Organisations</h1>
        {isPlatformStaff && <Link href="/organizations/new">+ Create Organisation</Link>}
      </div>

      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label="Total organisations" active={statusFilter === ""} onClick={() => setStatusFilter("")} value={organizations ? counts.total : undefined} icon={<BuildingIcon size={18} />} tone="brand" />
        <StatTile label="Active" active={statusFilter === "ACTIVE"} onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "" : "ACTIVE")} value={organizations ? counts.active : undefined} icon={<CheckCircleIcon size={18} />} tone="good" />
        <StatTile label="Pilot" active={statusFilter === "PILOT"} onClick={() => setStatusFilter(statusFilter === "PILOT" ? "" : "PILOT")} value={organizations ? counts.pilot : undefined} icon={<ClockIcon size={18} />} tone="warning" />
        <StatTile label="Suspended" active={statusFilter === "SUSPENDED"} onClick={() => setStatusFilter(statusFilter === "SUSPENDED" ? "" : "SUSPENDED")} value={organizations ? counts.suspended : undefined} icon={<LockIcon size={18} />} tone="neutral" />
      </StatTileGrid>

      {isPlatformStaff && (
        <div style={{ marginBottom: 12 }}>
          <IncludeSimulatedToggle checked={includeSimulated} onChange={setIncludeSimulated} />
        </div>
      )}

      {!isPlatformStaff && (
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 560 }}>
          Onboarding a new organisation is platform-staff only during the pilot — there's no
          self-service path. You can still see and manage users within your own organisation from
          the Users page.
        </p>
      )}

      {error && <p style={{ color: "var(--u-status-critical-text)" }}>{error}</p>}
      {!organizations && !error && <p>Loading…</p>}

      {organizations && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--u-border)" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Slug</th>
              <th style={{ padding: 8 }}>Type</th>
              <th style={{ padding: 8 }}>Country</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.filter((o) => !statusFilter || o.status === statusFilter).map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                <td style={{ padding: 8 }}>
                  <Link href={`/organizations/detail?id=${o.id}`} style={{ fontWeight: 600 }}>{o.name}</Link>
                </td>
                <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{o.slug}</td>
                <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{ORG_TYPE_LABELS[o.type] ?? o.type}</td>
                <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>
                  {o.countryOfRegistrationCode
                    ? countries.find((c) => c.code === o.countryOfRegistrationCode)?.name ?? o.countryOfRegistrationCode
                    : "—"}
                </td>
                <td style={{ padding: 8 }}>
                  <span
                    style={{
                      color: "var(--u-on-accent)",
                      background: STATUS_COLORS[o.status] ?? "var(--u-ink-secondary)",
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {organizations.filter((o) => !statusFilter || o.status === statusFilter).length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 8, color: "var(--u-ink-secondary)" }}>
                  No organisations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

