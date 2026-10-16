"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrganizationDetail, UpdateOrganizationInput } from "@universe/types";
import { Button, CountrySelect, Select } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { useCountries } from "../../../lib/useCountries";
import { AuditHistory } from "../../../components/AuditHistory";
import {
  Field,
  FormGrid,
  LEGAL_ENTITY_LABELS,
  Notice,
  ONBOARDING_SOURCE_LABELS,
  ORG_TYPE_LABELS,
  Section,
  StatusChip,
  inputStyle,
} from "../../../components/form";
import { CategoryProfileSection, ConsentSection, CountryPresenceSection, ManufacturerSitesSection } from "../../../components/OrgSections";

type FormState = {
  name: string;
  slug: string;
  status: "PILOT" | "ACTIVE" | "SUSPENDED";
  onboardingSource: string;
  legalName: string;
  legalEntityType: string;
  countryOfRegistrationCode: string;
  registrationNumber: string;
  website: string;
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  notes: string;
};

function toForm(o: OrganizationDetail): FormState {
  return {
    name: o.name,
    slug: o.slug,
    status: o.status,
    onboardingSource: o.onboardingSource ?? "",
    legalName: o.legalName ?? "",
    legalEntityType: o.legalEntityType ?? "",
    countryOfRegistrationCode: o.countryOfRegistrationCode ?? "",
    registrationNumber: o.registrationNumber ?? "",
    website: o.website ?? "",
    primaryContactName: o.primaryContactName ?? "",
    primaryContactTitle: o.primaryContactTitle ?? "",
    primaryContactEmail: o.primaryContactEmail ?? "",
    primaryContactPhone: o.primaryContactPhone ?? "",
    logoUrl: o.logoUrl ?? "",
    primaryColor: o.primaryColor ?? "",
    secondaryColor: o.secondaryColor ?? "",
    notes: o.notes ?? "",
  };
}

const NULLABLE_TEXT = [
  "legalName",
  "registrationNumber",
  "website",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactEmail",
  "primaryContactPhone",
  "logoUrl",
  "primaryColor",
  "secondaryColor",
  "notes",
  "legalEntityType",
  "countryOfRegistrationCode",
  "onboardingSource",
] as const;

/** Builds a PATCH body of only the fields that differ from the loaded record
 * (empty string → null = clear). */
function buildPatch(original: OrganizationDetail, form: FormState, isPlatform: boolean): UpdateOrganizationInput {
  const base = toForm(original);
  const patch: Record<string, unknown> = {};
  for (const key of NULLABLE_TEXT) {
    if (form[key] !== base[key]) patch[key] = form[key] === "" ? null : form[key];
  }
  if (isPlatform) {
    for (const key of ["name", "slug", "status"] as const) {
      if (form[key] !== base[key]) patch[key] = form[key];
    }
  } else {
    delete patch.onboardingSource;
  }
  return patch as UpdateOrganizationInput;
}

export function OrganizationDetailView() {
  const id = useSearchParams()?.get("id") ?? "";
  const me = useCurrentUser();
  const countries = useCountries();
  const isPlatform = !!me && me.platformStaffRole !== "NONE";
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getOrganization(id)
      .then((o) => {
        setOrg(o);
        setForm(toForm(o));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load organisation"));
  }, [id]);

  if (!id) return <main style={{ padding: 32 }}><p>No organisation selected. <Link href="/organizations">Back to organisations</Link></p></main>;
  if (error && !org) return <main style={{ padding: 32 }}><Notice tone="error">{error}</Notice><Link href="/organizations">Back to organisations</Link></main>;
  if (!org || !form) return <main style={{ padding: 32 }}>Loading…</main>;

  const patch = buildPatch(org, form, isPlatform);
  const dirty = Object.keys(patch).length > 0;
  const set = (p: Partial<FormState>) => {
    setForm({ ...form, ...p });
    setSaved(false);
  };

  async function save() {
    if (!org) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateOrganization(org.id, patch);
      setOrg(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const readOnlyIdentity = !isPlatform;

  return (
    <main style={{ padding: 32, maxWidth: 960 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href="/organizations">← Organisations</Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>{org.name}</h1>
        <StatusChip status={org.status} />
        <span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
      </div>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "6px 0 0" }}>
        {org.activeUserCount} active of {org.userCount} users ·{" "}
        <Link href={`/users?organizationId=${org.id}`}>Manage users</Link> · created {new Date(org.createdAt).toLocaleDateString()}
      </p>

      <Section
        title="Organisation details"
        hint={isPlatform ? undefined : "Name, URL slug and lifecycle status are managed by Universe platform staff."}
      >
        <FormGrid>
          <Field label="Display name">
            <input style={inputStyle} value={form.name} disabled={readOnlyIdentity} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Slug" hint="Lowercase letters, numbers and hyphens.">
            <input style={inputStyle} value={form.slug} disabled={readOnlyIdentity} onChange={(e) => set({ slug: e.target.value })} />
          </Field>
          <Field label="Status">
            <div style={{ marginTop: 4 }}>
              {isPlatform ? (
                <Select
                  value={form.status}
                  onChange={(v) => set({ status: v as FormState["status"] })}
                  options={[
                    { value: "PILOT", label: "Pilot" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "SUSPENDED", label: "Suspended" },
                  ]}
                  ariaLabel="Status"
                />
              ) : (
                <StatusChip status={org.status} />
              )}
            </div>
          </Field>
          <Field label="Onboarding source">
            <div style={{ marginTop: 4 }}>
              {isPlatform ? (
                <Select
                  value={form.onboardingSource}
                  onChange={(v) => set({ onboardingSource: v })}
                  allLabel="Not set"
                  options={Object.entries(ONBOARDING_SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
                  ariaLabel="Onboarding source"
                />
              ) : (
                <span style={{ fontSize: 13 }}>{org.onboardingSource ? ONBOARDING_SOURCE_LABELS[org.onboardingSource] : "—"}</span>
              )}
            </div>
          </Field>
          <Field label="Legal name">
            <input style={inputStyle} value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} />
          </Field>
          <Field label="Legal entity type">
            <div style={{ marginTop: 4 }}>
              <Select
                value={form.legalEntityType}
                onChange={(v) => set({ legalEntityType: v })}
                allLabel="Not set"
                options={Object.entries(LEGAL_ENTITY_LABELS).map(([value, label]) => ({ value, label }))}
                ariaLabel="Legal entity type"
              />
            </div>
          </Field>
          <Field label="Country of registration">
            <div style={{ marginTop: 4 }}>
              <CountrySelect value={form.countryOfRegistrationCode} onChange={(c) => set({ countryOfRegistrationCode: c })} options={countries} ariaLabel="Country of registration" />
            </div>
          </Field>
          <Field label="Registration number">
            <input style={inputStyle} value={form.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} />
          </Field>
          <Field label="Website">
            <input style={inputStyle} value={form.website} placeholder="https://" onChange={(e) => set({ website: e.target.value })} />
          </Field>
        </FormGrid>

        <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>Primary contact</h3>
        <FormGrid>
          <Field label="Name">
            <input style={inputStyle} value={form.primaryContactName} onChange={(e) => set({ primaryContactName: e.target.value })} />
          </Field>
          <Field label="Title">
            <input style={inputStyle} value={form.primaryContactTitle} onChange={(e) => set({ primaryContactTitle: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" style={inputStyle} value={form.primaryContactEmail} onChange={(e) => set({ primaryContactEmail: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} value={form.primaryContactPhone} onChange={(e) => set({ primaryContactPhone: e.target.value })} />
          </Field>
        </FormGrid>

        <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>Branding</h3>
        <FormGrid>
          <Field label="Logo URL">
            <input style={inputStyle} value={form.logoUrl} placeholder="https://" onChange={(e) => set({ logoUrl: e.target.value })} />
          </Field>
          <div />
          <Field label="Primary colour" hint="#RRGGBB — used for the organisation's subtle accent.">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={inputStyle} value={form.primaryColor} placeholder="#1B203D" onChange={(e) => set({ primaryColor: e.target.value })} />
              <span style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--u-border)", background: /^#[0-9A-Fa-f]{6}$/.test(form.primaryColor) ? form.primaryColor : "transparent", flexShrink: 0, marginTop: 4 }} />
            </div>
          </Field>
          <Field label="Secondary colour">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={inputStyle} value={form.secondaryColor} placeholder="#2EB0BD" onChange={(e) => set({ secondaryColor: e.target.value })} />
              <span style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--u-border)", background: /^#[0-9A-Fa-f]{6}$/.test(form.secondaryColor) ? form.secondaryColor : "transparent", flexShrink: 0, marginTop: 4 }} />
            </div>
          </Field>
        </FormGrid>

        <div style={{ marginTop: 20 }}>
          <Field label="Internal notes">
            <textarea rows={3} style={inputStyle} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {saved && !dirty && <Notice tone="success">Saved.</Notice>}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button variant="primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            variant="ghost"
            disabled={!dirty || saving}
            onClick={() => {
              setForm(toForm(org));
              setError(null);
            }}
          >
            Discard
          </Button>
        </div>
      </Section>

      <CountryPresenceSection organizationId={org.id} />
      <CategoryProfileSection org={org} />
      {org.type === "MANUFACTURER" && <ManufacturerSitesSection organizationId={org.id} />}
      <ConsentSection organizationId={org.id} />
      <AuditHistory tableName="organizations" recordId={org.id} />
    </main>
  );
}
