"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser, InviteUserInput, OrganizationSummary, RoleSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";

/**
 * Invite form. Whether the organization field is a picker or a locked
 * display depends on who's signed in: platform staff (Universe's own
 * operating team) can invite into ANY organization; an org admin inviting their
 * own colleagues only ever sees — and can only ever target — their own
 * organization. This is enforced again server-side (assertCanManageOrg),
 * this is just the UI reflecting that reality rather than offering a choice
 * that would be rejected anyway.
 */
export default function InviteUserPage() {
  const router = useRouter();
  const [me, setMe] = useState<AuthenticatedUser | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [form, setForm] = useState<Partial<InviteUserInput>>({ roleIds: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";

  useEffect(() => {
    apiClient
      .me()
      .then((user) => {
        setMe(user);
        // Org admins are locked to their own org — pre-select it immediately.
        if (user.platformStaffRole === "NONE") {
          setForm((prev) => ({ ...prev, organizationId: user.organizationId }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your account"));
    apiClient.listOrganizations().then(setOrganizations).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.organizationId) {
      setRoles([]);
      return;
    }
    apiClient
      .listOrganizationRoles(form.organizationId)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [form.organizationId]);

  function update<K extends keyof InviteUserInput>(key: K, value: InviteUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRole(roleId: string) {
    setForm((prev) => {
      const current = prev.roleIds ?? [];
      const next = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
      return { ...prev, roleIds: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.inviteUser(form as InviteUserInput);
      router.push("/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 560 }}>
      <h1>Invite a User</h1>
      <p style={{ color: "#6B7280", fontSize: 13 }}>
        This adds them to the allowed list with an organization and role. They gain access the
        first time they sign in via Microsoft on any Universe app with this exact email address —
        nothing happens on their side until then.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        <label>
          Email
          <input
            required
            type="email"
            style={inputStyle}
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </label>

        <label>
          Forename
          <input
            required
            style={inputStyle}
            value={form.forename ?? ""}
            onChange={(e) => update("forename", e.target.value)}
          />
        </label>

        <label>
          Surname
          <input
            required
            style={inputStyle}
            value={form.surname ?? ""}
            onChange={(e) => update("surname", e.target.value)}
          />
        </label>

        <label>
          Organization
          {isPlatformStaff ? (
            <select
              required
              style={inputStyle}
              value={form.organizationId ?? ""}
              onChange={(e) => update("organizationId", e.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              disabled
              style={{ ...inputStyle, background: "#F3F4F6" }}
              value={organizations.find((o) => o.id === form.organizationId)?.name ?? "Your organization"}
            />
          )}
        </label>

        <fieldset style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 16 }}>
          <legend style={{ fontWeight: 600 }}>Role(s)</legend>
          {roles.length === 0 && <p style={{ color: "#6B7280", fontSize: 13 }}>Select an organization first.</p>}
          {roles.map((r) => (
            <label key={r.id} style={{ display: "block", marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={form.roleIds?.includes(r.id) ?? false}
                onChange={() => toggleRole(r.id)}
              />{" "}
              {r.name} <span style={{ color: "#9CA3AF", fontSize: 12 }}>({r.appScope})</span>
            </label>
          ))}
        </fieldset>

        {error && <p style={{ color: "#B91C1C" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.roleIds?.length}
          style={{ padding: "10px 16px", alignSelf: "flex-start" }}
        >
          {submitting ? "Inviting…" : "Invite User"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid #D1D5DB",
  borderRadius: 6,
};
