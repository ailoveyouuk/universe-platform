"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthenticatedUser, OrganizationSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";

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
 */
export default function OrganizationsPage() {
  const [me, setMe] = useState<AuthenticatedUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";

  useEffect(() => {
    apiClient
      .me()
      .then(setMe)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your account"));
    apiClient
      .listOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organizations"));
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Organizations</h1>
        {isPlatformStaff && <Link href="/organizations/new">+ Create Organization</Link>}
      </div>

      {!isPlatformStaff && me && (
        <p style={{ color: "#6B7280", fontSize: 13, maxWidth: 560 }}>
          Onboarding a new organization is platform-staff only during the pilot — there's no
          self-service path. You can still see and manage users within your own organization from
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
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: 8 }}>{o.name}</td>
                <td style={{ padding: 8, color: "#6B7280" }}>{o.slug}</td>
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
                <td colSpan={3} style={{ padding: 8, color: "#6B7280" }}>
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
