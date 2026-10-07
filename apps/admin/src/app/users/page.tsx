"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RoleSummary, UserSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";

const STATUS_COLORS: Record<string, string> = {
  INVITED: "#B45309",
  ACTIVE: "#059669",
  DEACTIVATED: "#6B7280",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"));
  }, []);

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this user? They'll lose access immediately.")) return;
    try {
      const updated = await apiClient.deactivateUser(id);
      setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Users</h1>
        <Link href="/users/invite">+ Invite a User</Link>
      </div>

      {error && <p style={{ color: "#B91C1C" }}>{error}</p>}
      {!users && !error && <p>Loading…</p>}

      {users && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #E5E7EB" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Organisation</th>
              <th style={{ padding: 8 }}>Role(s)</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Invited</th>
              <th style={{ padding: 8 }}>First Sign-In</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <>
                <tr key={u.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: 8 }}>
                    {u.forename} {u.surname}
                  </td>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>{u.organizationName}</td>
                  <td style={{ padding: 8 }}>{u.roleNames.join(", ") || "—"}</td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        color: "#fff",
                        background: STATUS_COLORS[u.status] ?? "#6B7280",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>{new Date(u.invitedAt).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>
                    {u.firstSignInAt ? new Date(u.firstSignInAt).toLocaleDateString() : "Never signed in"}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)}
                      style={{ marginRight: 10 }}
                    >
                      {editingUserId === u.id ? "Close" : "Edit roles"}
                    </button>
                    {u.status !== "DEACTIVATED" && (
                      <button onClick={() => handleDeactivate(u.id)} style={{ color: "#B91C1C" }}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
                {editingUserId === u.id && (
                  <tr key={`${u.id}-edit`} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td colSpan={8} style={{ padding: "4px 8px 16px" }}>
                      <RoleEditor
                        user={u}
                        onSaved={(updated) => {
                          setUsers((prev) => prev?.map((row) => (row.id === updated.id ? updated : row)) ?? null);
                          setEditingUserId(null);
                        }}
                        onCancel={() => setEditingUserId(null)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

/**
 * Edit-roles panel — added 2026-10-08 so an org admin can grant an
 * EXISTING user a role (e.g. the new "Quality Assurance"/"Responsible
 * Person" roles from the QA/procurement segregation-of-duties work)
 * without deactivating and re-inviting them, which the invite flow can't
 * do for an email already in the system. Reuses the same
 * listOrganizationRoles endpoint the invite form uses.
 */
function RoleEditor({
  user,
  onSaved,
  onCancel,
}: {
  user: UserSummary;
  onSaved: (updated: UserSummary) => void;
  onCancel: () => void;
}) {
  const [roles, setRoles] = useState<RoleSummary[] | null>(null);
  const [selected, setSelected] = useState<string[]>(user.roleIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listOrganizationRoles(user.organizationId)
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roles"));
  }, [user.organizationId]);

  function toggle(roleId: string) {
    setSelected((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateUserRoles(user.id, selected);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update roles");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 16,
        background: "#FAFAFA",
        maxWidth: 480,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Roles for {user.forename} {user.surname}
      </div>
      {!roles && !error && <p style={{ fontSize: 13 }}>Loading roles…</p>}
      {error && <p style={{ color: "#B91C1C", fontSize: 13 }}>{error}</p>}
      {roles && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {roles.map((r) => (
            <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !roles}>
          {saving ? "Saving…" : "Save roles"}
        </button>
        <button onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
