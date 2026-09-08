"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";

const STATUS_COLORS: Record<string, string> = {
  INVITED: "#B45309",
  ACTIVE: "#059669",
  DEACTIVATED: "#6B7280",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              <th style={{ padding: 8 }}>Organization</th>
              <th style={{ padding: 8 }}>Role(s)</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Invited</th>
              <th style={{ padding: 8 }}>First Sign-In</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
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
                <td style={{ padding: 8 }}>
                  {u.status !== "DEACTIVATED" && (
                    <button onClick={() => handleDeactivate(u.id)} style={{ color: "#B91C1C" }}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
