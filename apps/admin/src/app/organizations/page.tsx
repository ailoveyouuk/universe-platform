"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrganizationSummary } from "@universe/types";
import { BuildingIcon, CheckCircleIcon, ClockIcon, LockIcon } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { AdminStatTile } from "../../components/AdminStatTile";

const STATUS_COLORS: Record<string, string> = {
  PILOT: "#B45309",
  ACTIVE: "#059669",
  SUSPENDED: "#6B7280",
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
  const [organizations, setOrganizations] = useState<OrganizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";

  useEffect(() => {
    apiClient
      .listOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organisations"));
  }, []);

  // Section mini-dashboard — same icon/tone treatment as Project
  // Management's StatTile (packages/ui/src/StatTile.tsx), hand-matched in
  // plain hex here rather than importing the design-system token sheet,
  // since this app doesn't otherwise opt into it and that's a bigger
  // change than a stat strip warrants (see @universe/ui's tokens.css).
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
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Organisations</h1>
        {isPlatformStaff && <Link href="/organizations/new">+ Create Organisation</Link>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, margin: "20px 0" }}>
        <AdminStatTile label="Total organisations" value={organizations ? counts.total : undefined} icon={<BuildingIcon size={18} />} tone="brand" />
        <AdminStatTile label="Active" value={organizations ? counts.active : undefined} icon={<CheckCircleIcon size={18} />} tone="good" />
        <AdminStatTile label="Pilot" value={organizations ? counts.pilot : undefined} icon={<ClockIcon size={18} />} tone="warning" />
        <AdminStatTile label="Suspended" value={organizations ? counts.suspended : undefined} icon={<LockIcon size={18} />} tone="neutral" />
      </div>

      {!isPlatformStaff && (
        <p style={{ color: "#6B7280", fontSize: 13, maxWidth: 560 }}>
          Onboarding a new organisation is platform-staff only during the pilot — there's no
          self-service path. You can still see and manage users within your own organisation from
          the Users page.
        </p>
      )}

      {error && <p style={{ color: "#B91C1C" }}>{error}</p>}
      {!organizations && !error && <p>Loading…</p>}

      {organizations && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #E5E7EB" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Slug</th>
              <th style={{ padding: 8 }}>Type</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: 8 }}>{o.name}</td>
                <td style={{ padding: 8, color: "#6B7280" }}>{o.slug}</td>
                <td style={{ padding: 8, color: "#6B7280" }}>{o.type === "SUPPLIER" ? "Supplier/Manufacturer" : "Buyer"}</td>
                <td style={{ padding: 8 }}>
                  <span
                    style={{
                      color: "#fff",
                      background: STATUS_COLORS[o.status] ?? "#6B7280",
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
            {organizations.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 8, color: "#6B7280" }}>
                  No organisations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

