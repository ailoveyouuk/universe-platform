"use client";

import { useState } from "react";
import type { ContactSummary, ProjectDetail, UserSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, Select } from "@universe/ui";

/**
 * Team & Contacts (added 2026-10-08) — leads (internal Users) and contacts
 * (external Partner contacts) attached to a project, addable/removable one
 * at a time via POST/DELETE /projects/:id/leads and /contacts, independent
 * of the full project PATCH. Previously these two join tables (ProjectLead/
 * ProjectContact) had no management surface at all.
 *
 * `users`/`contacts` are the full org-wide pickable lists, fetched once by
 * ProjectDetailView alongside its existing clients/manufacturers/suppliers
 * lists — same prop-drilling convention as LineForm/SupplierEnquiries.
 * There's no dedicated user/contact picker component anywhere in the app
 * to reuse (the project intake form doesn't assign leads/contacts at all
 * today), so this uses @universe/ui's own Select — the platform's one
 * custom dropdown, same control already used for "Change status" etc.
 * above on this page — rather than introducing a new picker pattern.
 */
export function ProjectTeam({
  project,
  users,
  contacts,
  onUpdated,
}: {
  project: ProjectDetail;
  users: UserSummary[];
  contacts: ContactSummary[];
  onUpdated: (project: ProjectDetail) => void;
}) {
  const [addingLeadId, setAddingLeadId] = useState<string>("");
  const [addingContactId, setAddingContactId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUsers = users.filter((u) => !project.leads.some((l) => l.userId === u.id));
  const availableContacts = contacts.filter((c) => !project.contacts.some((pc) => pc.contactId === c.id));

  async function addLead() {
    if (!addingLeadId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.addProjectLead(project.id, { userId: addingLeadId });
      onUpdated(updated);
      setAddingLeadId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setBusy(false);
    }
  }

  async function removeLead(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.removeProjectLead(project.id, userId);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove lead");
    } finally {
      setBusy(false);
    }
  }

  async function addContact() {
    if (!addingContactId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.addProjectContact(project.id, { contactId: addingContactId });
      onUpdated(updated);
      setAddingContactId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setBusy(false);
    }
  }

  async function removeContact(contactId: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.removeProjectContact(project.id, contactId);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove contact");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Team & Contacts</h2>

      {error && <p style={{ color: "var(--u-status-critical)", fontSize: 12, marginTop: 6 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 8 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink-secondary)", margin: "0 0 6px" }}>Project Leads</h3>
          {project.leads.length === 0 && <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "0 0 8px" }}>No leads assigned yet.</p>}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {project.leads.map((lead) => (
              <li key={lead.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>{lead.userName}</span>
                <button
                  type="button"
                  aria-label={`Remove ${lead.userName} as lead`}
                  disabled={busy}
                  onClick={() => removeLead(lead.userId)}
                  style={{ border: "none", background: "none", color: "var(--u-status-critical)", cursor: "pointer", fontSize: 13, padding: "0 4px" }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <Select
              value={addingLeadId}
              onChange={setAddingLeadId}
              options={availableUsers.map((u) => ({ value: u.id, label: `${u.forename} ${u.surname}` }))}
              allLabel="Add a lead…"
              ariaLabel="Add project lead"
            />
            <Button variant="secondary" size="sm" disabled={!addingLeadId || busy} onClick={addLead}>
              Add
            </Button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink-secondary)", margin: "0 0 6px" }}>Project Contacts</h3>
          {project.contacts.length === 0 && <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "0 0 8px" }}>No contacts added yet.</p>}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {project.contacts.map((contact) => (
              <li key={contact.contactId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>
                  {contact.contactName}
                  {contact.partnerName && <span style={{ color: "var(--u-ink-secondary)" }}> — {contact.partnerName}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${contact.contactName} as contact`}
                  disabled={busy}
                  onClick={() => removeContact(contact.contactId)}
                  style={{ border: "none", background: "none", color: "var(--u-status-critical)", cursor: "pointer", fontSize: 13, padding: "0 4px" }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <Select
              value={addingContactId}
              onChange={setAddingContactId}
              options={availableContacts.map((c) => ({ value: c.id, label: c.partnerName ? `${c.name} — ${c.partnerName}` : c.name }))}
              allLabel="Add a contact…"
              ariaLabel="Add project contact"
            />
            <Button variant="secondary" size="sm" disabled={!addingContactId || busy} onClick={addContact}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
