"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FieldChangeFeedEntry, OrganizationSummary } from "@universe/types";
import { Button, Select } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { IncludeSimulatedToggle } from "../../components/IncludeSimulatedToggle";
import { useCurrentUser } from "../../lib/AuthContext";
import { Notice } from "../../components/form";

const TABLES: { value: string; label: string }[] = [
  { value: "organizations", label: "Organisations" },
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "partners", label: "Stakeholders" },
  { value: "projects", label: "Projects" },
  { value: "project_lines", label: "Project lines" },
  { value: "risk_assessments", label: "Risks" },
  { value: "controlled_documents", label: "Controlled documents" },
];

function recordHref(e: FieldChangeFeedEntry): string | null {
  if (e.tableName === "organizations") return `/organizations/detail?id=${e.recordId}`;
  if (e.tableName === "users") return `/users/detail?id=${e.recordId}`;
  return null;
}

/** Platform-wide activity feed — every audited field change, newest first. */
export default function ActivityPage() {
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [orgId, setOrgId] = useState("");
  const [table, setTable] = useState("");
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [entries, setEntries] = useState<FieldChangeFeedEntry[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatform) apiClient.listOrganizations(includeSimulated).then(setOrgs).catch(() => setOrgs([]));
  }, [isPlatform, includeSimulated]);

  useEffect(() => {
    if (!me) return;
    setEntries(null);
    setError(null);
    apiClient
      .getActivityFeed({ organizationId: orgId, tableName: table, includeSimulated })
      .then((p) => {
        setEntries(p.entries);
        setNext(p.nextBefore);
      })
      .catch((e) => {
        setEntries([]);
        setError(e instanceof Error ? e.message : "Failed to load activity");
      });
  }, [me, orgId, table, includeSimulated]);

  async function more() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const p = await apiClient.getActivityFeed({ organizationId: orgId, tableName: table, before: next, includeSimulated });
      setEntries((prev) => [...(prev ?? []), ...p.entries]);
      setNext(p.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1000 }}>
      <h1>Activity</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 680 }}>
        Every audited change, newest first{isPlatform ? ", across all organisations" : " in your organisation"}. Entries are
        permanent and can&apos;t be edited.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
        {isPlatform && (
          <div style={{ minWidth: 220 }}>
            <Select value={orgId} onChange={setOrgId} allLabel="All organisations" options={orgs.map((o) => ({ value: o.id, label: o.name }))} ariaLabel="Organisation" />
          </div>
        )}
        <div style={{ minWidth: 200 }}>
          <Select value={table} onChange={setTable} allLabel="All record types" options={TABLES} ariaLabel="Record type" />
        </div>
        {isPlatform && <IncludeSimulatedToggle checked={includeSimulated} onChange={setIncludeSimulated} />}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {entries === null && <p>Loading…</p>}
      {entries && entries.length === 0 && !error && <p style={{ color: "var(--u-ink-secondary)" }}>No activity recorded{isPlatform && !orgId && !includeSimulated ? " for your organisation or any live organisation. Demo and simulated organisations are hidden here: pick one in the organisation filter, or tick the simulated toggle, to see theirs" : ""}.</p>}
      {entries && entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => {
            const href = recordHref(e);
            return (
              <div key={e.id} style={{ padding: "10px 14px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", color: "var(--u-ink-secondary)", fontSize: 12 }}>
                  <span>
                    {e.changedByName ?? "System"} · {new Date(e.changedAt).toLocaleString()}
                  </span>
                  {isPlatform && e.organizationName && <span>{e.organizationName}</span>}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: "var(--u-ink-secondary)" }}>{e.tableName}</span>{" "}
                  {href ? <Link href={href} style={{ fontWeight: 600 }}>{e.recordLabel}</Link> : <strong>{e.recordLabel}</strong>} ·{" "}
                  <strong>{e.fieldName}</strong>: {e.oldValue ?? "—"} → {e.newValue ?? "—"}
                </div>
                {e.reason && <div style={{ color: "var(--u-ink-secondary)", marginTop: 2 }}>Reason: {e.reason}</div>}
              </div>
            );
          })}
        </div>
      )}
      {next && (
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" disabled={loadingMore} onClick={more}>
            {loadingMore ? "Loading…" : "Load older"}
          </Button>
        </div>
      )}
    </main>
  );
}
