"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrganizationSummary, PagedResult, UserCounts, UserSummary } from "@universe/types";
import { PartnersIcon, CheckCircleIcon, ClockIcon, LockIcon, Select, SearchInput, StatTile, StatTileGrid, Pagination, type PageSize } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { IncludeSimulatedToggle } from "./IncludeSimulatedToggle";
import { StatusChip } from "./form";

export function UsersView({ lockedOrgId }: { lockedOrgId?: string }) {
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const paramOrg = useSearchParams()?.get("organizationId") ?? "";
  const initialOrg = lockedOrgId ?? paramOrg;
  const embedded = !!lockedOrgId;

  // Server-side paging (2026-10-17, scale work): search, filters and paging run in the
  // API, tile counts come from the database, so thousands of users never load at once.
  const [result, setResult] = useState<PagedResult<UserSummary> | null>(null);
  const [counts, setCounts] = useState<UserCounts | null>(null);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState(initialOrg);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);
  const [includeSimulated, setIncludeSimulated] = useState(false);

  useEffect(() => {
    apiClient.listOrganizations(includeSimulated).then(setOrgs).catch(() => setOrgs([]));
  }, [includeSimulated]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    apiClient.getUserCounts(orgFilter || undefined, includeSimulated).then(setCounts).catch(() => setCounts(null));
  }, [orgFilter, includeSimulated]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .listUsersPage({ page: page + 1, pageSize: pageSize === "all" ? 100 : pageSize, q: debouncedSearch, status: statusFilter, organizationId: orgFilter, includeSimulated })
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, statusFilter, orgFilter, includeSimulated]);

  const visible = result?.items ?? [];
  const effectivePageSize = pageSize === "all" ? 100 : pageSize;
  const pageCount = Math.max(1, Math.ceil((result?.total ?? 0) / effectivePageSize));

  const toggleStatus = (s: string) => {
    setStatusFilter((cur) => (cur === s ? "" : s));
    setPage(0);
  };

  return (
    <div style={{ padding: embedded ? 0 : 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {embedded ? <span /> : <h1>Users</h1>}
        <Link href={orgFilter ? `/users/invite?organizationId=${orgFilter}` : "/users/invite"}>+ Invite a User</Link>
      </div>

      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label="Total users" value={counts?.total} icon={<PartnersIcon size={18} />} tone="brand" onClick={() => toggleStatus(statusFilter)} active={statusFilter === ""} />
        <StatTile label="Active" value={counts?.active} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => toggleStatus("ACTIVE")} active={statusFilter === "ACTIVE"} />
        <StatTile label="Invited" value={counts?.invited} icon={<ClockIcon size={18} />} tone="warning" onClick={() => toggleStatus("INVITED")} active={statusFilter === "INVITED"} />
        <StatTile label="Archived" value={counts?.archived} icon={<LockIcon size={18} />} tone="neutral" onClick={() => toggleStatus("DEACTIVATED")} active={statusFilter === "DEACTIVATED"} />
      </StatTileGrid>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ minWidth: 240, flex: "1 1 240px", maxWidth: 360 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, role…" />
        </div>
        {isPlatform && !embedded && (
          <div style={{ minWidth: 220 }}>
            <Select
              value={orgFilter}
              onChange={(v) => { setOrgFilter(v); setPage(0); }}
              allLabel="All organisations"
              options={orgs.map((o) => ({ value: o.id, label: o.name }))}
              ariaLabel="Filter by organisation"
            />
          </div>
        )}
        {isPlatform && !embedded && <IncludeSimulatedToggle checked={includeSimulated} onChange={(v) => { setIncludeSimulated(v); setPage(0); }} />}
      </div>

      {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}
      {!result && !error && <p>Loading…</p>}

      {result && (
        <>
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
        <Pagination pageSize={pageSize} onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }} page={page} pageCount={pageCount} onPageChange={setPage} totalCount={result.total} />
        </>
      )}
    </div>
  );
}
