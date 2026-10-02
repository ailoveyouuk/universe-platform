"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CreatePartnerCertificationInput,
  CreatePartnerCompanyCheckInput,
  CreatePartnerInput,
  CreatePartnerManufacturerSiteInput,
  StakeholderRegistryDetail,
  StakeholderRegistryMatch,
  StakeholderRegistryProduct,
} from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { useCurrentUser } from "../../../lib/AuthContext";
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


const RISK_TIERS = ["HIGH", "MEDIUM", "LOW"] as const;

// Bioconnections FORM 008.1's "Scope of supply" checkboxes (Devices /
// Equipment / Consumables / Services) — reused for both Manufacturer and
// Supplier, stored as a comma-joined string against scopeOfSupply since
// SQL Server has no array column here (same convention as every other
// fixed-choice free-text field in this schema).
const SCOPE_OF_SUPPLY_OPTIONS = ["DEVICES", "EQUIPMENT", "CONSUMABLES", "SERVICES"] as const;
const SCOPE_OF_SUPPLY_LABELS: Record<string, string> = {
  DEVICES: "Devices",
  EQUIPMENT: "Equipment",
  CONSUMABLES: "Consumables",
  SERVICES: "Services",
};

// Standard product-category licences/permits a client is expected to
// hold — see ProductLicensingType in packages/db/src/enums.ts. OTHER
// pairs with a free-text note (productCategoryLicensingOtherNotes)
// rather than a custom label, same reasoning as COMPANY_CHECK_TYPES'
// OTHER but simpler since there's only ever one "other" note, not a
// repeating list.
const PRODUCT_LICENSING_OPTIONS = [
  { value: "MHRA_WDA_H", label: "MHRA WDA(H) — Wholesale Dealer's Authorisation (Human)" },
  { value: "MHRA_MIA", label: "MHRA MIA — Manufacturer's/Importer's Authorisation" },
  { value: "MHRA_MS", label: "MHRA MS — Specials Manufacturer's/Importer's Authorisation" },
  { value: "HOME_OFFICE_CONTROLLED_DRUGS_LICENCE", label: "Home Office Controlled Drugs Licence" },
  { value: "GPHC_REGISTRATION", label: "GPhC Registration" },
  { value: "UKCA_MARKING", label: "UKCA Marking" },
  { value: "GDP_CERTIFICATE", label: "GDP Certificate" },
  { value: "CE_MDR_MARKING", label: "CE Marking (EU MDR)" },
  { value: "EUDAMED_REGISTRATION", label: "EUDAMED Registration" },
  { value: "FDA_REGISTRATION", label: "FDA Registration (US)" },
  { value: "HEALTH_CANADA_ESTABLISHMENT_LICENCE", label: "Health Canada Establishment Licence" },
  { value: "TGA_LICENCE", label: "TGA Licence (Australia)" },
  { value: "WHO_PREQUALIFICATION", label: "WHO Prequalification" },
  { value: "IMPORT_EXPORT_LICENCE", label: "General Import/Export Licence" },
  { value: "OTHER", label: "Other" },
] as const;

// Transport modes for freight forwarders.
const TRANSPORT_MODES = ["AIR", "SEA", "ROAD", "RAIL"] as const;
const TRANSPORT_MODE_LABELS: Record<string, string> = {
  AIR: "Air",
  SEA: "Sea",
  ROAD: "Road",
  RAIL: "Rail",
};

// The standard supplier/manufacturer/freight-forwarder verification
// checklist — see PartnerCompanyCheckType in packages/db/src/enums.ts.
// OTHER is appended separately below (ADD_CHECK_OPTIONS) since it needs a
// custom label rather than a fixed one.
const COMPANY_CHECK_TYPES = [
  { value: "COMPANIES_HOUSE_REGISTRATION", label: "UK Companies House Registration" },
  { value: "OTHER_NATIONAL_COMPANY_REGISTRATION", label: "Other National Company Registration" },
  { value: "VAT_CERTIFICATE", label: "VAT Certificate" },
  { value: "WEBSITE", label: "Website" },
  { value: "FINANCIAL_CREDIT_STATUS", label: "Financial Credit Status" },
  { value: "LOCATION", label: "Location" },
  { value: "BUSINESS_INSURANCE", label: "Business Insurance" },
] as const;

// CertificationType (packages/db/src/enums.ts) — the generic documents/
// certificates repeater below accepts any of these regardless of role,
// since several (ISO_9001, COMPANY_REGISTRATION, VAT_CERTIFICATE…) are
// relevant to more than one role. Grouped loosely for the dropdown.
const CERTIFICATION_TYPES = [
  "ISO_13485",
  "ISO_9001",
  "ISO_14001",
  "ISO_17025",
  "OTHER_ISO",
  "FDA_REGISTRATION",
  "GMP",
  "GDP",
  "MIA",
  "WDA",
  "EUDAMED_REGISTRATION",
  "CE_MDR_CERTIFICATE",
  "DECLARATION_OF_CONFORMITY",
  "DEVICE_REGISTRATION",
  "INSTRUCTIONS_FOR_USE",
  "TECHNICAL_INFORMATION_SHEET",
  "COMPANY_REGISTRATION",
  "VAT_CERTIFICATE",
  "FINANCIAL_CREDIT_CHECK",
  "BUSINESS_INSURANCE",
  "IATA_DGR_CERTIFICATION",
  "AEO_ACCREDITATION",
  "INSURANCE_CERTIFICATE",
  "TECHNICAL_AGREEMENT",
  "SERVICE_LEVEL_AGREEMENT",
  "CODE_OF_CONDUCT_ACKNOWLEDGEMENT",
  "REFERENCES",
  "BONA_FIDE_REVIEW",
  "OTHER_CERTIFICATION",
] as const;
const CERTIFICATION_TYPE_LABELS: Record<string, string> = {
  ISO_13485: "ISO 13485",
  ISO_9001: "ISO 9001",
  ISO_14001: "ISO 14001",
  ISO_17025: "ISO 17025",
  OTHER_ISO: "Other ISO accreditation",
  FDA_REGISTRATION: "FDA Registration",
  GMP: "GMP Certificate",
  GDP: "GDP Certificate",
  MIA: "Manufacturer's/Importer's Authorisation (MIA)",
  WDA: "Wholesale Dealer's Authorisation (WDA)",
  EUDAMED_REGISTRATION: "EUDAMED Registration",
  CE_MDR_CERTIFICATE: "CE / MDR Certificate",
  DECLARATION_OF_CONFORMITY: "Declaration of Conformity",
  DEVICE_REGISTRATION: "In-country Device Registration",
  INSTRUCTIONS_FOR_USE: "Instructions for Use (IFU)",
  TECHNICAL_INFORMATION_SHEET: "Technical Information Sheet",
  COMPANY_REGISTRATION: "Company Registration Certificate",
  VAT_CERTIFICATE: "VAT Certificate",
  FINANCIAL_CREDIT_CHECK: "Financial Credit Check",
  BUSINESS_INSURANCE: "Business Insurance Certificate",
  IATA_DGR_CERTIFICATION: "IATA Dangerous Goods Regulations Certification",
  AEO_ACCREDITATION: "Authorised Economic Operator (AEO) Accreditation",
  INSURANCE_CERTIFICATE: "Insurance Certificate",
  TECHNICAL_AGREEMENT: "Technical Agreement",
  SERVICE_LEVEL_AGREEMENT: "Service Level Agreement",
  CODE_OF_CONDUCT_ACKNOWLEDGEMENT: "Code of Conduct Acknowledgement",
  REFERENCES: "References",
  BONA_FIDE_REVIEW: "Bona Fide Review",
  OTHER_CERTIFICATION: "Other",
};

type ManufacturerSiteRow = { siteName: string; countryCode: string; address: string; isPrimary: boolean };
type CertificationRow = {
  type: string;
  referenceNumber: string;
  revision: string;
  issuingBody: string;
  issuedDate: string;
  expiryDate: string;
  notes: string;
  manufacturerSiteIndex: string; // "" = company-wide, else stringified index
  relatedCompanyCheckType: string; // "" = not related to a specific check
};
type CompanyCheckRow = { result: string; checkedDate: string; referenceOrSource: string; comment: string; customLabel: string };
const BLANK_COMPANY_CHECK: CompanyCheckRow = { result: "", checkedDate: "", referenceOrSource: "", comment: "", customLabel: "" };
// Company Checks is now an "Add Check" picker (changed 2026-10-03, per
// Lewis's feedback that listing every possible check up front — most of
// them never used — read as cluttered) rather than a fixed set of rows
// always shown: COMPANY_CHECK_TYPES plus a synthetic "Other" option for a
// check not on the predefined list (PartnerCompanyCheckType.OTHER already
// existed in the enum for exactly this, just unused in the UI before now).
const ADD_CHECK_OPTIONS = [...COMPANY_CHECK_TYPES, { value: "OTHER", label: "Other…" }] as const;

/**
 * New Stakeholder — expanded 2026-10-02 per Lewis's round-4 feedback.
 *
 * The round-3 version (2026-10-01) tailored fields per role but the set
 * was still thin — a handful of identifiers, nothing that actually proves
 * a supplier/manufacturer/freight forwarder was properly vetted, and
 * nothing to record scope of supply, risk tiering, or the documents a
 * real onboarding packet always has attached.
 *
 * This version was designed against real sources (see
 * architecture-decisions.md, "Stakeholder onboarding expansion" for the
 * full research trail and per-field provenance):
 *   - Bioconnections' own "New Non-Pharmaceutical Supplier Form"
 *     (FORM 008.1) — the Company Checks table and Scope of Supply
 *     checkboxes below are a direct port of its structure.
 *   - The real Becton Dickinson SharePoint folder Lewis shared — the
 *     generic certifications/documents repeater (with optional
 *     per-manufacturing-site scoping) mirrors what's actually kept there
 *     (ISO 13485 per site, EUDAMED/CE-MDR/Declaration of Conformity at
 *     product-family level, in-country device registrations).
 *   - Risk tiering, the Client pharma-qualification fields, and the
 *     Warehousing fields trace back to Unimed's standard procurement and
 *     logistics practice for pharmaceutical/GDP-sensitive product.
 *
 * Ticking a role still immediately reveals that role's own field group;
 * Company Checks and the Documents/Certifications repeater appear once any
 * role is ticked (a standard verification packet for every stakeholder
 * type, not just companies Unimed sources from/ships through).
 */
export default function NewPartnerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useCurrentUser();
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
  const [riskTier, setRiskTier] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [roleTypes, setRoleTypes] = useState<string[]>(
    initialRole && (ROLE_TYPES as readonly string[]).includes(initialRole) ? [initialRole] : []
  );

  // --- Stakeholder registry duplicate-prevention (added 2026-10-02) — see
  // StakeholderRegistryEntry in schema.prisma and
  // claude/sop-driven-quality-roadmap.md Section C. Debounced search
  // against the shared, cross-tenant registry as the user types a name and
  // picks a role, same "250ms setTimeout" pattern as the product search on
  // the Quality page. `registryEntryId` is what actually gets sent on
  // submit, once the user has either confirmed a suggested match or
  // explicitly dismissed it (in which case we create a fresh registry
  // entry server-side instead — see PartnersService.create).
  // Separate match lists per triggering field (name, company registration
  // number, VAT number — added 2026-10-03, same duplicate-prevention
  // pattern as name, since a registration/VAT number is just as unique to
  // one company) so each field's own debounced search can't clobber
  // another's in-flight results; registryMatches below is their merged,
  // deduped view for rendering.
  const [nameMatches, setNameMatches] = useState<StakeholderRegistryMatch[]>([]);
  const [registrationNumberMatches, setRegistrationNumberMatches] = useState<StakeholderRegistryMatch[]>([]);
  const [vatNumberMatches, setVatNumberMatches] = useState<StakeholderRegistryMatch[]>([]);
  const [dismissedMatchIds, setDismissedMatchIds] = useState<string[]>([]);
  const registryMatches = useMemo(() => {
    const seen = new Set<string>();
    const merged: StakeholderRegistryMatch[] = [];
    for (const m of [...nameMatches, ...registrationNumberMatches, ...vatNumberMatches]) {
      if (seen.has(m.id) || dismissedMatchIds.includes(m.id)) continue;
      seen.add(m.id);
      merged.push(m);
    }
    return merged;
  }, [nameMatches, registrationNumberMatches, vatNumberMatches, dismissedMatchIds]);
  const [registryEntryId, setRegistryEntryId] = useState<string | null>(null);
  const [linkedMatchName, setLinkedMatchName] = useState<string | null>(null);
  const [lightboxEntryId, setLightboxEntryId] = useState<string | null>(null);
  const [lightboxDetail, setLightboxDetail] = useState<StakeholderRegistryDetail | null>(null);
  const [lightboxProducts, setLightboxProducts] = useState<StakeholderRegistryProduct[]>([]);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  // Identity-level matching against the Universe registry is mandatory and
  // always on — every organisation created here is matched/registered for
  // duplicate-prevention and cross-app autopopulate accuracy, regardless of
  // which Partner is doing the creating. Only name/country/registration
  // number/role data is ever shared for this matching (see
  // resolveForPartnerCreate on the API side) — none of a Partner's own
  // records, verification results, risk tier, documents or pricing are ever
  // shared. sharedWithUniverseRegistry is reserved for a future, separate
  // consent covering relationship-specific data (e.g. pricing) with the
  // organisation that created the record; it is not wired to anything yet,
  // so it is always sent as true here.

  // The form's own matching scope — the first role ticked, per Lewis's own
  // framing ("the system will know Client 2 is trying to add a
  // stakeholder-manufacturer"). A stakeholder with several roles still
  // matches on the first one selected; broadening this to search across
  // every ticked role is a natural follow-up, not required for v1.
  const primaryRoleType = roleTypes[0];

  useEffect(() => {
    if (registryEntryId || !primaryRoleType || name.trim().length < 2) {
      setNameMatches([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient
        .searchStakeholderRegistry(primaryRoleType, name.trim())
        .then(setNameMatches)
        .catch(() => setNameMatches([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [name, primaryRoleType, registryEntryId]);

  // Company Registration Number and VAT Number are each unique to a
  // specific company, same as name — so they get the same autopopulate/
  // duplicate-prevention prompt, matched as an exact external identifier
  // rather than a fuzzy name search (see StakeholderRegistryService.search's
  // `field` param).
  useEffect(() => {
    if (registryEntryId || !primaryRoleType || companyRegistrationNumber.trim().length < 2) {
      setRegistrationNumberMatches([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient
        .searchStakeholderRegistry(primaryRoleType, companyRegistrationNumber.trim(), "registrationNumber")
        .then(setRegistrationNumberMatches)
        .catch(() => setRegistrationNumberMatches([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [companyRegistrationNumber, primaryRoleType, registryEntryId]);

  useEffect(() => {
    if (registryEntryId || !primaryRoleType || vatNumber.trim().length < 2) {
      setVatNumberMatches([]);
      return;
    }
    const handle = setTimeout(() => {
      apiClient
        .searchStakeholderRegistry(primaryRoleType, vatNumber.trim(), "vatNumber")
        .then(setVatNumberMatches)
        .catch(() => setVatNumberMatches([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [vatNumber, primaryRoleType, registryEntryId]);

  function openRegistryLightbox(id: string) {
    setLightboxEntryId(id);
    setLightboxLoading(true);
    setLightboxDetail(null);
    setLightboxProducts([]);
    Promise.all([apiClient.getStakeholderRegistryEntry(id), apiClient.getStakeholderRegistryProducts(id)])
      .then(([detail, products]) => {
        setLightboxDetail(detail);
        setLightboxProducts(products);
      })
      .catch(() => setLightboxDetail(null))
      .finally(() => setLightboxLoading(false));
  }

  function closeLightbox() {
    setLightboxEntryId(null);
    setLightboxDetail(null);
    setLightboxProducts([]);
  }

  /** One-click "Add this manufacturer" — links to the shared registry
   * entry and pre-fills whatever the form hasn't already got filled in, so
   * nothing needs retyping. Does NOT touch approvalStatus or skip this
   * organisation's own onboarding/evidence checks — see the roadmap doc's
   * explicit boundary on this. */
  function linkToRegistryMatch(match: StakeholderRegistryMatch) {
    setRegistryEntryId(match.id);
    setLinkedMatchName(match.legalName);
    if (!countryCode && match.countryCode) setCountryCode(match.countryCode);
    if (!website && match.website) setWebsite(match.website);
    if (!companyRegistrationNumber && match.registrationNumber) setCompanyRegistrationNumber(match.registrationNumber);
    if (!vatNumber && match.vatNumber) setVatNumber(match.vatNumber);
    setNameMatches([]);
    setRegistrationNumberMatches([]);
    setVatNumberMatches([]);
    closeLightbox();
  }

  function dismissRegistryMatch(id: string) {
    setDismissedMatchIds((prev) => [...prev, id]);
  }

  function unlinkRegistryMatch() {
    setRegistryEntryId(null);
    setLinkedMatchName(null);
  }

  const countries = useCountries();

  // --- Role-specific detail state — one block per detail table, only
  // ever sent to the API when its role is actually ticked (see
  // handleSubmit) so an unticked role never writes a stray detail row. ---
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierProductCategory, setSupplierProductCategory] = useState("");
  const [fdaRegistrationNumber, setFdaRegistrationNumber] = useState("");
  const [supplierScopeOfSupply, setSupplierScopeOfSupply] = useState<string[]>([]);
  const [supplierScopeOfServices, setSupplierScopeOfServices] = useState("");
  const [supplierCodeOfConductAcknowledged, setSupplierCodeOfConductAcknowledged] = useState(false);
  const [supplierCodeOfConductDate, setSupplierCodeOfConductDate] = useState("");

  // Part Number Convention and a standalone Country of Manufacture field
  // were removed 2026-10-03 per Lewis's feedback: the former isn't needed
  // right now, and the latter is now fully covered by Manufacturing Sites
  // below (several real manufacturers have more than one site, each with
  // its own country — a single top-level country field couldn't represent
  // that, but the per-site country field already can).
  const [manufacturerScopeOfSupply, setManufacturerScopeOfSupply] = useState<string[]>([]);
  const [manufacturerScopeOfServices, setManufacturerScopeOfServices] = useState("");
  const [manufacturerSites, setManufacturerSites] = useState<ManufacturerSiteRow[]>([]);

  const [modesOfTransport, setModesOfTransport] = useState<string[]>([]);
  const [iataDgrCertified, setIataDgrCertified] = useState(false);
  const [aeoAccredited, setAeoAccredited] = useState(false);
  const [gdpTransportCapable, setGdpTransportCapable] = useState(false);
  const [referencesProvided, setReferencesProvided] = useState(false);

  // Billing and delivery address split into standard address fields, each
  // with its own country selector — added 2026-10-03 so every element is
  // stored separately and usable across every app, not just one free-text
  // block per address.
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingRegion, setBillingRegion] = useState("");
  const [billingPostcode, setBillingPostcode] = useState("");
  const [billingCountryCode, setBillingCountryCode] = useState("");
  const [deliveryAddressLine1, setDeliveryAddressLine1] = useState("");
  const [deliveryAddressLine2, setDeliveryAddressLine2] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryRegion, setDeliveryRegion] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [deliveryCountryCode, setDeliveryCountryCode] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [productCategoryLicenses, setProductCategoryLicenses] = useState<string[]>([]);
  const [productCategoryLicensingOtherNotes, setProductCategoryLicensingOtherNotes] = useState("");
  const [destinationCountryRestrictionsNotes, setDestinationCountryRestrictionsNotes] = useState("");
  const [isPharmaApprovedCustomer, setIsPharmaApprovedCustomer] = useState(false);
  const [approvedCustomerLogRef, setApprovedCustomerLogRef] = useState("");

  const [wdaNumber, setWdaNumber] = useState("");
  const [technicalAgreementRef, setTechnicalAgreementRef] = useState("");
  const [gdpAuditDate, setGdpAuditDate] = useState("");
  const [nextGdpAuditDue, setNextGdpAuditDue] = useState("");
  const [monthlyReconciliationContact, setMonthlyReconciliationContact] = useState("");

  // --- Shared verification packet — Company Checks + Documents, see the
  // doc comment above. Company Checks is a fixed set of rows (Bioconnections'
  // table has a fixed set of checks, not a free list); Documents is an
  // open-ended repeater since the number of certificates genuinely varies
  // per company (see the Becton Dickinson folder: a handful of files for a
  // small supplier, dozens for a manufacturer with several sites). ---
  const [companyChecks, setCompanyChecks] = useState<Record<string, CompanyCheckRow>>({});
  const [addCheckValue, setAddCheckValue] = useState("");
  const [certifications, setCertifications] = useState<CertificationRow[]>([]);

  function addCompanyCheck(checkType: string) {
    if (!checkType || companyChecks[checkType]) return;
    setCompanyChecks((prev) => ({ ...prev, [checkType]: { ...BLANK_COMPANY_CHECK } }));
  }
  function updateCompanyCheck(checkType: string, patch: Partial<CompanyCheckRow>) {
    setCompanyChecks((prev) => ({ ...prev, [checkType]: { ...prev[checkType], ...patch } }));
  }
  function removeCompanyCheck(checkType: string) {
    setCompanyChecks((prev) => {
      const next = { ...prev };
      delete next[checkType];
      return next;
    });
    // A document related to the removed check falls back to unrelated
    // rather than silently pointing at a check that no longer exists —
    // same convention as removeManufacturerSite below.
    setCertifications((prev) =>
      prev.map((c) => (c.relatedCompanyCheckType === checkType ? { ...c, relatedCompanyCheckType: "" } : c))
    );
  }

  const hasRole = useMemo(() => (r: string) => roleTypes.includes(r), [roleTypes]);
  // Every stakeholder type gets the standard company checks, documents and
  // certifications packet — not just MANUFACTURER/SUPPLIER/FREIGHT_FORWARDER/
  // WAREHOUSING. Gated only on at least one role being selected, same as the
  // rest of the role-specific sections.
  const showVerificationPacket = useMemo(() => roleTypes.length > 0, [roleTypes]);

  function toggleRole(role: string) {
    setRoleTypes((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function toggleInList(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addManufacturerSite() {
    setManufacturerSites((prev) => [...prev, { siteName: "", countryCode: "", address: "", isPrimary: prev.length === 0 }]);
  }
  function updateManufacturerSite(index: number, patch: Partial<ManufacturerSiteRow>) {
    setManufacturerSites((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeManufacturerSite(index: number) {
    setManufacturerSites((prev) => prev.filter((_, i) => i !== index));
    // A document scoped to the removed site falls back to company-wide
    // rather than silently pointing at a site that no longer exists.
    setCertifications((prev) =>
      prev.map((c) => (c.manufacturerSiteIndex === String(index) ? { ...c, manufacturerSiteIndex: "" } : c))
    );
  }

  function addCertification(relatedCompanyCheckType = "") {
    setCertifications((prev) => [
      ...prev,
      { type: "", referenceNumber: "", revision: "", issuingBody: "", issuedDate: "", expiryDate: "", notes: "", manufacturerSiteIndex: "", relatedCompanyCheckType },
    ]);
  }
  function updateCertification(index: number, patch: Partial<CertificationRow>) {
    setCertifications((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function removeCertification(index: number) {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
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
      const manufacturerSitesInput: CreatePartnerManufacturerSiteInput[] | undefined = hasRole("MANUFACTURER") && manufacturerSites.length
        ? manufacturerSites.map((s) => ({
            siteName: s.siteName,
            countryCode: s.countryCode || undefined,
            address: s.address || undefined,
            isPrimary: s.isPrimary,
          }))
        : undefined;

      const certificationsInput: CreatePartnerCertificationInput[] | undefined = certifications.length
        ? certifications
            .filter((c) => c.type)
            .map((c) => ({
              type: c.type,
              referenceNumber: c.referenceNumber || undefined,
              revision: c.revision || undefined,
              issuingBody: c.issuingBody || undefined,
              issuedDate: c.issuedDate || undefined,
              expiryDate: c.expiryDate || undefined,
              notes: c.notes || undefined,
              manufacturerSiteIndex: c.manufacturerSiteIndex === "" ? undefined : Number(c.manufacturerSiteIndex),
              relatedCompanyCheckType: c.relatedCompanyCheckType || undefined,
            }))
        : undefined;

      const companyChecksInput: CreatePartnerCompanyCheckInput[] | undefined = showVerificationPacket
        ? Object.entries(companyChecks)
            .filter(([, row]) => row.result)
            .map(([checkType, row]) => ({
              checkType,
              customLabel: checkType === "OTHER" ? row.customLabel || undefined : undefined,
              result: row.result as "YES" | "NO" | "NOT_APPLICABLE",
              checkedDate: row.checkedDate || undefined,
              referenceOrSource: row.referenceOrSource || undefined,
              comment: row.comment || undefined,
            }))
        : undefined;

      const input: CreatePartnerInput = {
        name,
        countryCode: countryCode || undefined,
        website: website || undefined,
        riskTier: (riskTier || undefined) as CreatePartnerInput["riskTier"],
        companyRegistrationNumber: companyRegistrationNumber || undefined,
        vatNumber: vatNumber || undefined,
        registryEntryId: registryEntryId || undefined,
        sharedWithUniverseRegistry: true,
        roleTypes,
        ...(manufacturerSitesInput?.length ? { manufacturerSites: manufacturerSitesInput } : {}),
        ...(certificationsInput?.length ? { certifications: certificationsInput } : {}),
        ...(companyChecksInput?.length ? { companyChecks: companyChecksInput } : {}),
        ...(hasRole("SUPPLIER")
          ? {
              supplierDetail: {
                supplierCode: supplierCode || undefined,
                productCategory: supplierProductCategory || undefined,
                fdaRegistrationNumber: fdaRegistrationNumber || undefined,
                scopeOfSupply: supplierScopeOfSupply.length ? supplierScopeOfSupply.join(",") : undefined,
                scopeOfServicesDescription: supplierScopeOfServices || undefined,
                codeOfConductAcknowledged: supplierCodeOfConductAcknowledged || undefined,
                codeOfConductAcknowledgedDate: supplierCodeOfConductAcknowledged ? supplierCodeOfConductDate || undefined : undefined,
              },
            }
          : {}),
        ...(hasRole("MANUFACTURER")
          ? {
              manufacturerDetail: {
                scopeOfSupply: manufacturerScopeOfSupply.length ? manufacturerScopeOfSupply.join(",") : undefined,
                scopeOfServicesDescription: manufacturerScopeOfServices || undefined,
              },
            }
          : {}),
        ...(hasRole("FREIGHT_FORWARDER")
          ? {
              freightForwarderDetail: {
                modesOfTransport: modesOfTransport.length ? modesOfTransport.join(",") : undefined,
                iataDgrCertified: iataDgrCertified || undefined,
                aeoAccredited: aeoAccredited || undefined,
                gdpTransportCapable: gdpTransportCapable || undefined,
                referencesProvided: referencesProvided || undefined,
              },
            }
          : {}),
        ...(hasRole("CLIENT")
          ? {
              clientDetail: {
                billingAddressLine1: billingAddressLine1 || undefined,
                billingAddressLine2: billingAddressLine2 || undefined,
                billingCity: billingCity || undefined,
                billingRegion: billingRegion || undefined,
                billingPostcode: billingPostcode || undefined,
                billingCountryCode: billingCountryCode || undefined,
                deliveryAddressLine1: deliveryAddressLine1 || undefined,
                deliveryAddressLine2: deliveryAddressLine2 || undefined,
                deliveryCity: deliveryCity || undefined,
                deliveryRegion: deliveryRegion || undefined,
                deliveryPostcode: deliveryPostcode || undefined,
                deliveryCountryCode: deliveryCountryCode || undefined,
                paymentTerms: paymentTerms || undefined,
                productCategoryLicenses: productCategoryLicenses.length ? productCategoryLicenses.join(",") : undefined,
                productCategoryLicensingOtherNotes: productCategoryLicenses.includes("OTHER")
                  ? productCategoryLicensingOtherNotes || undefined
                  : undefined,
                destinationCountryRestrictionsNotes: destinationCountryRestrictionsNotes || undefined,
                isPharmaApprovedCustomer: isPharmaApprovedCustomer || undefined,
                approvedCustomerLogRef: isPharmaApprovedCustomer ? approvedCustomerLogRef || undefined : undefined,
              },
            }
          : {}),
        ...(hasRole("WAREHOUSING")
          ? {
              warehousingDetail: {
                wdaNumber: wdaNumber || undefined,
                technicalAgreementRef: technicalAgreementRef || undefined,
                gdpAuditDate: gdpAuditDate || undefined,
                nextGdpAuditDue: nextGdpAuditDue || undefined,
                monthlyReconciliationContact: monthlyReconciliationContact || undefined,
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
    <main style={{ padding: "28px 32px 48px", maxWidth: 760 }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: "0 0 20px" }}>
        New Stakeholder
      </h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Company Name
          <input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontSize: 13,
            color: "var(--u-ink)",
            background: "var(--u-surface-alt)",
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-md, 8px)",
            padding: "12px 14px",
          }}
        >
          <span>
            <strong>This company is matched against the Universe registry.</strong> This is a standard, mandatory
            part of every record for connected accuracy across the platform — other organisations on Universe
            creating the same manufacturer/supplier will be matched to this one instead of creating a duplicate, and
            — only once that company has its own Universe account and has chosen to publish its profile — can see
            its name and products. Nothing about {me?.organizationName ?? "your organisation"} is ever shared as
            part of this: none of your own records, verification results, risk tier, documents or pricing are
            visible or accessible to any other organisation. That kind of relationship-specific sharing (e.g.
            pricing with the organisation that created this record) is a separate consent, not controlled here.
          </span>
        </div>

        {/* Stakeholder registry duplicate-prevention — see the state/effect
            block above and claude/sop-driven-quality-roadmap.md Section C.
            Shows at most while nothing is linked yet; a linked match gets
            its own confirmation chip instead (rendered just below). */}
        {!registryEntryId && registryMatches.length > 0 && (
          <div
            style={{
              background: "var(--u-surface-subtle, #F5F6FA)",
              border: "1px solid var(--u-border)",
              borderRadius: "var(--u-radius-md)",
              padding: "10px 14px",
              fontSize: 13.5,
              color: "var(--u-ink)",
            }}
          >
            {registryMatches.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span>
                  {m.isLinkedToPublishedOrganization
                    ? <>This looks like <strong>{m.linkedOrganizationName}</strong> — already registered on Universe.</>
                    : <>A {ROLE_LABELS[primaryRoleType] ?? "stakeholder"} matching this name, registration number or VAT number has already been added by another organisation on Universe.</>}
                </span>
                <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => openRegistryLightbox(m.id)} style={linkButtonStyle}>
                    View record
                  </button>
                  <button type="button" onClick={() => dismissRegistryMatch(m.id)} style={linkButtonStyle}>
                    Not this one
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {registryEntryId && (
          <div
            style={{
              background: "var(--u-surface-subtle, #F0F7F0)",
              border: "1px solid var(--u-border)",
              borderRadius: "var(--u-radius-md)",
              padding: "10px 14px",
              fontSize: 13.5,
              color: "var(--u-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              Linked to Universe record{linkedMatchName ? <> for <strong>{linkedMatchName}</strong></> : null} — fields
              were pre-filled where available. You'll still run your own onboarding checks on this stakeholder.
            </span>
            <button type="button" onClick={unlinkRegistryMatch} style={linkButtonStyle}>
              Undo
            </button>
          </div>
        )}

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

        <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span>Risk Tier</span>
            <div style={{ marginTop: 4 }}>
              <Select
                value={riskTier}
                onChange={setRiskTier}
                allLabel="Not set"
                ariaLabel="Risk tier"
                options={RISK_TIERS.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))}
              />
            </div>
          </label>
          <label>
            Company Registration No.
            <input style={inputStyle} value={companyRegistrationNumber} onChange={(e) => setCompanyRegistrationNumber(e.target.value)} />
          </label>
          <label>
            VAT Number
            <input style={inputStyle} value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
          </label>
        </div>

        <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 16 }}>
          <legend style={{ fontWeight: 600, fontSize: 13.5, color: "var(--u-ink)" }}>Roles</legend>
          <p style={{ marginTop: 0, color: "var(--u-ink-secondary)", fontSize: 13 }}>
            Select every role this stakeholder plays for your organisation — a company can be, e.g., both a
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
            <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink)" }}>Billing Address</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label>
                  Address Line 1
                  <input style={inputStyle} value={billingAddressLine1} onChange={(e) => setBillingAddressLine1(e.target.value)} />
                </label>
                <label>
                  Address Line 2
                  <input style={inputStyle} value={billingAddressLine2} onChange={(e) => setBillingAddressLine2(e.target.value)} />
                </label>
                <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                  <label>
                    City
                    <input style={inputStyle} value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                  </label>
                  <label>
                    Region / County
                    <input style={inputStyle} value={billingRegion} onChange={(e) => setBillingRegion(e.target.value)} />
                  </label>
                  <label>
                    Postcode
                    <input style={inputStyle} value={billingPostcode} onChange={(e) => setBillingPostcode(e.target.value)} />
                  </label>
                </div>
                <label style={{ display: "block" }}>
                  <span>Country</span>
                  <div style={{ marginTop: 4 }}>
                    <CountrySelect value={billingCountryCode} onChange={setBillingCountryCode} options={countries} ariaLabel="Billing country" />
                  </div>
                </label>
              </div>
            </fieldset>
            <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink)" }}>Delivery Address</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label>
                  Address Line 1
                  <input style={inputStyle} value={deliveryAddressLine1} onChange={(e) => setDeliveryAddressLine1(e.target.value)} />
                </label>
                <label>
                  Address Line 2
                  <input style={inputStyle} value={deliveryAddressLine2} onChange={(e) => setDeliveryAddressLine2(e.target.value)} />
                </label>
                <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                  <label>
                    City
                    <input style={inputStyle} value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
                  </label>
                  <label>
                    Region / County
                    <input style={inputStyle} value={deliveryRegion} onChange={(e) => setDeliveryRegion(e.target.value)} />
                  </label>
                  <label>
                    Postcode
                    <input style={inputStyle} value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} />
                  </label>
                </div>
                <label style={{ display: "block" }}>
                  <span>Country</span>
                  <div style={{ marginTop: 4 }}>
                    <CountrySelect value={deliveryCountryCode} onChange={setDeliveryCountryCode} options={countries} ariaLabel="Delivery country" />
                  </div>
                </label>
              </div>
            </fieldset>
            <label>
              Payment Terms
              <input style={inputStyle} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
            </label>
            <div>
              <span style={{ display: "block", marginBottom: 6, fontSize: 13.5, color: "var(--u-ink)" }}>
                Product Category Licensing
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PRODUCT_LICENSING_OPTIONS.map((o) => (
                  <label key={o.value} style={{ fontSize: 13, color: "var(--u-ink)" }}>
                    <input
                      type="checkbox"
                      checked={productCategoryLicenses.includes(o.value)}
                      onChange={() => toggleInList(productCategoryLicenses, o.value, setProductCategoryLicenses)}
                    />{" "}
                    {o.label}
                  </label>
                ))}
                {productCategoryLicenses.includes("OTHER") && (
                  <input
                    style={{ ...inputStyle, marginTop: 2 }}
                    value={productCategoryLicensingOtherNotes}
                    onChange={(e) => setProductCategoryLicensingOtherNotes(e.target.value)}
                    placeholder="Describe the other licence/permit held"
                  />
                )}
              </div>
            </div>
            <label>
              Destination Country Restrictions
              <textarea
                style={textareaStyle}
                value={destinationCountryRestrictionsNotes}
                onChange={(e) => setDestinationCountryRestrictionsNotes(e.target.value)}
                placeholder="Any export/import restrictions that apply to shipments for this customer"
              />
            </label>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input
                type="checkbox"
                checked={isPharmaApprovedCustomer}
                onChange={(e) => setIsPharmaApprovedCustomer(e.target.checked)}
              />{" "}
              Approved pharmaceutical customer
            </label>
            {isPharmaApprovedCustomer && (
              <label>
                Approved Customer Log Reference
                <input style={inputStyle} value={approvedCustomerLogRef} onChange={(e) => setApprovedCustomerLogRef(e.target.value)} />
              </label>
            )}
          </RoleSection>
        )}

        {hasRole("MANUFACTURER") && (
          <RoleSection title="Manufacturer details">
            <ScopeOfSupplyField value={manufacturerScopeOfSupply} onToggle={(v) => toggleInList(manufacturerScopeOfSupply, v, setManufacturerScopeOfSupply)} />
            <label>
              Scope of Services
              <textarea
                style={textareaStyle}
                value={manufacturerScopeOfServices}
                onChange={(e) => setManufacturerScopeOfServices(e.target.value)}
                placeholder="Free text description of services this manufacturer provides, if any"
              />
            </label>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Manufacturing Sites</span>
                <Button type="button" variant="secondary" onClick={addManufacturerSite}>
                  + Add Site
                </Button>
              </div>
              <p style={{ margin: "0 0 10px", color: "var(--u-ink-secondary)", fontSize: 12.5 }}>
                Add one row per manufacturing site — this also covers the country of manufacture: several
                manufacturers make the same product at more than one location, each in its own country, so record
                a site (and its country) for each one rather than a single company-wide country.
              </p>
              {manufacturerSites.map((site, i) => (
                <div
                  key={i}
                  style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, marginBottom: 8 }}
                >
                  <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 8 }}>
                    <label>
                      Site Name
                      <input style={inputStyle} value={site.siteName} onChange={(e) => updateManufacturerSite(i, { siteName: e.target.value })} />
                    </label>
                    <label style={{ display: "block" }}>
                      <span>Country</span>
                      <div style={{ marginTop: 4 }}>
                        <CountrySelect
                          value={site.countryCode}
                          onChange={(v) => updateManufacturerSite(i, { countryCode: v })}
                          options={countries}
                          ariaLabel={`Country for site ${i + 1}`}
                        />
                      </div>
                    </label>
                  </div>
                  <label>
                    Address
                    <input style={inputStyle} value={site.address} onChange={(e) => updateManufacturerSite(i, { address: e.target.value })} />
                  </label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <label style={{ fontSize: 13, color: "var(--u-ink)" }}>
                      <input
                        type="checkbox"
                        checked={site.isPrimary}
                        onChange={(e) => updateManufacturerSite(i, { isPrimary: e.target.checked })}
                      />{" "}
                      Primary site
                    </label>
                    <Button type="button" variant="secondary" onClick={() => removeManufacturerSite(i)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
            <ScopeOfSupplyField value={supplierScopeOfSupply} onToggle={(v) => toggleInList(supplierScopeOfSupply, v, setSupplierScopeOfSupply)} />
            <label>
              Scope of Services
              <textarea
                style={textareaStyle}
                value={supplierScopeOfServices}
                onChange={(e) => setSupplierScopeOfServices(e.target.value)}
                placeholder="Free text description of services this supplier provides, if any"
              />
            </label>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input
                type="checkbox"
                checked={supplierCodeOfConductAcknowledged}
                onChange={(e) => setSupplierCodeOfConductAcknowledged(e.target.checked)}
              />{" "}
              Supplier Code of Conduct acknowledged
            </label>
            {supplierCodeOfConductAcknowledged && (
              <label>
                Date Acknowledged
                <input
                  type="date"
                  style={inputStyle}
                  value={supplierCodeOfConductDate}
                  onChange={(e) => setSupplierCodeOfConductDate(e.target.value)}
                />
              </label>
            )}
          </RoleSection>
        )}

        {hasRole("FREIGHT_FORWARDER") && (
          <RoleSection title="Freight forwarder details">
            <div>
              <span style={{ display: "block", marginBottom: 6, fontSize: 13.5, color: "var(--u-ink)" }}>Modes of Transport</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {TRANSPORT_MODES.map((m) => (
                  <label key={m} style={{ fontSize: 13, color: "var(--u-ink)" }}>
                    <input
                      type="checkbox"
                      checked={modesOfTransport.includes(m)}
                      onChange={() => toggleInList(modesOfTransport, m, setModesOfTransport)}
                    />{" "}
                    {TRANSPORT_MODE_LABELS[m]}
                  </label>
                ))}
              </div>
            </div>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input type="checkbox" checked={iataDgrCertified} onChange={(e) => setIataDgrCertified(e.target.checked)} /> IATA
              Dangerous Goods Regulations certified
            </label>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input type="checkbox" checked={aeoAccredited} onChange={(e) => setAeoAccredited(e.target.checked)} /> Authorised
              Economic Operator (AEO) accredited
            </label>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input
                type="checkbox"
                checked={gdpTransportCapable}
                onChange={(e) => setGdpTransportCapable(e.target.checked)}
              />{" "}
              GDP-compliant (temperature-controlled) transport capable
            </label>
            <label style={{ fontSize: 13.5, color: "var(--u-ink)" }}>
              <input
                type="checkbox"
                checked={referencesProvided}
                onChange={(e) => setReferencesProvided(e.target.checked)}
              />{" "}
              References provided and checked
            </label>
          </RoleSection>
        )}

        {hasRole("WAREHOUSING") && (
          <RoleSection title="Warehousing details">
            <label>
              Wholesale Dealer's Authorisation (WDA) Number
              <input style={inputStyle} value={wdaNumber} onChange={(e) => setWdaNumber(e.target.value)} />
            </label>
            <label>
              Technical Agreement Reference
              <input style={inputStyle} value={technicalAgreementRef} onChange={(e) => setTechnicalAgreementRef(e.target.value)} />
            </label>
            <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Last GDP Audit Date
                <input type="date" style={inputStyle} value={gdpAuditDate} onChange={(e) => setGdpAuditDate(e.target.value)} />
              </label>
              <label>
                Next GDP Audit Due
                <input type="date" style={inputStyle} value={nextGdpAuditDue} onChange={(e) => setNextGdpAuditDue(e.target.value)} />
              </label>
            </div>
            <label>
              Monthly Reconciliation Contact
              <input
                style={inputStyle}
                value={monthlyReconciliationContact}
                onChange={(e) => setMonthlyReconciliationContact(e.target.value)}
                placeholder="Name/email this warehouse sends monthly stock reconciliations to"
              />
            </label>
          </RoleSection>
        )}

        {showVerificationPacket && (
          <RoleSection title="Company checks">
            <p style={{ margin: "0 0 10px", color: "var(--u-ink-secondary)", fontSize: 12.5 }}>
              From the standard supplier/manufacturer/freight forwarder verification checklist — add a check as you
              complete it. Pick "Other…" for a check not on the list.
            </p>
            {Object.entries(companyChecks).map(([checkType, row]) => {
              const label = ADD_CHECK_OPTIONS.find((o) => o.value === checkType)?.label ?? checkType;
              return (
                <div
                  key={checkType}
                  style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, marginBottom: 10 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{checkType === "OTHER" ? "Other check" : label}</span>
                    <Button type="button" variant="secondary" onClick={() => removeCompanyCheck(checkType)}>
                      Remove
                    </Button>
                  </div>
                  {checkType === "OTHER" && (
                    <label style={{ display: "block", marginBottom: 8 }}>
                      Check Name
                      <input
                        style={inputStyle}
                        placeholder="e.g. Export Licence Check"
                        value={row.customLabel}
                        onChange={(e) => updateCompanyCheck(checkType, { customLabel: e.target.value })}
                      />
                    </label>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 8 }}>
                    <label style={{ display: "block" }}>
                      <span>Result</span>
                      <div style={{ marginTop: 4 }}>
                        <Select
                          value={row.result}
                          onChange={(v) => updateCompanyCheck(checkType, { result: v })}
                          allLabel="Not checked"
                          ariaLabel={`${label} result`}
                          options={[
                            { value: "YES", label: "Yes" },
                            { value: "NO", label: "No" },
                            { value: "NOT_APPLICABLE", label: "N/A" },
                          ]}
                        />
                      </div>
                    </label>
                    <label>
                      Checked Date
                      <input
                        type="date"
                        style={inputStyle}
                        value={row.checkedDate}
                        onChange={(e) => updateCompanyCheck(checkType, { checkedDate: e.target.value })}
                      />
                    </label>
                    <label>
                      Reference / Source
                      <input
                        style={inputStyle}
                        value={row.referenceOrSource}
                        onChange={(e) => updateCompanyCheck(checkType, { referenceOrSource: e.target.value })}
                      />
                    </label>
                  </div>
                  <label style={{ display: "block", marginBottom: 10 }}>
                    Comment
                    <input
                      style={inputStyle}
                      value={row.comment}
                      onChange={(e) => updateCompanyCheck(checkType, { comment: e.target.value })}
                    />
                  </label>
                  {certifications.filter((c) => c.relatedCompanyCheckType === checkType).length > 0 && (
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--u-ink-secondary)" }}>
                      {certifications.filter((c) => c.relatedCompanyCheckType === checkType).length} document(s)
                      attached below in Documents &amp; Certifications.
                    </p>
                  )}
                  <Button type="button" variant="secondary" onClick={() => addCertification(checkType)}>
                    + Add Document for This Check
                  </Button>
                </div>
              );
            })}
            <label style={{ display: "block", maxWidth: 280 }}>
              <span>Add Check</span>
              <div style={{ marginTop: 4 }}>
                <Select
                  value={addCheckValue}
                  onChange={(v) => {
                    addCompanyCheck(v);
                    setAddCheckValue("");
                  }}
                  allLabel="+ Add Check"
                  ariaLabel="Add a company check"
                  options={ADD_CHECK_OPTIONS.filter((o) => !companyChecks[o.value]).map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
            </label>
          </RoleSection>
        )}

        {showVerificationPacket && (
          <RoleSection title="Documents & certifications">
            <p style={{ margin: "0 0 4px", color: "var(--u-ink-secondary)", fontSize: 12.5 }}>
              Add one row per certificate, registration or agreement — scoped to a specific manufacturing site
              and/or related to one of the Company Checks above where relevant, so they stay related and logged
              together.
            </p>
            {certifications.map((cert, i) => (
              <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 8 }}>
                  <label style={{ display: "block" }}>
                    <span>Document Type</span>
                    <div style={{ marginTop: 4 }}>
                      <Select
                        value={cert.type}
                        onChange={(v) => updateCertification(i, { type: v })}
                        allLabel="Select a type"
                        ariaLabel={`Document type ${i + 1}`}
                        options={CERTIFICATION_TYPES.map((t) => ({ value: t, label: CERTIFICATION_TYPE_LABELS[t] }))}
                      />
                    </div>
                  </label>
                  <label>
                    Reference Number
                    <input style={inputStyle} value={cert.referenceNumber} onChange={(e) => updateCertification(i, { referenceNumber: e.target.value })} />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 8 }}>
                  <label>
                    Revision
                    <input style={inputStyle} value={cert.revision} onChange={(e) => updateCertification(i, { revision: e.target.value })} />
                  </label>
                  <label>
                    Issued
                    <input type="date" style={inputStyle} value={cert.issuedDate} onChange={(e) => updateCertification(i, { issuedDate: e.target.value })} />
                  </label>
                  <label>
                    Expiry
                    <input type="date" style={inputStyle} value={cert.expiryDate} onChange={(e) => updateCertification(i, { expiryDate: e.target.value })} />
                  </label>
                </div>
                <label>
                  Issuing Body
                  <input style={inputStyle} value={cert.issuingBody} onChange={(e) => updateCertification(i, { issuingBody: e.target.value })} />
                </label>
                {hasRole("MANUFACTURER") && manufacturerSites.length > 0 && (
                  <label style={{ display: "block", marginTop: 8 }}>
                    <span>Manufacturing Site</span>
                    <div style={{ marginTop: 4 }}>
                      <Select
                        value={cert.manufacturerSiteIndex}
                        onChange={(v) => updateCertification(i, { manufacturerSiteIndex: v })}
                        allLabel="Company-wide (not site-specific)"
                        ariaLabel={`Manufacturing site for document ${i + 1}`}
                        options={manufacturerSites.map((s, idx) => ({ value: String(idx), label: s.siteName || `Site ${idx + 1}` }))}
                      />
                    </div>
                  </label>
                )}
                {Object.keys(companyChecks).length > 0 && (
                  <label style={{ display: "block", marginTop: 8 }}>
                    <span>Related Check</span>
                    <div style={{ marginTop: 4 }}>
                      <Select
                        value={cert.relatedCompanyCheckType}
                        onChange={(v) => updateCertification(i, { relatedCompanyCheckType: v })}
                        allLabel="Not related to a specific check"
                        ariaLabel={`Related company check for document ${i + 1}`}
                        options={Object.keys(companyChecks).map((checkType) => ({
                          value: checkType,
                          label:
                            checkType === "OTHER"
                              ? companyChecks[checkType].customLabel || "Other check"
                              : ADD_CHECK_OPTIONS.find((o) => o.value === checkType)?.label ?? checkType,
                        }))}
                      />
                    </div>
                  </label>
                )}
                <label style={{ display: "block", marginTop: 8 }}>
                  Notes
                  <textarea style={textareaStyle} value={cert.notes} onChange={(e) => updateCertification(i, { notes: e.target.value })} />
                </label>
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <Button type="button" variant="secondary" onClick={() => removeCertification(i)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => addCertification()} style={{ alignSelf: "flex-start" }}>
              + Add Document
            </Button>
          </RoleSection>
        )}

        {error && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}

        <Button type="submit" variant="primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create Stakeholder"}
        </Button>
      </form>

      {lightboxEntryId && (
        <RegistryLightbox
          loading={lightboxLoading}
          detail={lightboxDetail}
          products={lightboxProducts}
          onClose={closeLightbox}
          onAdd={(match) => linkToRegistryMatch(match)}
        />
      )}
    </main>
  );
}

function ScopeOfSupplyField({ value, onToggle }: { value: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <span style={{ display: "block", marginBottom: 6, fontSize: 13.5, color: "var(--u-ink)" }}>Scope of Supply</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {SCOPE_OF_SUPPLY_OPTIONS.map((o) => (
          <label key={o} style={{ fontSize: 13, color: "var(--u-ink)" }}>
            <input type="checkbox" checked={value.includes(o)} onChange={() => onToggle(o)} /> {SCOPE_OF_SUPPLY_LABELS[o]}
          </label>
        ))}
      </div>
    </div>
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

const linkButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--u-org-accent, var(--u-brand-violet))",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
  whiteSpace: "nowrap",
};

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

/**
 * The duplicate-prevention lightbox — see
 * claude/sop-driven-quality-roadmap.md Section C. Shows only the
 * deliberately thin, always-safe registry fields plus (when the entry is
 * linked to a published Universe organisation) that organisation's own
 * self-published profile and product catalogue — never anything from
 * another tenant's own private Partner record. A simple inline overlay
 * rather than a shared Modal component for now (no shared Modal exists yet
 * in @universe/ui) — worth promoting into one if a second app needs the
 * same pattern.
 */
function RegistryLightbox({
  loading,
  detail,
  products,
  onClose,
  onAdd,
}: {
  loading: boolean;
  detail: StakeholderRegistryDetail | null;
  products: StakeholderRegistryProduct[];
  onClose: () => void;
  onAdd: (match: StakeholderRegistryMatch) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 20, 30, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--u-surface-raised, #fff)",
          borderRadius: "var(--u-radius-md)",
          padding: 24,
          maxWidth: 480,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}

        {!loading && !detail && <p style={{ color: "var(--u-ink-secondary)" }}>Record not found.</p>}

        {!loading && detail && (
          <>
            <h2 style={{ fontFamily: "var(--u-font-display)", fontSize: 18, margin: "0 0 4px" }}>{detail.legalName}</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--u-ink-secondary)" }}>
              {detail.stakeholderTypes.join(", ")}
              {detail.isLinkedToPublishedOrganization ? " · Registered on Universe" : " · Added by another organisation on Universe"}
            </p>

            <dl style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--u-ink)" }}>
              {detail.countryCode && (
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <dt style={{ fontWeight: 600, width: 120 }}>Country</dt>
                  <dd style={{ margin: 0 }}>{detail.countryCode}</dd>
                </div>
              )}
              {detail.website && (
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <dt style={{ fontWeight: 600, width: 120 }}>Website</dt>
                  <dd style={{ margin: 0 }}>{detail.website}</dd>
                </div>
              )}
              {detail.registrationNumber && (
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <dt style={{ fontWeight: 600, width: 120 }}>Registration No.</dt>
                  <dd style={{ margin: 0 }}>{detail.registrationNumber}</dd>
                </div>
              )}
              {detail.countryPresence.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <dt style={{ fontWeight: 600, width: 120 }}>Operates in</dt>
                  <dd style={{ margin: 0 }}>{detail.countryPresence.join(", ")}</dd>
                </div>
              )}
            </dl>

            {detail.manufacturerProfile && (
              <div style={{ marginBottom: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>
                {detail.manufacturerProfile.whoPrequalified && <p style={{ margin: "0 0 4px" }}>WHO Prequalified</p>}
                {detail.manufacturerProfile.isLocalManufacturer && <p style={{ margin: "0 0 4px" }}>Local manufacturer</p>}
              </div>
            )}

            {products.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 13.5, margin: "0 0 8px" }}>Products published by this organisation</h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {products.map((p) => (
                    <li key={p.id}>
                      {p.name}
                      {p.category ? ` — ${p.category}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  onAdd({
                    id: detail.id,
                    legalName: detail.legalName,
                    countryCode: detail.countryCode,
                    website: detail.website,
                    registrationNumber: detail.registrationNumber,
                    stakeholderTypes: detail.stakeholderTypes,
                    isKnownToUniverse: detail.isKnownToUniverse,
                    linkedOrganizationName: detail.linkedOrganizationName,
                    isLinkedToPublishedOrganization: detail.isLinkedToPublishedOrganization,
                  })
                }
              >
                Add this stakeholder
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
