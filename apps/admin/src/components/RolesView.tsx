"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrganizationSummary, PermissionSummary, RoleDetail } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { Field, FormGrid, Notice, Section, inputStyle } from "./form";

const GROUP_LABELS: Record<string, string> = {
  projects: "Projects",
  org: "Organisation",
  partners: "Stakeholders",
  qa: "Quality assurance",
  evidence: "Quality assurance",
  products: "Quality assurance",
  supplier: "Supplier marketplace",
  manufacturer: "Manufacturer marketplace",
  funder: "Funder",
  insights: "Insights",
  crm: "CRM",
};

const APP_SCOPES = [
  { value: "*", label: "All apps" },
  { value: "project-management", label: "Project Management" },
  { value: "product-database", label: "Product Database" },
  { value: "insights", label: "Insights" },
  { value: "crm", label: "CRM" },
];

function groupOf(key: string): string {
  return GROUP_LABELS[key.split(".")[0]] ?? "Other";
}

export function RolesView({ lockedOrgId }: { lockedOrgId?: string }) {
  const embedded = !!lockedOrgId;
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";

  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [orgId, setOrgId] = useState(lockedOrgId ?? "");
  const [permissions, setPermissions] = useState<PermissionSummary[]>([]);
  const [roles, setRoles] = useState<RoleDetail[] | null>(null);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // editor state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appScope, setAppScope] = useState("*");
  const [keys, setKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    if (lockedOrgId) setOrgId(lockedOrgId);
    else if (isPlatform) apiClient.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
    else setOrgId(me.organizationId);
    apiClient.listPermissions().then(setPermissions).catch((e) => setError(e instanceof Error ? e.message : "Failed to load permissions"));
  }, [me, isPlatform, lockedOrgId]);

  function loadRoles(id: string) {
    setRoles(null);
    apiClient
      .listRoles(id)
      .then(setRoles)
      .catch((e) => {
        setRoles([]);
        setError(e instanceof Error ? e.message : "Failed to load roles");
      });
  }
  useEffect(() => {
    setSelected(null);
    setError(null);
    if (orgId) loadRoles(orgId);
  }, [orgId]);

  const current = roles?.find((r) => r.id === selected) ?? null;
  useEffect(() => {
    setNotice(null);
    if (selected === "new") {
      setName("");
      setDescription("");
      setAppScope("*");
      setKeys([]);
    } else if (current) {
      setName(current.name);
      setDescription(current.description ?? "");
      setKeys(current.permissionKeys);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, roles]);

  const grouped = useMemo(() => {
    const m = new Map<string, PermissionSummary[]>();
    for (const p of permissions) {
      const g = groupOf(p.key);
      m.set(g, [...(m.get(g) ?? []), p]);
    }
    return Array.from(m.entries());
  }, [permissions]);

  const canGrant = (key: string) => isPlatform || !!me?.permissions.includes(key) || keys.includes(key);
  const dirty =
    selected === "new"
      ? name.trim().length >= 2
      : !!current && (name.trim() !== current.name || description !== (current.description ?? "") || [...keys].sort().join() !== current.permissionKeys.join());

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (selected === "new") {
        const created = await apiClient.createRole({
          organizationId: orgId,
          name: name.trim(),
          description: description.trim() || undefined,
          appScope,
          permissionKeys: keys,
        });
        const fresh = await apiClient.listRoles(orgId);
        setRoles(fresh);
        setSelected(created.id);
        setNotice("Role created.");
      } else if (current) {
        await apiClient.updateRole(current.id, {
          name: name.trim(),
          description: description.trim() === "" ? null : description.trim(),
          permissionKeys: keys,
        });
        setRoles(await apiClient.listRoles(orgId));
        setNotice("Role saved. Permission changes apply to users on their next request.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save role");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!current || !confirm(`Delete the role "${current.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.deleteRole(current.id);
      setSelected(null);
      setRoles(await apiClient.listRoles(orgId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: embedded ? 0 : 32, maxWidth: 1000 }}>
      {!embedded && <h1>Roles &amp; permissions</h1>}
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 680 }}>
        Roles decide what users can do. Assign them to users from the user&apos;s page. You can only grant permissions you hold
        yourself, and an organisation must always keep at least one role holding &ldquo;manage roles&rdquo; with a user assigned.
      </p>

      {isPlatform && !embedded && (
        <div style={{ maxWidth: 320, margin: "12px 0" }}>
          <Select value={orgId} onChange={setOrgId} allLabel="Choose an organisation…" options={orgs.map((o) => ({ value: o.id, label: o.name }))} ariaLabel="Organisation" />
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {!orgId && isPlatform && <p style={{ color: "var(--u-ink-secondary)" }}>Choose an organisation to see its roles.</p>}

      {orgId && roles === null && <p>Loading…</p>}
      {orgId && roles && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: 24, alignItems: "start" }} className="u-form-grid">
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${selected === r.id ? "var(--u-brand-violet)" : "var(--u-border)"}`,
                    background: selected === r.id ? "var(--u-accent-magenta-tint)" : "var(--u-surface)",
                    color: "var(--u-ink)",
                    font: "inherit",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
                    {r.permissionKeys.length} permissions · {r.userCount} user{r.userCount === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
              {roles.length === 0 && <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>No roles yet.</p>}
            </div>
            <div style={{ marginTop: 12 }}>
              <Button variant="secondary" onClick={() => setSelected("new")}>
                + New role
              </Button>
            </div>
          </div>

          <div>
            {selected === null && <p style={{ color: "var(--u-ink-secondary)" }}>Select a role to view or edit it.</p>}
            {selected !== null && (
              <Section title={selected === "new" ? "New role" : current?.name ?? "Role"}>
                <FormGrid>
                  <Field label="Name">
                    <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label="App scope" hint={selected === "new" ? undefined : "Fixed once a role is created."}>
                    <div style={{ marginTop: 4, opacity: selected === "new" ? 1 : 0.6, pointerEvents: selected === "new" ? "auto" : "none" }}>
                      <Select value={selected === "new" ? appScope : current?.appScope ?? "*"} onChange={setAppScope} options={APP_SCOPES} ariaLabel="App scope" />
                    </div>
                  </Field>
                </FormGrid>
                <div style={{ marginTop: 16 }}>
                  <Field label="Description">
                    <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </Field>
                </div>

                <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>Permissions</h3>
                {grouped.map(([group, perms]) => (
                  <div key={group} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--u-ink-secondary)", marginBottom: 6 }}>{group}</div>
                    {perms.map((p) => {
                      const allowed = canGrant(p.key);
                      return (
                        <label key={p.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", opacity: allowed ? 1 : 0.5 }}>
                          <input
                            type="checkbox"
                            disabled={!allowed}
                            checked={keys.includes(p.key)}
                            onChange={() => setKeys((prev) => (prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]))}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ fontSize: 13 }}>
                            <code style={{ fontFamily: "var(--u-font-mono)", fontSize: 12 }}>{p.key}</code>
                            <span style={{ display: "block", color: "var(--u-ink-secondary)", fontSize: 12 }}>{p.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}

                {notice && <Notice tone="success">{notice}</Notice>}
                <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                  <Button variant="primary" disabled={!dirty || busy} onClick={save}>
                    {busy ? "Saving…" : selected === "new" ? "Create role" : "Save role"}
                  </Button>
                  {current && (
                    <Button variant="danger" disabled={busy || current.userCount > 0} onClick={remove} title={current.userCount > 0 ? "Reassign this role's users first" : undefined}>
                      Delete role
                    </Button>
                  )}
                  {current && current.userCount > 0 && <Pill>{current.userCount} assigned</Pill>}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
