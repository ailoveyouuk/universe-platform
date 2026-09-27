"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PartnerSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";

const ROLE_FILTERS = ["", "CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;

export default function PartnersPage() {
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("");
  const [partners, setPartners] = useState<PartnerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPartners(null);
    apiClient
      .listPartners(roleFilter || undefined)
      .then(setPartners)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load partners"));
  }, [roleFilter]);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Partners</h1>
        <Link href="/partners/new">+ New Partner</Link>
      </div>
      <p style={{ color: "#6B7280", marginTop: -8 }}>
        Clients, suppliers, manufacturers, and freight forwarders your organization does business with.
      </p>

      <div style={{ marginTop: 16 }}>
        <label>
          Role{" "}
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as (typeof ROLE_FILTERS)[number])}>
            {ROLE_FILTERS.map((r) => (
              <option key={r} value={r}>
                {r ? r.replace(/_/g, " ") : "All"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p style={{ color: "#B91C1C" }}>{error}</p>}
      {!partners && !error && <p>Loading…</p>}

      {partners && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #E5E7EB" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Roles</th>
              <th style={{ padding: 8 }}>Country</th>
              <th style={{ padding: 8 }}>Website</th>
              <th style={{ padding: 8 }}>Approval</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.roles.map((r) => r.roleType.replace(/_/g, " ")).join(", ")}</td>
                <td style={{ padding: 8 }}>{p.countryCode ?? "—"}</td>
                <td style={{ padding: 8 }}>
                  {p.website ? (
                    <a href={p.website} target="_blank" rel="noreferrer">
                      {p.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: 8 }}>{p.approvalStatus}</td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: "#6B7280" }}>
                  No partners yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
