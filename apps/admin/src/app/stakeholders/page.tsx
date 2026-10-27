"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { StakeholderAccessOverview } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Field, FormGrid, Notice, Section, StatusChip, inputStyle } from "../../components/form";

/**
 * Stakeholder access (2026-10-17). Platform staff give a prospective
 * organisation's person access to the demo organisation, by the email they
 * supply, and can switch it off again. Switching off archives the account
 * (never deletes it) and is logged; "Reinstate" brings it back.
 */
export default function StakeholdersPage() {
  const me = useCurrentUser();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const [data, setData] = useState<StakeholderAccessOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", forename: "", surname: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    try {
      setData(await apiClient.getStakeholderAccess());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load stakeholder access");
    }
  }

  useEffect(() => {
    if (isPlatform) void reload();
  }, [isPlatform]);

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await reload();
      setNotice(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  async function grant(e: FormEvent) {
    e.preventDefault();
    await act(
      "grant",
      async () => {
        await apiClient.grantStakeholderAccess({ email: form.email.trim(), forename: form.forename.trim(), surname: form.surname.trim() });
        setForm({ email: "", forename: "", surname: "" });
      },
      "Access granted. They can sign in with that email.",
    );
  }

  if (me && !isPlatform) {
    return <div style={{ padding: 32 }}>Stakeholder access is managed by Universe platform staff.</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Stakeholder access</h1>
      <p style={{ color: "var(--u-ink-secondary)" }}>
        Give a prospective organisation a place to explore the whole platform. They sign in with the email you add here and see only{" "}
        <strong>{data?.organizationName ?? "the demo organisation"}</strong> — its demo data, plus the shared catalogue and anonymised views. They can
        try every workflow, but nothing they do can change data shared with real organisations. Turning access off archives the account; nothing is deleted.
      </p>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      <Section defaultOpen title="Add a stakeholder">
        <form onSubmit={grant}>
          <FormGrid>
            <Field label="Email">
              <input type="email" required style={inputStyle} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="First name">
              <input required style={inputStyle} value={form.forename} onChange={(e) => setForm((f) => ({ ...f, forename: e.target.value }))} />
            </Field>
            <Field label="Last name">
              <input required style={inputStyle} value={form.surname} onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))} />
            </Field>
          </FormGrid>
          <div style={{ marginTop: 12 }}>
            <Button type="submit" variant="primary" disabled={busy !== null}>
              {busy === "grant" ? "Adding…" : "Grant access"}
            </Button>
          </div>
        </form>
      </Section>

      <Section defaultOpen title="Stakeholders">
        {!data ? (
          <p style={{ color: "var(--u-ink-secondary)" }}>{loadError ? "" : "Loading…"}</p>
        ) : data.users.length === 0 ? (
          <p style={{ color: "var(--u-ink-secondary)" }}>No stakeholders yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--u-ink-secondary)" }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Last sign-in</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                  <td style={{ padding: 8 }}>
                    <Link href={`/users/detail?id=${u.id}`}>{u.forename} {u.surname}</Link>
                  </td>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}><StatusChip status={u.status} /></td>
                  <td style={{ padding: 8 }}>{u.firstSignInAt ? new Date(u.firstSignInAt).toLocaleDateString() : "Not yet"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {u.status === "DEACTIVATED" ? (
                      <Button variant="secondary" disabled={busy !== null} onClick={() => act(`r-${u.id}`, () => apiClient.reactivateUser(u.id), "Access reinstated.")}>
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        disabled={busy !== null}
                        onClick={() => {
                          const reason = window.prompt("Turn off this stakeholder's access? The account is archived (kept, with a log entry). Optional reason:", "Stakeholder demo access ended");
                          if (reason === null) return;
                          void act(`d-${u.id}`, () => apiClient.deactivateUser(u.id, reason), "Access turned off — the account is archived.");
                        }}
                      >
                        Turn off access
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
