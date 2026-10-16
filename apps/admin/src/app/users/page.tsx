"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrganizationSummary, UserSummary } from "@universe/types";
import { PartnersIcon, CheckCircleIcon, ClockIcon, LockIcon, Select, SearchInput, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { StatusChip } from "../../components/form";

export default function UsersPage() {
  // useSearchParams needs a Suspense boundary in a static export.
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <UsersList />
    </Suspense>
  );
}

function UsersList() {
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const initialOrg = useSearchParams()?.get("organizationId") ?? "";

  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState(initialOrg);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"));
    apiClient.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  const scoped = useMemo(() => (users ?? []).filter((u) => !orgFilter || u.organizationId === orgFilter), [users, orgFilter]);

  const counts = useMemo(
    () => ({
      total: scoped.length,
      active: scoped.filter((u) => u.status === "ACTIVE").length,
      invited: scoped.filter((u) => u.status === "INVITED").length,
      deactivated: scoped.filter((u) => u.status === "DEACTIVATED").length,
    }),
    [scoped],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter(
      (u) =>
        (!statusFilter || u.status === statusFilter) &&
        (!q || `${u.forename} ${u.surname} ${u.email} ${u.organizationName} ${u.roleNames.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [scoped, statusFilter, search]);

  const toggleStatus = (s: string) => setStatusFilter((cur) => (cur === s ? "" : s));

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Users</h1>
        <Link href={orgFilter ? `/users/invite?organizationId=${orgFilter}` : "/users/invite"}>+ Invite a User</Link>
      </div>

      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label="Total users" value={users ? counts.total : undefined} icon={<PartnersIcon size={18} />} tone="brand" onClick={() => setStatusFilter("")} active={statusFilter === ""} />
        <StatTile label="Active" value={users ? counts.active : undefined} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => toggleStatus("ACTIVE")} active={statusFilter === "ACTIVE"} />
        <StatTile label="Invited" value={users ? counts.invited : undefined} icon={<ClockIcon size={18} />} tone="warning" onClick={() => toggleStatus("INVITED")} active={statusFilter === "INVITED"} />
        <StatTile label="Deactivated" value={users ? counts.deactivated : undefined} icon={<LockIcon size={18} />} tone="neutral" onClick={() => toggleStatus("DEACTIVATED")} active={statusFilter === "DEACTIVATED"} />
      </StatTileGrid>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ minWidth: 240, flex: "1 1 240px", maxWidth: 360 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, role…" />
        </div>
        {isPlatform && (
          <div style={{ minWidth: 220 }}>
            <Select
              value={orgFilter}
              onChange={setOrgFilter}
              allLabel="All organisations"
              options={orgs.map((o) => ({ value: o.id, label: o.name }))}
              ariaLabel="Filter by organisation"
            />
          </div>
        )}
      </div>

      {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}
      {!users && !error && <p>Loading…</p>}

      {users && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--u-border)" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Organisation</th>
              <th style={{ padding: 8 }}>Role(s)</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Invited</th>
              <th style={{ padding: 8 }}>First sign-in</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                <td style={{ padding: 8 }}>
                  <Link href={`/users/detail?id=${u.id}`} style={{ fontWeight: 600 }}>
                    {u.forename} {u.surname}
                  </Link>
                </td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>
                  <Link href={`/organizations/detail?id=${u.organizationId}`}>{u.organizationName}</Link>
                </td>
                <td style={{ padding: 8 }}>{u.roleNames.join(", ") || "—"}</td>
                <td style={{ padding: 8 }}>
                  <StatusChip status={u.status} />
                </td>
                <td style={{ padding: 8 }}>{new Date(u.invitedAt).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>{u.firstSignInAt ? new Date(u.firstSignInAt).toLocaleDateString() : "Never signed in"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 8, color: "var(--u-ink-secondary)" }}>
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
