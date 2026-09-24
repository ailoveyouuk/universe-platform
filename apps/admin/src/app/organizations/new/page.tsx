"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser, CreateOrganizationInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";

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
  const [me, setMe] = useState<AuthenticatedUser | null>(null);
  const [form, setForm] = useState<CreateOrganizationInput>({
    name: "",
    slug: "",
    type: "BUYER",
    confirmedAgreementOnFile: false,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = me?.platformStaffRole !== "NONE";

  useEffect(() => {
    apiClient
      .me()
      .then(setMe)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your account"));
  }, []);

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
      setError("Confirm the signed agreement is on file before provisioning this organization.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.createOrganization(form);
      router.push("/organizations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  }

  if (me && !isPlatformStaff) {
    return (
      <main style={{ padding: 32, maxWidth: 560 }}>
        <h1>Create Organization</h1>
        <p style={{ color: "#B91C1C" }}>
          Onboarding a new organization is platform-staff only during the pilot — your account
          doesn&apos;t have that role. This would also be rejected server-side if submitted.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 560 }}>
      <h1>Create Organization</h1>
      <p style={{ color: "#6B7280", fontSize: 13 }}>
        Provisions a new tenant. There is no default/&quot;house&quot; organization on Universe —
        every tenant, including the very first pilot, is created this same way.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        <fieldset style={{ border: "1px solid #D1D5DB", borderRadius: 6, padding: 12 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, padding: "0 4px" }}>Organization Type</legend>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "BUYER"}
              onChange={() => setForm((prev) => ({ ...prev, type: "BUYER" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Buyer</strong> — the default role template (Organization Admin, Project
              Manager, Read Only). Runs projects, procures products.
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input
              type="radio"
              name="type"
              checked={form.type === "SUPPLIER"}
              onChange={() => setForm((prev) => ({ ...prev, type: "SUPPLIER" }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Supplier / Manufacturer</strong> — gets the Supplier Admin role instead.
              Manages a public profile and product catalog, searchable and selectable by every
              buyer organization on the platform once published.
            </span>
          </label>
        </fieldset>

        <label>
          Organization Name
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
          <span style={{ fontSize: 12, color: form.slug && !slugValid ? "#B91C1C" : "#9CA3AF" }}>
            Lowercase letters, numbers, and hyphens only. Auto-filled from the name — edit it
            directly if you need something different.
          </span>
        </label>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#374151" }}>
          <input
            type="checkbox"
            checked={form.confirmedAgreementOnFile}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmedAgreementOnFile: e.target.checked }))}
            style={{ marginTop: 2 }}
          />
          <span>
            I confirm this organization has signed Universe&apos;s Privacy Policy and Data Sharing
            Agreement. This is required before an organization is provisioned.{" "}
            {form.type === "SUPPLIER" ? (
              <>
                For a Supplier/Manufacturer organization, this includes consent for their profile,
                product catalog, and contact details to be identifiable and searchable by every
                buyer organization on the platform once published — the opposite of the buyer-side
                anonymized aggregate, and the point of joining the marketplace.
              </>
            ) : (
              <>
                This includes consent for anonymized, aggregated pricing/specification data to feed
                the Insights app — Universe never stores or shares identifying data (organization
                name, manufacturer, client) in that aggregate, only de-identified data grouped by
                product category.
              </>
            )}
          </span>
        </label>

        {error && <p style={{ color: "#B91C1C" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.name || !slugValid || !form.confirmedAgreementOnFile}
          style={{ padding: "10px 16px", alignSelf: "flex-start" }}
        >
          {submitting ? "Creating…" : "Create Organization"}
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
