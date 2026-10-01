"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreatePartnerInput } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { Button, Select, CountrySelect } from "@universe/ui";

// LOGISTICS removed 2026-10-01 — folded into Freight Forwarder/Warehousing
// per Lewis's instruction (UI-only change, see partners/page.tsx's doc
// comment for why the backend enum value itself isn't touched here).
const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
  WAREHOUSING: "Warehousing",
};

// Matches ProjectLine.productCategory's allowed values (schema.prisma
// "Allowed values reference") — SupplierDetail.productCategory reuses the
// same fixed list rather than inventing a separate one.
const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;

// Matches ProjectLine.incoterm's allowed values (Incoterms 2020).
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;

/**
 * New Stakeholder — tailored per role, 2026-10-01 (Lewis's follow-up to the
 * round 3 feedback). Previously this form only ever captured
 * name/country/website plus a flat list of role checkboxes — the
 * role-specific detail objects (SupplierDetail/ManufacturerDetail/
 * FreightForwarderDetail/ClientDetail) already existed in the schema and
 * were already accepted by CreatePartnerInput/PartnersService, but nothing
 * in the UI ever collected them, so every stakeholder type looked
 * identical on creation regardless of what the backend could actually
 * store for it.
 *
 * Now: ticking a role immediately reveals that role's own field group
 * below the role list — the same adapt-on-selection behaviour whether the
 * role arrived pre-ticked from the "+ Add Stakeholder" menu
 * (/partners/new?role=CLIENT etc.) or was toggled by hand, and a company
 * holding several roles at once (e.g. Manufacturer + Supplier) sees both
 * groups together. WAREHOUSING has no dedicated detail table in the schema
 * yet, so it intentionally shows no extra fields — not an oversight.
 */
export default function NewPartnerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pre-selected from the Stakeholders page's "+ Add Stakeholder" menu
  // (e.g. /partners/new?role=CLIENT) — "Manufacturer / Supplier" from that
  // menu lands here with role=MANUFACTURER pre-ticked; Supplier is one
  // click away since a partner can hold both roles at once.
  const initialRole = searchParams.get("role");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [website, setWebsite] = useState("");
  const [roleTypes, setRoleTypes] = useState<string[]>(
    initialRole && (ROLE_TYPES as readonly string[]).includes(initialRole) ? [initialRole] : []
  );

  const countries = useCountries();

  // --- Role-specific detail state — one block per detail table, only
  // ever sent to the API when its role is actually ticked (see
  // handleSubmit) so an unticked role never writes a stray detail row. ---
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierProductCategory, setSupplierProductCategory] = useState("");
  const [fdaRegistrationNumber, setFdaRegistrationNumber] = useState("");

  const [partNumberConvention, setPartNumberConvention] = useState("");
  const [countryOfManufactureCode, setCountryOfManufactureCode] = useState("");

  const [preferredIncoterm, setPreferredIncoterm] = useState("");
  const [serviceRegions, setServiceRegions] = useState("");

  const [billingAddress, setBillingAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const hasRole = useMemo(() => (r: string) => roleTypes.includes(r), [roleTypes]);

  function toggleRole(role: string) {
    setRoleTypes((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (roleTypes.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input: CreatePartnerInput = {
        name,
        countryCode: countryCode || undefined,
        website: website || undefined,
        roleTypes,
        ...(hasRole("SUPPLIER")
          ? {
              supplierDetail: {
                supplierCode: supplierCode || undefined,
                productCategory: supplierProductCategory || undefined,
                fdaRegistrationNumber: fdaRegistrationNumber || undefined,
              },
            }
          : {}),
        ...(hasRole("MANUFACTURER")
          ? {
              manufacturerDetail: {
                partNumberConvention: partNumberConvention || undefined,
                countryOfManufactureCode: countryOfManufactureCode || undefined,
              },
            }
          : {}),
        ...(hasRole("FREIGHT_FORWARDER")
          ? {
              freightForwarderDetail: {
                preferredIncoterm: preferredIncoterm || undefined,
                serviceRegions: serviceRegions || undefined,
              },
            }
          : {}),
        ...(hasRole("CLIENT")
          ? {
              clientDetail: {
                billingAddress: billingAddress || undefined,
                deliveryAddress: deliveryAddress || undefined,
                paymentTerms: paymentTerms || undefined,
              },
            }
          : {}),
      };
      await apiClient.createPartner(input);
      router.push("/partners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create partner");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 680 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 20px" }}>
        New Stakeholder
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Company Name
          <input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label style={{ display: "block" }}>
          <span>Country</span>
          <div style={{ marginTop: 4 }}>
            <CountrySelect value={countryCode} onChange={setCountryCode} options={countries} ariaLabel="Country" />
          </div>
        </label>

        <label>
          Website
          <input style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>

        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 16 }}>
          <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--u-ink)" }}>Roles</legend>
          <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13 }}>
            Select every role this stakeholder plays for your organization — a company can be, e.g., both a
            Manufacturer and a Supplier. Ticking a role reveals its own fields below.
          </p>
          {ROLE_TYPES.map((r) => (
            <label key={r} style={{ display: "block", marginBottom: 4, fontSize: 13.5, color: "var(--u-ink)" }}>
              <input type="checkbox" checked={roleTypes.includes(r)} onChange={() => toggleRole(r)} /> {ROLE_LABELS[r]}
            </label>
          ))}
        </fieldset>

        {hasRole("CLIENT") && (
          <RoleSection title="Client details">
            <label>
              Billing Address
              <textarea style={textareaStyle} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
            </label>
            <label>
              Delivery Address
              <textarea style={textareaStyle} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </label>
            <label>
              Payment Terms
              <input style={inputStyle} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
            </label>
          </RoleSection>
        )}

        {hasRole("MANUFACTURER") && (
          <RoleSection title="Manufacturer details">
            <label>
              Part Number Convention
              <input
                style={inputStyle}
                value={partNumberConvention}
                onChange={(e) => setPartNumberConvention(e.target.value)}
                placeholder="How this manufacturer formats its part numbers"
              />
            </label>
            <label style={{ display: "block" }}>
              <span>Country of Manufacture</span>
              <div style={{ marginTop: 4 }}>
                <CountrySelect
                  value={countryOfManufactureCode}
                  onChange={setCountryOfManufactureCode}
                  options={countries}
                  ariaLabel="Country of manufacture"
                />
              </div>
            </label>
          </RoleSection>
        )}

        {hasRole("SUPPLIER") && (
          <RoleSection title="Supplier details">
            <label>
              Supplier Code
              <input style={inputStyle} value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} />
            </label>
            <label style={{ display: "block" }}>
              <span>Product Category</span>
              <div style={{ marginTop: 4 }}>
                <Select
                  value={supplierProductCategory}
                  onChange={setSupplierProductCategory}
                  allLabel="Select a category"
                  ariaLabel="Supplier product category"
                  options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
                />
              </div>
            </label>
            <label>
              FDA Registration Number
              <input style={inputStyle} value={fdaRegistrationNumber} onChange={(e) => setFdaRegistrationNumber(e.target.value)} />
            </label>
          </RoleSection>
        )}

        {hasRole("FREIGHT_FORWARDER") && (
          <RoleSection title="Freight forwarder details">
            <label style={{ display: "block" }}>
              <span>Preferred Incoterm</span>
              <div style={{ marginTop: 4 }}>
                <Select
                  value={preferredIncoterm}
                  onChange={setPreferredIncoterm}
                  allLabel="Select an incoterm"
                  ariaLabel="Preferred incoterm"
                  options={INCOTERMS.map((i) => ({ value: i, label: i }))}
                />
              </div>
            </label>
            <label>
              Service Regions
              <textarea
                style={textareaStyle}
                value={serviceRegions}
                onChange={(e) => setServiceRegions(e.target.value)}
                placeholder="Free text for now — e.g. West Africa, Southern Africa"
              />
            </label>
          </RoleSection>
        )}

        {hasRole("WAREHOUSING") && (
          <RoleSection title="Warehousing details">
            <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>
              No additional fields are tracked for Warehousing yet.
            </p>
          </RoleSection>
        )}

        {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Stakeholder"}
        </Button>
      </form>
    </main>
  );
}

function RoleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: "var(--u-radius-md)",
        padding: 16,
        backgroundColor: "var(--u-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--u-org-accent, var(--u-brand-violet))" }}>{title}</legend>
      {children}
    </fieldset>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 64,
  resize: "vertical",
};
