"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ORGANIZATION_TYPE_VALUES, orgTypesOf } from "@universe/types";
import type { OrganizationDetail, OrganizationTypeValue, UpdateOrganizationInput } from "@universe/types";
import { Button, CountrySelect, Select } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { useCountries } from "../../../lib/useCountries";
import { AuditHistory } from "../../../components/AuditHistory";
import { ColourField, LogoField, isValidHex } from "../../../components/BrandingFields";
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
import { ManufacturerProfileSection } from "../../../components/ManufacturerProfileSection";
import { ScopeCertificationsSection } from "../../../components/ScopeCertificationsSection";
import { DirectoryProfileSection } from "../../../components/DirectoryProfileSection";
import { UsersView } from "../../../components/UsersView";
import { RolesView } from "../../../components/RolesView";
import { ActivityView } from "../../../components/ActivityView";
import { CategoryProfileSection, ConsentSection, ContributorVisibilitySection, CountryPresenceSection, DemoAccessSection, ManufacturerSitesSection } from "../../../components/OrgSections";

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
  welcomeMessage: string;
  notes: string;
  additionalTypes: string[];
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
    welcomeMessage: o.welcomeMessage ?? "",
    notes: o.notes ?? "",
    additionalTypes: [...(o.additionalTypes ?? [])].sort(),
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
  "welcomeMessage",
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
  if (form.additionalTypes.join(",") !== base.additionalTypes.join(",")) patch.additionalTypes = form.additionalTypes;
  if (isPlatform) {
    for (const key of ["name", "slug", "status"] as const) {
      if (form[key] !== base[key]) patch[key] = form[key];
    }
  } else {
    delete patch.onboardingSource;
  }
  return patch as UpdateOrganizationInput;
}

const holdsAny = (o: OrganizationDetail, types: string[]) => orgTypesOf(o).some((t) => types.includes(t));

type OrgTab = "profile" | "users" | "roles" | "activity";
const TABS: { key: OrgTab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "activity", label: "Activity" },
];

export function OrganizationDetailView() {
  const params = useSearchParams();
  const id = params?.get("id") ?? "";
  const [tab, setTabState] = useState<OrgTab>(() => (TABS.some((t) => t.key === params?.get("tab")) ? (params?.get("tab") as OrgTab) : "profile"));
  const setTab = (t: OrgTab) => {
    setTabState(t);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", t);
      window.history.replaceState(null, "", u.toString());
    } catch {
      /* the tab still switches; only the shareable URL is lost */
    }
  };
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

  if (!id) return <div style={{ padding: 32 }}><p>No organisation selected. <Link href="/organizations">Back to organisations</Link></p></div>;
  if (error && !org) return <div style={{ padding: 32 }}><Notice tone="error">{error}</Notice><Link href="/organizations">Back to organisations</Link></div>;
  if (!org || !form) return <div style={{ padding: 32 }}>Loading…</div>;

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
    <div style={{ padding: "clamp(14px, 4vw, 32px)", maxWidth: tab === "profile" ? 960 : 1100 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href="/organizations">← Organisations</Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>{org.name}</h1>
        <StatusChip status={org.status} />
        <span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{orgTypesOf(org).map((t) => ORG_TYPE_LABELS[t] ?? t).join(" · ")}</span>
      </div>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: "6px 0 0" }}>
        {org.activeUserCount} active of {org.userCount} users ·{" "}
        <a href={`?id=${org.id}&tab=users`} onClick={(e) => { e.preventDefault(); setTab("users"); }}>Manage users</a> · created {new Date(org.createdAt).toLocaleDateString()}
      </p>

      <div
        role="tablist"
        aria-label="Organisation"
        style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "1px solid var(--u-border)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                whiteSpace: "nowrap",
                color: active ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-ink-secondary)",
                borderBottom: active ? "2px solid var(--u-org-accent, var(--u-brand-violet))" : "2px solid transparent",
                marginBottom: -1,
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "users" && <div style={{ marginTop: 16 }}><UsersView lockedOrgId={org.id} /></div>}
      {tab === "roles" && <div style={{ marginTop: 16 }}><RolesView lockedOrgId={org.id} /></div>}
      {tab === "activity" && <div style={{ marginTop: 16 }}><ActivityView lockedOrgId={org.id} /></div>}

      {tab === "profile" && (
      <>
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
            <input style={inputStyle} value={form.website} placeholder="https://" aria-label="https://" onChange={(e) => set({ website: e.target.value })} />
          </Field>
        </FormGrid>

        <h3 style={{ fontSize: 14, margin: "20px 0 8px" }}>Roles on the platform</h3>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Main role: <strong>{ORG_TYPE_LABELS[org.type] ?? org.type}</strong>. Tick any other role this organisation also holds (for example a supplier that is also a procurement agent) so it is found, matched and eligible for opportunities in every role.
        </p>
        <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
          <legend style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Also acts as</legend>
          {ORGANIZATION_TYPE_VALUES.filter((t) => t !== org.type).map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.additionalTypes.includes(t)}
                onChange={(e) => set({ additionalTypes: (e.target.checked ? [...form.additionalTypes, t] : form.additionalTypes.filter((x) => x !== t)).sort() as OrganizationTypeValue[] })}
              />
              {ORG_TYPE_LABELS[t] ?? t}
            </label>
          ))}
        </fieldset>

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
        <LogoField
          organizationId={org.id}
          logoUrl={org.logoUrl}
          onChanged={(logoUrl) => {
            setOrg({ ...org, logoUrl });
            setForm({ ...form, logoUrl: logoUrl ?? "" });
          }}
        />
        <div style={{ height: 12 }} />
        <LogoField
          variant="icon"
          organizationId={org.id}
          logoUrl={org.logoIconUrl}
          onChanged={(logoIconUrl) => setOrg({ ...org, logoIconUrl })}
        />
        <div style={{ height: 12 }} />
        <FormGrid>
          <ColourField label="Primary colour" hint="Buttons, active navigation and key accents. Text on top of it is chosen automatically." value={form.primaryColor} placeholder="#4A2E8C" onChange={(v) => set({ primaryColor: v })} />
          <ColourField label="Secondary colour" hint="Secondary accents." value={form.secondaryColor} placeholder="#B23A82" onChange={(v) => set({ secondaryColor: v })} />
        </FormGrid>
        <div style={{ marginTop: 12 }}>
          <Field label="Welcome line" hint={`Shown under the greeting on the dashboard. ${form.welcomeMessage.length}/200`}>
            <input style={inputStyle} maxLength={200} value={form.welcomeMessage} placeholder="Here's what's happening across your projects." aria-label="Here's what's happening across your projects." onChange={(e) => set({ welcomeMessage: e.target.value })} />
          </Field>
        </div>
        <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "10px 0 0" }}>
          Help contact: shown to your users as "Need help?" — the primary contact above if set, otherwise your organisation's active administrators.
        </p>

        <div style={{ marginTop: 20 }}>
          <Field label="Internal notes">
            <textarea rows={3} style={inputStyle} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {saved && !dirty && <Notice tone="success">Saved.</Notice>}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button variant="primary" disabled={!dirty || saving || !isValidHex(form.primaryColor) || !isValidHex(form.secondaryColor)} onClick={save}>
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

      {holdsAny(org, ["SUPPLIER", "MANUFACTURER", "PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY"]) && <DirectoryProfileSection organizationId={org.id} />}
      <CountryPresenceSection organizationId={org.id} />
      {holdsAny(org, ["SUPPLIER", "MANUFACTURER", "PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY"]) && <ScopeCertificationsSection organizationId={org.id} />}
      <DemoAccessSection organizationId={org.id} />
      <CategoryProfileSection org={org} />
      {orgTypesOf(org).includes("MANUFACTURER") && <ManufacturerProfileSection organizationId={org.id} />}
      {orgTypesOf(org).includes("MANUFACTURER") && <ManufacturerSitesSection organizationId={org.id} />}
      <ContributorVisibilitySection org={org} onChanged={(o) => setOrg({ ...org, ...o })} />
      <ConsentSection organizationId={org.id} />
      <AuditHistory tableName="organizations" recordId={org.id} />
      </>
      )}
    </div>
  );
}
