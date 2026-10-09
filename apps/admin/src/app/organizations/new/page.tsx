"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreateOrganizationInput } from "@universe/types";
import { CountrySelect } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { useCountries } from "../../../lib/useCountries";

/** Mirrors CreateOrganizationDto's slug rule (apps/api/src/organizations/dto/create-organization.dto.ts)
 * so a bad slug is caught client-side before the round trip, not just server-side. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Platform-staff-only — see organizations/page.tsx's header comment for why
 * there's no self-service org creation. This is genuinely the first real UI
 * for provisioning a tenant (previously a one-off Prisma Studio script per
 * backend-launch-checklist.md Phase A); it calls the same
 * createOrganizationWithDefaultRoles() the API's OrganizationsService has
 * always used, so there's still exactly one definition of "what a new org
 * gets" — this just gives it a front door.
 */
export default function NewOrganizationPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const countries = useCountries();
  const [form, setForm] = useState<CreateOrganizationInput>({
    name: "",
    slug: "",
    type: "PROCUREMENT_SERVICE_AGENT",
    confirmedAgreementOnFile: false,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";

  function updateName(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      // Keep auto-deriving the slug from the name until the person edits the
      // slug field directly — same "smart default, easy to override"
      // pattern as most admin tools use for URL slugs.
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  }

  function updateSlug(slug: string) {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug }));
  }

  const slugValid = form.slug.length > 0 && SLUG_PATTERN.test(form.slug);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slugValid) {
      setError("Slug must be lowercase letters, numbers, and hyphens only.");
      return;
    }
    if (!form.confirmedAgreementOnFile) {
      setError("Confirm the signed agreement is on file before provisioning this organisation.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.createOrganization(form);
      router.push("/organizations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organisation");
    } finally {
      setSubmitting(false);
    }
  }

  if (me && !isPlatformStaff) {
    return (
      <main style={{ padding: 32, maxWidth: 560 }}>
        <h1>Create Organisation</h1>
        <p style={{ color: "var(--u-status-critical)" }}>
          Onboarding a new organisation is platform-staff only during the pilot — your account
          doesn&apos;t have that role. This would also be rejected server-side if submitted.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 560 }}>
      <h1>Create Organisation</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>
        Provisions a new tenant. There is no default/&quot;house&quot; organisation on Universe —
        every tenant, including the very first pilot, is created this same way.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: 6, padding: 12 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, padding: "0 4px" }}>Organisation Type</legend>
          {/* Expanded 2026-09-26 from the original Buyer/Supplier pair — see
              claude/stakeholder-taxonomy-research.md in the Claude project.
              Six real-world categories, five distinct role templates (the
              first two below share one). */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "PROCUREMENT_SERVICE_AGENT"}
              onChange={() => setForm((prev) => ({ ...prev, type: "PROCUREMENT_SERVICE_AGENT" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Procurement Service Agent</strong> — runs projects/tenders on behalf of a
              client (e.g. Unimed). The default role template (Organisation Admin, Project
              Manager, Read Only).
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "TENDERING_PURCHASING_BODY"}
              onChange={() => setForm((prev) => ({ ...prev, type: "TENDERING_PURCHASING_BODY" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Tendering &amp; Purchasing Body</strong> — a government, faith-based
              organisation, or funded implementing partner that issues and manages its own
              tenders directly. Same role template as Procurement Service Agent; deliberately
              has no visibility into any other organisation&apos;s projects.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "MANUFACTURER"}
              onChange={() => setForm((prev) => ({ ...prev, type: "MANUFACTURER" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Manufacturer</strong> — gets the Manufacturer Admin role. Manages a public
              profile and product catalogue, searchable and selectable by every buyer organisation
              on the platform once published.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "SUPPLIER"}
              onChange={() => setForm((prev) => ({ ...prev, type: "SUPPLIER" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Supplier / Distributor</strong> — gets the Supplier Admin role. Manages a
              public profile and product catalogue, same marketplace mechanics as Manufacturer.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "FUNDER_DONOR"}
              onChange={() => setForm((prev) => ({ ...prev, type: "FUNDER_DONOR" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Funder / Donor</strong> — a Global Fund/Gavi/foundation-style organisation
              that funds but doesn&apos;t run procurement itself. Read-only role template;
              grant-scoped visibility is not built yet, so this org type has no real project
              access today beyond managing its own users.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "DATA_INSIGHTS_USER"}
              onChange={() => setForm((prev) => ({ ...prev, type: "DATA_INSIGHTS_USER" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Data / Insights User</strong> — researchers, market-shaping bodies, and
              market-intelligence firms. Read-only, anonymised aggregate only — no project,
              CRM, or product-catalogue access of any kind.
            </span>
          </label>
        </fieldset>

        <label>
          Organisation Name
          <input
            required
            style={inputStyle}
            value={form.name}
            onChange={(e) => updateName(e.target.value)}
            placeholder="e.g. Acme Health Logistics"
          />
        </label>

        <label>
          Slug
          <input
            required
            style={inputStyle}
            value={form.slug}
            onChange={(e) => updateSlug(e.target.value)}
            placeholder="e.g. acme-health-logistics"
          />
          <span style={{ fontSize: 12, color: form.slug && !slugValid ? "var(--u-status-critical)" : "var(--u-ink-secondary)" }}>
            Lowercase letters, numbers, and hyphens only. Auto-filled from the name — edit it
            directly if you need something different.
          </span>
        </label>

        <label>
          Country of Registration
          <div style={{ marginTop: 4 }}>
            <CountrySelect
              value={form.countryOfRegistrationCode ?? ""}
              onChange={(code) => setForm((prev) => ({ ...prev, countryOfRegistrationCode: code || undefined }))}
              options={countries}
              ariaLabel="Country of registration"
            />
          </div>
        </label>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--u-ink)" }}>
          <input
            type="checkbox"
            checked={form.confirmedAgreementOnFile}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmedAgreementOnFile: e.target.checked }))}
            style={{ marginTop: 2 }}
          />
          <span>
            I confirm this organisation has signed Universe&apos;s Privacy Policy and Data Sharing
            Agreement. This is required before an organisation is provisioned.{" "}
            {form.type === "SUPPLIER" || form.type === "MANUFACTURER" ? (
              <>
                For a Supplier or Manufacturer organisation, this includes consent for their
                profile, product catalogue, and contact details to be identifiable and searchable by
                every buyer organisation on the platform once published — the opposite of the
                buyer-side anonymised aggregate, and the point of joining the marketplace.
              </>
            ) : (
              <>
                This includes consent for anonymised, aggregated pricing/specification data to feed
                the Insights app — Universe never stores or shares identifying data (organisation
                name, manufacturer, client) in that aggregate, only de-identified data grouped by
                product category.
              </>
            )}
          </span>
        </label>

        {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.name || !slugValid || !form.confirmedAgreementOnFile}
          style={{ padding: "10px 16px", alignSelf: "flex-start" }}
        >
          {submitting ? "Creating…" : "Create Organisation"}
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
  border: "1px solid var(--u-border)",
  borderRadius: 6,
};
