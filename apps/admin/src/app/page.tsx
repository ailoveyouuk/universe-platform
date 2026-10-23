"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FieldChangeFeedEntry, OrganizationSummary, UserCounts } from "@universe/types";
import { BuildingIcon, Button, CheckCircleIcon, ClockIcon, PartnersIcon, PlusIcon, ShieldIcon, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { Section } from "../components/form";

export default function AdminHomePage() {
  const router = useRouter();
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [userCounts, setUserCounts] = useState<UserCounts | null>(null);
  const [recent, setRecent] = useState<FieldChangeFeedEntry[] | null>(null);

  useEffect(() => {
    if (!me) return;
    apiClient.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
    apiClient.getUserCounts().then(setUserCounts).catch(() => setUserCounts(null));
    apiClient.getActivityFeed({ limit: 5 }).then((p) => setRecent(p.entries)).catch(() => setRecent([]));
  }, [me]);

  const pilot = orgs?.filter((o) => o.status === "PILOT").length;
  const invited = userCounts?.invited;

  return (
    <main style={{ padding: "clamp(14px, 4vw, 32px)", maxWidth: 1000 }}>
      <h1>Universe Admin</h1>
      <p style={{ color: "var(--u-ink-secondary)", maxWidth: 620, margin: "4px 0 16px" }}>
        Onboard organisations, manage their people and roles, and review what has changed.
      </p>

      <div className="u-quick-actions" style={{ marginBottom: 8 }}>
        {isPlatform ? (
          <>
            <Link href="/organizations/new" style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="primary" icon={<PlusIcon size={16} />}>Create organisation</Button>
            </Link>
            <Link href="/users/invite" style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="secondary" icon={<PartnersIcon size={16} />}>Invite a user</Button>
            </Link>
            <Link href="/organizations" style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="secondary" icon={<BuildingIcon size={16} />}>All organisations</Button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/users/invite" style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="primary" icon={<PlusIcon size={16} />}>Invite a user</Button>
            </Link>
            <Link href={me ? `/organizations/detail?id=${me.organizationId}` : "/organizations"} style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="secondary" icon={<BuildingIcon size={16} />}>My organisation</Button>
            </Link>
            <Link href={me ? `/organizations/detail?id=${me.organizationId}&tab=roles` : "/roles"} style={{ textDecoration: "none", display: "block" }}>
              <Button className="u-quick-action" variant="secondary" icon={<ShieldIcon size={16} />}>Manage roles</Button>
            </Link>
          </>
        )}
      </div>

      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label={isPlatform ? "Organisations" : "Your organisation"} value={orgs?.length} icon={<BuildingIcon size={18} />} tone="brand" onClick={() => router.push("/organizations")} />
        <StatTile label="Users" value={userCounts?.total} icon={<PartnersIcon size={18} />} tone="brand" onClick={() => router.push("/users")} />
        <StatTile label="Awaiting first sign-in" value={invited} icon={<ClockIcon size={18} />} tone="warning" onClick={() => router.push("/users")} />
        <StatTile label="Pilot organisations" value={pilot} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => router.push("/organizations")} />
      </StatTileGrid>

      <Section
        title="Recent activity"
        actions={<Link href="/activity" style={{ fontSize: 13 }}>View all →</Link>}
      >
        {recent === null ? (
          <p>Loading…</p>
        ) : recent.length === 0 ? (
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>Nothing recorded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {recent.map((e) => (
              <li key={e.id}>
                <span style={{ color: "var(--u-ink-secondary)" }}>{new Date(e.changedAt).toLocaleString()} · {e.changedByName ?? "System"} · </span>
                <strong>{e.recordLabel}</strong> {e.fieldName}: {e.oldValue ?? "—"} → {e.newValue ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </Section>

    </main>
  );
}
