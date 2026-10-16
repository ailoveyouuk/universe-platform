"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RoleSummary, UserDetail } from "@universe/types";
import { Button, Select } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { AuditHistory } from "../../../components/AuditHistory";
import { Field, FormGrid, Notice, Section, StatusChip, inputStyle } from "../../../components/form";

export function UserDetailView() {
  const id = useSearchParams()?.get("id") ?? "";
  const me = useCurrentUser();
  const meIsPlatform = !!me && me.platformStaffRole !== "NONE";
  const isSelf = me?.id === id;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleSummary[] | null>(null);

  const [form, setForm] = useState({ forename: "", surname: "", jobTitle: "", platformStaffRole: "NONE" as UserDetail["platformStaffRole"] });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "profile" | "roles" | "status">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function adopt(u: UserDetail) {
    setUser(u);
    setForm({ forename: u.forename, surname: u.surname, jobTitle: u.jobTitle ?? "", platformStaffRole: u.platformStaffRole });
    setSelectedRoles(u.roleIds);
  }

  useEffect(() => {
    if (!id) return;
    apiClient
      .getUser(id)
      .then((u) => {
        adopt(u);
        apiClient.listOrganizationRoles(u.organizationId).then(setRoles).catch(() => setRoles([]));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load user"));
  }, [id]);

  if (!id) return <main style={{ padding: 32 }}><p>No user selected. <Link href="/users">Back to users</Link></p></main>;
  if (loadError) return <main style={{ padding: 32 }}><Notice tone="error">{loadError}</Notice><Link href="/users">Back to users</Link></main>;
  if (!user) return <main style={{ padding: 32 }}>Loading…</main>;

  const profileDirty =
    form.forename !== user.forename ||
    form.surname !== user.surname ||
    form.jobTitle !== (user.jobTitle ?? "") ||
    (meIsPlatform && form.platformStaffRole !== user.platformStaffRole);
  const rolesDirty = [...selectedRoles].sort().join() !== [...user.roleIds].sort().join();

  async function act<T>(kind: "profile" | "roles" | "status", fn: () => Promise<T>, okMsg: string) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(okMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const reload = async () => adopt(await apiClient.getUser(id));

  return (
    <main style={{ padding: 32, maxWidth: 860 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href="/users">← Users</Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>
          {user.forename} {user.surname}
        </h1>
        <StatusChip status={user.status} />
        {user.platformStaffRole !== "NONE" && <StatusChip status={user.platformStaffRole === "SUPER_ADMIN" ? "SUPER ADMIN" : "SUPPORT"} />}
      </div>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "6px 0 0" }}>
        {user.email} · <Link href={`/organizations/detail?id=${user.organizationId}`}>{user.organizationName}</Link>
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <Section title="Profile">
        <FormGrid>
          <Field label="First name">
            <input style={inputStyle} value={form.forename} onChange={(e) => setForm({ ...form, forename: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input style={inputStyle} value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
          </Field>
          <Field label="Job title">
            <input style={inputStyle} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </Field>
          <Field label="Email" hint="The email is the sign-in identity and can't be changed here.">
            <input style={inputStyle} value={user.email} disabled />
          </Field>
          {meIsPlatform && (
            <Field
              label="Platform staff role"
              hint={isSelf ? "You can't change your own platform role." : "Universe operating-team access across all organisations. Only a SUPER_ADMIN can grant or revoke SUPER_ADMIN."}
            >
              <div style={{ marginTop: 4, opacity: isSelf ? 0.6 : 1, pointerEvents: isSelf ? "none" : "auto" }}>
                <Select
                  value={form.platformStaffRole}
                  onChange={(v) => setForm({ ...form, platformStaffRole: v as UserDetail["platformStaffRole"] })}
                  options={[
                    { value: "NONE", label: "None (regular user)" },
                    { value: "SUPPORT", label: "Support" },
                    { value: "SUPER_ADMIN", label: "Super admin" },
                  ]}
                  ariaLabel="Platform staff role"
                />
              </div>
            </Field>
          )}
        </FormGrid>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            disabled={!profileDirty || busy !== null || !form.forename.trim() || !form.surname.trim()}
            onClick={() =>
              act(
                "profile",
                async () => {
                  const body: Record<string, unknown> = {};
                  if (form.forename !== user.forename) body.forename = form.forename.trim();
                  if (form.surname !== user.surname) body.surname = form.surname.trim();
                  if (form.jobTitle !== (user.jobTitle ?? "")) body.jobTitle = form.jobTitle.trim() === "" ? null : form.jobTitle.trim();
                  if (meIsPlatform && !isSelf && form.platformStaffRole !== user.platformStaffRole) body.platformStaffRole = form.platformStaffRole;
                  adopt(await apiClient.updateUser(id, body));
                },
                "Profile saved.",
              )
            }
          >
            {busy === "profile" ? "Saving…" : "Save profile"}
          </Button>
          <Button variant="ghost" disabled={!profileDirty || busy !== null} onClick={() => adopt(user)}>
            Discard
          </Button>
        </div>
      </Section>

      <Section title="Roles" hint="Roles belong to the user's organisation and decide what they can do in each app.">
        {roles === null ? (
          <p>Loading roles…</p>
        ) : roles.length === 0 ? (
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>This organisation has no roles.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {roles.map((r) => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r.id)}
                  onChange={() => setSelectedRoles((prev) => (prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]))}
                />
                {r.name}
                <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{r.appScope}</span>
              </label>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            disabled={!rolesDirty || busy !== null}
            onClick={() =>
              act(
                "roles",
                async () => {
                  await apiClient.updateUserRoles(id, selectedRoles);
                  await reload();
                },
                "Roles updated.",
              )
            }
          >
            {busy === "roles" ? "Saving…" : "Save roles"}
          </Button>
        </div>
      </Section>

      <Section title="Access">
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: "0 0 16px", fontSize: 13 }}>
          <dt style={{ color: "var(--u-ink-secondary)" }}>Invited</dt>
          <dd style={{ margin: 0 }}>
            {new Date(user.invitedAt).toLocaleString()} {user.invitedByName ? `by ${user.invitedByName}` : ""}
          </dd>
          <dt style={{ color: "var(--u-ink-secondary)" }}>First sign-in</dt>
          <dd style={{ margin: 0 }}>{user.firstSignInAt ? new Date(user.firstSignInAt).toLocaleString() : "Has not signed in yet"}</dd>
          <dt style={{ color: "var(--u-ink-secondary)" }}>Identity linked</dt>
          <dd style={{ margin: 0 }}>{user.linkedToIdentity ? "Yes" : "No — links on first sign-in"}</dd>
        </dl>
        {user.status === "DEACTIVATED" ? (
          <Button
            variant="primary"
            disabled={busy !== null}
            onClick={() =>
              act("status", async () => { await apiClient.reactivateUser(id); await reload(); }, "User reactivated.")
            }
          >
            {busy === "status" ? "Working…" : "Reactivate user"}
          </Button>
        ) : (
          <Button
            variant="danger"
            disabled={busy !== null || isSelf}
            title={isSelf ? "You can't deactivate your own account" : undefined}
            onClick={() => {
              if (!confirm("Deactivate this user? They'll lose access immediately.")) return;
              void act("status", async () => { await apiClient.deactivateUser(id); await reload(); }, "User deactivated.");
            }}
          >
            {busy === "status" ? "Working…" : "Deactivate user"}
          </Button>
        )}
      </Section>

      <AuditHistory tableName="users" recordId={user.id} />
    </main>
  );
}
