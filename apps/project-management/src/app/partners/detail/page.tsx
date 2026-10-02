"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PartnerSummary, StakeholderRegistryDetail, StakeholderRegistryProduct } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { Pill, TextLink, BuildingIcon } from "@universe/ui";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
  WAREHOUSING: "Warehousing",
};

/**
 * Stakeholder detail — added 2026-10-01 so every place in the app that
 * names a stakeholder (a project line's manufacturer/supplier/freight
 * forwarder, a project's client, the Stakeholders list, the dashboard's
 * "recently added" panel) has somewhere real to link to, per Lewis's
 * instruction that anything tied to backend data should be interactive.
 * Query-param route (/partners/detail?id=...), same pattern as
 * projects/detail — see that file's note on why (Next static export +
 * dynamic-route limitation).
 *
 * Read-only for now: uses the existing getPartner() call, which already
 * returns the per-role detail blocks (supplierDetail etc.) — no new API
 * surface needed for this pass. Certification/expiry data isn't shown
 * here yet; that's wired up as part of the Quality Assurance section
 * (see quality/page.tsx), which does add a new read endpoint for it.
 */
export default function PartnerDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registryDetail, setRegistryDetail] = useState<StakeholderRegistryDetail | null>(null);
  const [registryProducts, setRegistryProducts] = useState<StakeholderRegistryProduct[]>([]);
  const countries = useCountries();

  useEffect(() => {
    if (!id) return;
    apiClient
      .getPartner(id)
      .then(setPartner)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stakeholder"));
  }, [id]);

  // Stakeholder registry linking — see claude/sop-driven-quality-roadmap.md
  // Section B3/C. Only fetched when this Partner was matched/linked at
  // creation; "products from this manufacturer" only ever populates once
  // the linked entry's identity is public (StakeholderRegistryService.
  // isIdentityPublic) — the linked organisation's own published catalogue.
  useEffect(() => {
    if (!partner?.registryEntryId) {
      setRegistryDetail(null);
      setRegistryProducts([]);
      return;
    }
    const entryId = partner.registryEntryId;
    apiClient.getStakeholderRegistryEntry(entryId).then(setRegistryDetail).catch(() => setRegistryDetail(null));
    apiClient.getStakeholderRegistryProducts(entryId).then(setRegistryProducts).catch(() => setRegistryProducts([]));
  }, [partner?.registryEntryId]);

  if (!id) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>No stakeholder specified.</main>;
  if (error) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>{error}</main>;
  if (!partner) return <main style={{ padding: 32, color: "var(--u-ink-secondary)" }}>Loading…</main>;

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--u-radius-md)",
              backgroundColor: "var(--u-accent-magenta-tint)",
              color: "var(--u-brand-violet)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BuildingIcon size={22} />
          </span>
          <div>
            <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>{partner.name}</h1>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {partner.roles.map((r) => (
                <Pill key={r.roleType} tone="neutral">
                  {ROLE_LABELS[r.roleType] ?? r.roleType.replace(/_/g, " ")}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        <Pill tone={partner.approvalStatus === "APPROVED" ? "good" : partner.approvalStatus === "REMOVED" ? "neutral" : "warning"}>
          {partner.approvalStatus}
        </Pill>
      </div>

      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
        <InfoCard label="Country">{countries.find((c) => c.code === partner.countryCode)?.name ?? partner.countryCode ?? "—"}</InfoCard>
        <InfoCard label="Website">
          {partner.website ? (
            <TextLink href={partner.website} target="_blank" rel="noreferrer">
              {partner.website.replace(/^https?:\/\//, "")}
            </TextLink>
          ) : (
            "—"
          )}
        </InfoCard>
        <InfoCard label="Added">{new Date(partner.createdAt).toLocaleDateString()}</InfoCard>
      </div>

      {partner.clientDetail && (
        <DetailSection title="Client details">
          <InfoCard label="Billing address">
            {formatAddress(
              {
                line1: partner.clientDetail.billingAddressLine1,
                line2: partner.clientDetail.billingAddressLine2,
                city: partner.clientDetail.billingCity,
                region: partner.clientDetail.billingRegion,
                postcode: partner.clientDetail.billingPostcode,
                countryCode: partner.clientDetail.billingCountryCode,
              },
              countries
            )}
          </InfoCard>
          <InfoCard label="Delivery address">
            {formatAddress(
              {
                line1: partner.clientDetail.deliveryAddressLine1,
                line2: partner.clientDetail.deliveryAddressLine2,
                city: partner.clientDetail.deliveryCity,
                region: partner.clientDetail.deliveryRegion,
                postcode: partner.clientDetail.deliveryPostcode,
                countryCode: partner.clientDetail.deliveryCountryCode,
              },
              countries
            )}
          </InfoCard>
          <InfoCard label="Payment terms">{partner.clientDetail.paymentTerms ?? "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.manufacturerDetail && (
        <DetailSection title="Manufacturer details">
          <InfoCard label="Scope of supply">{partner.manufacturerDetail.scopeOfSupply || "—"}</InfoCard>
          <InfoCard label="Scope of services">{partner.manufacturerDetail.scopeOfServicesDescription || "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.manufacturerSites.length > 0 && (
        <DetailSection title="Manufacturing sites">
          {partner.manufacturerSites.map((site) => (
            <InfoCard key={site.id} label={site.isPrimary ? `${site.siteName || "Site"} (Primary)` : site.siteName || "Site"}>
              {[countries.find((c) => c.code === site.countryCode)?.name ?? site.countryCode, site.address].filter(Boolean).join(" — ") || "—"}
            </InfoCard>
          ))}
        </DetailSection>
      )}

      {partner.companyChecks.length > 0 && (
        <DetailSection title="Company checks">
          {partner.companyChecks.map((check) => {
            const relatedDocs = partner.certifications.filter((c) => c.relatedCompanyCheckType === check.checkType);
            const label = check.checkType === "OTHER" ? check.customLabel || "Other check" : check.checkType.replace(/_/g, " ");
            return (
              <InfoCard key={check.id} label={label}>
                {check.result.replace(/_/g, " ")}
                {check.checkedDate ? ` — checked ${new Date(check.checkedDate).toLocaleDateString()}` : ""}
                {check.referenceOrSource ? ` — ${check.referenceOrSource}` : ""}
                {relatedDocs.length > 0 ? ` — ${relatedDocs.length} document(s) attached` : ""}
              </InfoCard>
            );
          })}
        </DetailSection>
      )}

      {partner.financialDetail && (
        <DetailSection title="Financial information">
          <InfoCard label="Bank name">{partner.financialDetail.bankName ?? "—"}</InfoCard>
          <InfoCard label="Account holder">{partner.financialDetail.accountHolderName ?? "—"}</InfoCard>
          <InfoCard label="Account number">{partner.financialDetail.accountNumber ?? "—"}</InfoCard>
          <InfoCard label="Sort code">{partner.financialDetail.sortCode ?? "—"}</InfoCard>
          <InfoCard label="IBAN">{partner.financialDetail.iban ?? "—"}</InfoCard>
          <InfoCard label="SWIFT / BIC">{partner.financialDetail.swiftBic ?? "—"}</InfoCard>
          <InfoCard label="Branch address">{partner.financialDetail.branchAddress ?? "—"}</InfoCard>
          <InfoCard label="Currency">{partner.financialDetail.currencyCode ?? "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.certifications.length > 0 && (
        <DetailSection title="Documents & certifications">
          {partner.certifications.map((cert) => (
            <InfoCard key={cert.id} label={cert.type.replace(/_/g, " ")}>
              {[cert.referenceNumber, cert.issuingBody, cert.expiryDate ? `expires ${new Date(cert.expiryDate).toLocaleDateString()}` : null]
                .filter(Boolean)
                .join(" — ") || "—"}
              {cert.isExpired && <span style={{ color: "var(--u-status-critical)", marginLeft: 8 }}>Expired</span>}
            </InfoCard>
          ))}
        </DetailSection>
      )}

      {partner.supplierDetail && (
        <DetailSection title="Supplier details">
          <InfoCard label="Supplier code">{partner.supplierDetail.supplierCode ?? "—"}</InfoCard>
          <InfoCard label="Product category">{partner.supplierDetail.productCategory ?? "—"}</InfoCard>
          <InfoCard label="FDA registration number">{partner.supplierDetail.fdaRegistrationNumber ?? "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.freightForwarderDetail && (
        <DetailSection title="Freight forwarder details">
          <InfoCard label="Modes of transport">
            {partner.freightForwarderDetail.modesOfTransport
              ? partner.freightForwarderDetail.modesOfTransport.split(",").join(", ")
              : "—"}
          </InfoCard>
        </DetailSection>
      )}

      <DetailSection title="Universe registry sharing">
        <InfoCard label="Shared with Universe registry">{partner.sharedWithUniverseRegistry ? "Yes" : "No"}</InfoCard>
      </DetailSection>

      {registryDetail && (
        <DetailSection title="Universe registry">
          <InfoCard label="Status">
            {registryDetail.isLinkedToPublishedOrganization
              ? `Registered on Universe as ${registryDetail.linkedOrganizationName}`
              : "Known to Universe (not yet registered)"}
          </InfoCard>
          {registryDetail.countryPresence.length > 0 && (
            <InfoCard label="Operates in">{registryDetail.countryPresence.join(", ")}</InfoCard>
          )}
        </DetailSection>
      )}

      {registryProducts.length > 0 && (
        <DetailSection title="Products from this manufacturer">
          {registryProducts.map((p) => (
            <InfoCard key={p.id} label={p.category ?? "Product"}>
              {p.name}
              {p.description ? ` — ${p.description}` : ""}
            </InfoCard>
          ))}
        </DetailSection>
      )}
    </main>
  );
}

/** Joins a structured address (added 2026-10-03, replacing the old
 * single free-text billing/delivery address block) into one readable
 * line for display — "—" when nothing is set at all. */
function formatAddress(
  address: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    region?: string | null;
    postcode?: string | null;
    countryCode?: string | null;
  },
  countries: { code: string; name: string }[]
): string {
  const countryName = address.countryCode
    ? countries.find((c) => c.code === address.countryCode)?.name ?? address.countryCode
    : null;
  const parts = [address.line1, address.line2, address.city, address.region, address.postcode, countryName].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10 }}>{title}</h2>
      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>
    </section>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--u-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--u-ink)" }}>{children}</div>
    </div>
  );
}
