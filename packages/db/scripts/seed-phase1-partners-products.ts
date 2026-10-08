/**
 * Phase 1 of the comprehensive demo-data build (2026-10-08) — see the
 * demo-data build plan in the Claude project for full context. Seeds:
 *   1. A moderate-volume partner roster (~12 roles across ~11 companies)
 *      covering every PartnerRole.roleType — manufacturers, suppliers,
 *      freight forwarders, warehousing, and clients — each with its
 *      role-specific detail table, certifications, a financial detail
 *      row, and contacts, so every "guise" of the Partner model has real
 *      rows behind it, not just the bare Partner row.
 *   2. A StakeholderRegistryEntry for each partner (the shared,
 *      cross-tenant identity registry Partner.registryEntryId links to).
 *   3. ~35 new ProductMaster entries (the shared, non-tenant-scoped
 *      commodity catalog) spanning PPE, consumables, devices,
 *      pharmaceuticals, laboratory, and equipment — additive to the 7
 *      pre-existing pilot-smoke-test entries, not replacing them.
 *
 * All company/contact names, registration numbers, and websites
 * (*.example.com — IANA-reserved for exactly this purpose) are entirely
 * fictional, built for demonstrating the platform itself, not representing
 * any real organisation.
 *
 * Idempotent by name: re-running skips any Partner/ProductMaster that
 * already exists with the same (organizationId, normalizedName) /
 * (name, category) pair, so it's safe to re-run after a partial failure.
 *
 * Usage (from packages/db), against the org created by
 * provision-universe-demo.ts:
 *   npx tsx scripts/seed-phase1-partners-products.ts
 */
import { prisma, withTenantContext, withPlatformStaffContext } from "../src/index";

const ORG_NAME = "Universe Demo";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|limited|gmbh|inc|co|sa|plc|llc|srl|pty)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Partner roster
// ---------------------------------------------------------------------------

interface ManufacturerSiteDef {
  siteName: string;
  countryCode: string;
  address: string;
  isPrimary: boolean;
  certs: CertDef[];
}

interface CertDef {
  type: string; // PartnerCertification.type allowed values
  referenceNumber: string;
  issuingBody: string;
  issuedDate: string; // ISO date
  expiryDate: string | null;
  verified: boolean;
}

interface ContactDef {
  name: string;
  email: string;
  phone: string;
  title: string;
}

interface PartnerDef {
  name: string;
  countryCode: string;
  website: string;
  approvalStatus: "APPROVED" | "PENDING" | "REMOVED";
  riskTier: "HIGH" | "MEDIUM" | "LOW";
  companyRegistrationNumber: string;
  vatNumber: string;
  roles: ("CLIENT" | "MANUFACTURER" | "SUPPLIER" | "FREIGHT_FORWARDER" | "WAREHOUSING")[];
  stakeholderTypes: string[]; // for the registry entry — usually == roles
  contacts: ContactDef[];
  finance?: { bankName: string; accountHolderName: string; currencyCode: string; swiftBic: string };
  manufacturer?: {
    partNumberConvention: string;
    countryOfManufactureCode: string;
    scopeOfSupply: string;
    sites: ManufacturerSiteDef[];
  };
  supplier?: {
    supplierCode: string;
    productCategory: string;
    scopeOfSupply: string;
    codeOfConductAcknowledged: boolean;
    certs: CertDef[];
  };
  freightForwarder?: {
    modesOfTransport: string;
    iataDgrCertified: boolean;
    aeoAccredited: boolean;
    gdpTransportCapable: boolean;
    referencesProvided: boolean;
    certs: CertDef[];
  };
  warehousing?: {
    wdaNumber: string;
    technicalAgreementRef: string;
    gdpAuditDate: string;
    nextGdpAuditDue: string;
    monthlyReconciliationContact: string;
    certs: CertDef[];
  };
  client?: {
    billingCity: string;
    billingCountryCode: string;
    deliveryCity: string;
    deliveryCountryCode: string;
    paymentTerms: string;
    isPharmaApprovedCustomer: boolean;
    approvedCustomerLogRef?: string;
  };
}

const PARTNERS: PartnerDef[] = [
  {
    name: "Apex MedTech Manufacturing Ltd",
    countryCode: "IN",
    website: "apexmedtech.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "U24230MH2012PTC234567",
    vatNumber: "27AAFCA1234K1Z5",
    roles: ["MANUFACTURER"],
    stakeholderTypes: ["MANUFACTURER"],
    contacts: [
      { name: "Priya Nair", email: "priya.nair@apexmedtech.example.com", phone: "+91 22 4567 8901", title: "Head of Quality Assurance" },
      { name: "Rohan Kapoor", email: "rohan.kapoor@apexmedtech.example.com", phone: "+91 22 4567 8902", title: "Export Sales Manager" },
    ],
    finance: { bankName: "HDFC Bank", accountHolderName: "Apex MedTech Manufacturing Ltd", currencyCode: "INR", swiftBic: "HDFCINBB" },
    manufacturer: {
      partNumberConvention: "AMX-[category]-[size]-### (e.g. AMX-SYR-10ML-001)",
      countryOfManufactureCode: "IN",
      scopeOfSupply: "DEVICES,CONSUMABLES",
      sites: [
        {
          siteName: "Apex MedTech — Taloja Facility",
          countryCode: "IN",
          address: "Plot 14, MIDC Industrial Area, Taloja, Maharashtra 410208, India",
          isPrimary: true,
          certs: [
            { type: "ISO_13485", referenceNumber: "IN-13485-2024-0417", issuingBody: "TÜV SÜD", issuedDate: "2024-03-10", expiryDate: "2027-03-09", verified: true },
            { type: "GMP", referenceNumber: "GMP-MH-2023-1182", issuingBody: "CDSCO (Maharashtra FDA)", issuedDate: "2023-11-01", expiryDate: "2026-10-31", verified: true },
          ],
        },
        {
          siteName: "Apex MedTech — Hyderabad Annex",
          countryCode: "IN",
          address: "Unit 7, Genome Valley, Hyderabad, Telangana 500078, India",
          isPrimary: false,
          certs: [
            { type: "ISO_13485", referenceNumber: "IN-13485-2024-0418", issuingBody: "TÜV SÜD", issuedDate: "2024-05-22", expiryDate: "2027-05-21", verified: true },
          ],
        },
      ],
    },
  },
  {
    name: "Rhein Pharma Produktion GmbH",
    countryCode: "DE",
    website: "rheinpharma.example.com",
    approvalStatus: "APPROVED",
    riskTier: "HIGH",
    companyRegistrationNumber: "HRB 118342 (Amtsgericht Köln)",
    vatNumber: "DE261334589",
    roles: ["MANUFACTURER", "SUPPLIER"],
    stakeholderTypes: ["MANUFACTURER", "SUPPLIER"],
    contacts: [
      { name: "Lukas Hoffmann", email: "lukas.hoffmann@rheinpharma.example.com", phone: "+49 221 789 0145", title: "Regulatory Affairs Director" },
      { name: "Sabine Krüger", email: "sabine.krueger@rheinpharma.example.com", phone: "+49 221 789 0146", title: "International Supply Coordinator" },
    ],
    finance: { bankName: "Deutsche Bank", accountHolderName: "Rhein Pharma Produktion GmbH", currencyCode: "EUR", swiftBic: "DEUTDEFF" },
    manufacturer: {
      partNumberConvention: "RP-[ATC code]-[strength]-[pack size]",
      countryOfManufactureCode: "DE",
      scopeOfSupply: "PHARMACEUTICALS",
      sites: [
        {
          siteName: "Rhein Pharma — Köln-Ehrenfeld Plant",
          countryCode: "DE",
          address: "Vogelsanger Str. 220, 50825 Köln, Germany",
          isPrimary: true,
          certs: [
            { type: "GMP", referenceNumber: "DE-GMP-2024-5591", issuingBody: "Bezirksregierung Köln", issuedDate: "2024-01-15", expiryDate: "2027-01-14", verified: true },
            { type: "ISO_9001", referenceNumber: "DE-9001-2023-0847", issuingBody: "TÜV Rheinland", issuedDate: "2023-09-01", expiryDate: "2026-08-31", verified: true },
          ],
        },
      ],
    },
    supplier: {
      supplierCode: "SUP-RP-001",
      productCategory: "PHARMACEUTICALS",
      scopeOfSupply: "PHARMACEUTICALS",
      codeOfConductAcknowledged: true,
      certs: [
        { type: "GDP", referenceNumber: "DE-GDP-2024-0912", issuingBody: "Bezirksregierung Köln", issuedDate: "2024-02-01", expiryDate: "2027-01-31", verified: true },
      ],
    },
  },
  {
    name: "Guangzhou Sterile Devices Co.",
    countryCode: "CN",
    website: "gzsterile.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "91440101MA5XWQJ7X9",
    vatNumber: "91440101MA5XWQJ7X9",
    roles: ["MANUFACTURER"],
    stakeholderTypes: ["MANUFACTURER"],
    contacts: [
      { name: "Wei Zhang", email: "wei.zhang@gzsterile.example.com", phone: "+86 20 3822 1190", title: "Export Compliance Manager" },
    ],
    finance: { bankName: "Bank of China", accountHolderName: "Guangzhou Sterile Devices Co.", currencyCode: "CNY", swiftBic: "BKCHCNBJ" },
    manufacturer: {
      partNumberConvention: "GSD-[product line]-###",
      countryOfManufactureCode: "CN",
      scopeOfSupply: "CONSUMABLES,DEVICES",
      sites: [
        {
          siteName: "Guangzhou Sterile Devices — Panyu Plant",
          countryCode: "CN",
          address: "No. 88 Shiji Rd, Panyu District, Guangzhou 511400, China",
          isPrimary: true,
          certs: [
            { type: "ISO_13485", referenceNumber: "CN-13485-2023-7741", issuingBody: "SGS", issuedDate: "2023-06-12", expiryDate: "2026-06-11", verified: true },
            { type: "FDA_REGISTRATION", referenceNumber: "FDA-REG-3014872", issuingBody: "US FDA", issuedDate: "2023-01-10", expiryDate: null, verified: false },
          ],
        },
      ],
    },
  },
  {
    name: "MedSource Global Supplies Inc.",
    countryCode: "US",
    website: "medsourceglobal.example.com",
    approvalStatus: "APPROVED",
    riskTier: "LOW",
    companyRegistrationNumber: "DE-EIN-47-3821156",
    vatNumber: "N/A (US — EIN used)",
    roles: ["SUPPLIER"],
    stakeholderTypes: ["SUPPLIER"],
    contacts: [
      { name: "Jennifer Osei", email: "jennifer.osei@medsourceglobal.example.com", phone: "+1 302 555 0148", title: "VP International Sales" },
      { name: "Marcus Webb", email: "marcus.webb@medsourceglobal.example.com", phone: "+1 302 555 0149", title: "Account Manager" },
    ],
    finance: { bankName: "Wells Fargo", accountHolderName: "MedSource Global Supplies Inc.", currencyCode: "USD", swiftBic: "WFBIUS6S" },
    supplier: {
      supplierCode: "SUP-MSG-002",
      productCategory: "CONSUMABLES",
      scopeOfSupply: "CONSUMABLES,DEVICES,EQUIPMENT",
      codeOfConductAcknowledged: true,
      certs: [
        { type: "ISO_9001", referenceNumber: "US-9001-2024-2210", issuingBody: "BSI", issuedDate: "2024-04-01", expiryDate: "2027-03-31", verified: true },
      ],
    },
  },
  {
    name: "Horizon Health Procurement Ltd",
    countryCode: "GB",
    website: "horizonhealthprocurement.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "Company No. 08451273",
    vatNumber: "GB204581739",
    roles: ["SUPPLIER"],
    stakeholderTypes: ["SUPPLIER"],
    contacts: [
      { name: "Olivia Bennett", email: "olivia.bennett@horizonhealthprocurement.example.com", phone: "+44 20 7946 0891", title: "Head of Procurement" },
    ],
    finance: { bankName: "Barclays", accountHolderName: "Horizon Health Procurement Ltd", currencyCode: "GBP", swiftBic: "BARCGB22" },
    supplier: {
      supplierCode: "SUP-HHP-003",
      productCategory: "PHARMACEUTICALS",
      scopeOfSupply: "PHARMACEUTICALS,LABORATORY",
      codeOfConductAcknowledged: true,
      certs: [
        { type: "GDP", referenceNumber: "GB-GDP-2024-5587", issuingBody: "MHRA", issuedDate: "2024-02-15", expiryDate: "2027-02-14", verified: true },
      ],
    },
  },
  {
    name: "SkyBridge Freight & Logistics Ltd",
    countryCode: "GB",
    website: "skybridgefreight.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "Company No. 05129384",
    vatNumber: "GB873215609",
    roles: ["FREIGHT_FORWARDER"],
    stakeholderTypes: ["FREIGHT_FORWARDER"],
    contacts: [
      { name: "James Okafor", email: "james.okafor@skybridgefreight.example.com", phone: "+44 161 820 3344", title: "Director of Operations" },
    ],
    finance: { bankName: "HSBC", accountHolderName: "SkyBridge Freight & Logistics Ltd", currencyCode: "GBP", swiftBic: "MIDLGB22" },
    freightForwarder: {
      modesOfTransport: "AIR,SEA",
      iataDgrCertified: true,
      aeoAccredited: true,
      gdpTransportCapable: true,
      referencesProvided: true,
      certs: [
        { type: "WDA", referenceNumber: "GB-WDA-2024-1123", issuingBody: "MHRA", issuedDate: "2024-01-20", expiryDate: "2027-01-19", verified: true },
      ],
    },
  },
  {
    name: "Meridian Cargo Solutions SA",
    countryCode: "CH",
    website: "meridiancargo.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "CHE-187.432.901",
    vatNumber: "CHE-187.432.901 MWST",
    roles: ["FREIGHT_FORWARDER"],
    stakeholderTypes: ["FREIGHT_FORWARDER"],
    contacts: [
      { name: "Nadine Roux", email: "nadine.roux@meridiancargo.example.com", phone: "+41 22 715 6032", title: "Head of Pharma Logistics" },
    ],
    finance: { bankName: "UBS", accountHolderName: "Meridian Cargo Solutions SA", currencyCode: "CHF", swiftBic: "UBSWCHZH" },
    freightForwarder: {
      modesOfTransport: "AIR,SEA,LAND",
      iataDgrCertified: true,
      aeoAccredited: true,
      gdpTransportCapable: true,
      referencesProvided: true,
      certs: [
        { type: "GDP", referenceNumber: "CH-GDP-2023-6602", issuingBody: "Swissmedic", issuedDate: "2023-10-05", expiryDate: "2026-10-04", verified: true },
      ],
    },
  },
  {
    name: "Coldline Storage & Distribution Ltd",
    countryCode: "NL",
    website: "coldlinestorage.example.com",
    approvalStatus: "APPROVED",
    riskTier: "MEDIUM",
    companyRegistrationNumber: "KVK 34187654",
    vatNumber: "NL812345678B01",
    roles: ["WAREHOUSING"],
    stakeholderTypes: ["WAREHOUSING"],
    contacts: [
      { name: "Daan Visser", email: "daan.visser@coldlinestorage.example.com", phone: "+31 10 266 4471", title: "Warehouse Operations Manager" },
    ],
    finance: { bankName: "ING Bank", accountHolderName: "Coldline Storage & Distribution Ltd", currencyCode: "EUR", swiftBic: "INGBNL2A" },
    warehousing: {
      wdaNumber: "NL-WDA-2024-0398",
      technicalAgreementRef: "TA-COLDLINE-2024-01",
      gdpAuditDate: "2024-06-01",
      nextGdpAuditDue: "2025-06-01",
      monthlyReconciliationContact: "Daan Visser",
      certs: [
        { type: "GDP", referenceNumber: "NL-GDP-2024-0398", issuingBody: "IGJ (Dutch Health Care Inspectorate)", issuedDate: "2024-06-01", expiryDate: "2027-05-31", verified: true },
      ],
    },
  },
  {
    name: "National Medical Procurement Agency",
    countryCode: "KE",
    website: "nmpa-demo.example.com",
    approvalStatus: "APPROVED",
    riskTier: "LOW",
    companyRegistrationNumber: "GOV-KE-NMPA-001",
    vatNumber: "N/A (government entity)",
    roles: ["CLIENT"],
    stakeholderTypes: ["CLIENT"],
    contacts: [
      { name: "Grace Wanjiru", email: "grace.wanjiru@nmpa-demo.example.com", phone: "+254 20 271 3345", title: "Director of Procurement" },
    ],
    client: {
      billingCity: "Nairobi",
      billingCountryCode: "KE",
      deliveryCity: "Nairobi",
      deliveryCountryCode: "KE",
      paymentTerms: "Net 45",
      isPharmaApprovedCustomer: true,
      approvedCustomerLogRef: "ACL-KE-2024-0021",
    },
  },
  {
    name: "Horn of Africa Relief Consortium",
    countryCode: "ET",
    website: "hoarelief.example.com",
    approvalStatus: "APPROVED",
    riskTier: "LOW",
    companyRegistrationNumber: "NGO-ET-2019-00457",
    vatNumber: "N/A (registered NGO)",
    roles: ["CLIENT"],
    stakeholderTypes: ["CLIENT"],
    contacts: [
      { name: "Dawit Bekele", email: "dawit.bekele@hoarelief.example.com", phone: "+251 11 662 7390", title: "Logistics & Supply Director" },
    ],
    client: {
      billingCity: "Addis Ababa",
      billingCountryCode: "ET",
      deliveryCity: "Addis Ababa",
      deliveryCountryCode: "ET",
      paymentTerms: "Net 30",
      isPharmaApprovedCustomer: true,
      approvedCustomerLogRef: "ACL-ET-2023-0109",
    },
  },
  {
    name: "Community Health Access Foundation",
    countryCode: "UG",
    website: "chaf-demo.example.com",
    approvalStatus: "APPROVED",
    riskTier: "LOW",
    companyRegistrationNumber: "NGO-UG-2017-01823",
    vatNumber: "N/A (registered NGO)",
    roles: ["CLIENT"],
    stakeholderTypes: ["CLIENT"],
    contacts: [
      { name: "Patricia Namatovu", email: "patricia.namatovu@chaf-demo.example.com", phone: "+256 41 425 6618", title: "Programme Director" },
    ],
    client: {
      billingCity: "Kampala",
      billingCountryCode: "UG",
      deliveryCity: "Kampala",
      deliveryCountryCode: "UG",
      paymentTerms: "Net 30",
      isPharmaApprovedCustomer: false,
    },
  },
  {
    name: "Pacific Islands Health Alliance",
    countryCode: "FJ",
    website: "pihalliance.example.com",
    approvalStatus: "PENDING",
    riskTier: "LOW",
    companyRegistrationNumber: "NGO-FJ-2021-00076",
    vatNumber: "N/A (registered NGO)",
    roles: ["CLIENT"],
    stakeholderTypes: ["CLIENT"],
    contacts: [
      { name: "Litia Tuilagi", email: "litia.tuilagi@pihalliance.example.com", phone: "+679 331 8820", title: "Procurement Coordinator" },
    ],
    client: {
      billingCity: "Suva",
      billingCountryCode: "FJ",
      deliveryCity: "Suva",
      deliveryCountryCode: "FJ",
      paymentTerms: "Net 30",
      isPharmaApprovedCustomer: false,
    },
  },
];

// ---------------------------------------------------------------------------
// Shared product catalog additions (ProductMaster — NOT tenant-scoped)
// ---------------------------------------------------------------------------

interface ProductMasterDef {
  name: string;
  category: string; // hierarchical "Group.Subgroup" path
  hsCode?: string;
  unspscCode?: string;
  gtin?: string;
  standardUnit?: string;
  sourceStandard: "WHO_EML" | "HS_CODE" | "UNSPSC" | "GS1_GTIN" | "INTERNAL";
  expectedQualityDocumentation?: string;
}

const PRODUCT_MASTER_ENTRIES: ProductMasterDef[] = [
  // PPE
  { name: "Surgical Face Mask, Type IIR, 3-ply, box of 50", category: "Personal Protective Equipment.Masks", hsCode: "6307.90", standardUnit: "box of 50", sourceStandard: "HS_CODE" },
  { name: "N95 Respirator Mask, NIOSH-approved", category: "Personal Protective Equipment.Masks", hsCode: "6307.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Disposable Isolation Gown, Level 2, non-sterile", category: "Personal Protective Equipment.Gowns", hsCode: "6210.10", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Face Shield, full-length, reusable", category: "Personal Protective Equipment.Eye & Face Protection", hsCode: "9004.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Nitrile Examination Gloves, Powder-Free, box of 100", category: "Personal Protective Equipment.Gloves", hsCode: "4015.19", standardUnit: "box of 100", sourceStandard: "HS_CODE" },
  // Consumables
  { name: "Syringe, 5ml, Luer Lock, disposable, sterile", category: "Consumables.Syringes & Needles", hsCode: "9018.31", standardUnit: "each", sourceStandard: "HS_CODE", expectedQualityDocumentation: "CE Mark / ISO 13485 Declaration of Conformity" },
  { name: "IV Administration Set, 20 drops/ml, with Y-site, sterile", category: "Consumables.IV Therapy", hsCode: "9018.39", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Gauze Swabs, 10x10cm, sterile, pack of 5", category: "Consumables.Wound Care", hsCode: "3005.90", standardUnit: "pack of 5", sourceStandard: "HS_CODE" },
  { name: "Adhesive Wound Dressing, 10x15cm, sterile", category: "Consumables.Wound Care", hsCode: "3005.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Cryovial, 2ml, self-standing, polypropylene, sterile", category: "Laboratory.Sample Storage", gtin: "5012345678900", standardUnit: "each", sourceStandard: "GS1_GTIN" },
  { name: "Blood Collection Tube, EDTA, 4ml, vacuum", category: "Laboratory.Sample Collection", hsCode: "9018.39", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Urine Specimen Container, 60ml, sterile, with lid", category: "Laboratory.Sample Collection", hsCode: "3926.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  // Devices
  { name: "Digital Thermometer, non-contact infrared", category: "Medical Devices.Diagnostic Equipment", hsCode: "9025.19", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Pulse Oximeter, fingertip, digital display", category: "Medical Devices.Diagnostic Equipment", hsCode: "9018.19", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Digital Blood Pressure Monitor, upper arm, automatic", category: "Medical Devices.Diagnostic Equipment", hsCode: "9018.19", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Surgical Scalpel, disposable, sterile, No. 22 blade", category: "Medical Devices.Surgical Instruments", hsCode: "9018.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Suture Kit, non-absorbable, 3-0, with needle", category: "Medical Devices.Surgical Instruments", hsCode: "3006.10", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Portable Ultrasound Scanner, handheld, battery-powered", category: "Medical Devices.Imaging Equipment", hsCode: "9018.12", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Rapid Diagnostic Test Kit — Malaria (RDT), box of 25", category: "Medical Devices.Diagnostic Test Kits", hsCode: "3822.00", standardUnit: "box of 25", sourceStandard: "HS_CODE", expectedQualityDocumentation: "WHO Prequalification listing reference" },
  { name: "Rapid Diagnostic Test Kit — HIV (RDT), box of 30", category: "Medical Devices.Diagnostic Test Kits", hsCode: "3822.00", standardUnit: "box of 30", sourceStandard: "HS_CODE" },
  // Pharmaceuticals (WHO EML-aligned)
  { name: "Amoxicillin 500mg Capsules, blister pack of 100", category: "Pharmaceuticals.Antibiotics", unspscCode: "51191501", standardUnit: "pack of 100", sourceStandard: "WHO_EML" },
  { name: "Artemether/Lumefantrine 20mg/120mg Tablets, pack of 24", category: "Pharmaceuticals.Antimalarials", unspscCode: "51202301", standardUnit: "pack of 24", sourceStandard: "WHO_EML" },
  { name: "Oral Rehydration Salts (ORS), sachet, WHO formula", category: "Pharmaceuticals.Essential Medicines", unspscCode: "51181701", standardUnit: "sachet", sourceStandard: "WHO_EML" },
  { name: "Paracetamol 500mg Tablets, blister pack of 100", category: "Pharmaceuticals.Analgesics", unspscCode: "51241701", standardUnit: "pack of 100", sourceStandard: "WHO_EML" },
  { name: "Ceftriaxone 1g Powder for Injection, vial", category: "Pharmaceuticals.Antibiotics", unspscCode: "51191501", standardUnit: "vial", sourceStandard: "WHO_EML" },
  { name: "Oxytocin 10 IU/ml Injection, ampoule", category: "Pharmaceuticals.Maternal Health", unspscCode: "51142301", standardUnit: "ampoule", sourceStandard: "WHO_EML" },
  { name: "Tetanus Toxoid Vaccine, multi-dose vial", category: "Pharmaceuticals.Vaccines", unspscCode: "51141612", standardUnit: "vial", sourceStandard: "WHO_EML" },
  { name: "Insulin (Human) 100 IU/ml Injection, vial", category: "Pharmaceuticals.Endocrine", unspscCode: "51142206", standardUnit: "vial", sourceStandard: "WHO_EML" },
  // Equipment
  { name: "Vaccine Carrier, cold-chain, 4x 0.3L ice packs", category: "Equipment.Cold Chain", hsCode: "8418.69", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Solar-Powered Vaccine Refrigerator, 60L", category: "Equipment.Cold Chain", hsCode: "8418.69", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Autoclave, benchtop, 24L, steam sterilizer", category: "Equipment.Sterilization", hsCode: "8419.20", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Hospital Bed, manual, 3-function, with mattress", category: "Equipment.Patient Care", hsCode: "9402.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Wheelchair, folding, standard adult", category: "Equipment.Mobility Aids", hsCode: "8713.10", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Oxygen Concentrator, 5L/min, portable", category: "Equipment.Respiratory Care", hsCode: "9019.20", standardUnit: "each", sourceStandard: "HS_CODE" },
  // Laboratory reagents
  { name: "Malaria Microscopy Stain Kit (Giemsa), 500ml", category: "Laboratory.Reagents", hsCode: "3822.00", standardUnit: "kit", sourceStandard: "HS_CODE" },
  { name: "HbA1c Test Reagent Cartridge, box of 10", category: "Laboratory.Reagents", hsCode: "3822.00", standardUnit: "box of 10", sourceStandard: "HS_CODE" },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function seedProductMaster() {
  await withPlatformStaffContext(async (tx) => {
    let created = 0;
    let skipped = 0;
    for (const def of PRODUCT_MASTER_ENTRIES) {
      const existing = await tx.productMaster.findFirst({ where: { name: def.name, category: def.category } });
      if (existing) {
        skipped++;
        continue;
      }
      await tx.productMaster.create({
        data: {
          name: def.name,
          category: def.category,
          hsCode: def.hsCode ?? null,
          unspscCode: def.unspscCode ?? null,
          gtin: def.gtin ?? null,
          standardUnit: def.standardUnit ?? null,
          sourceStandard: def.sourceStandard,
          expectedQualityDocumentation: def.expectedQualityDocumentation ?? null,
        },
      });
      created++;
    }
    console.log(`ProductMaster: created ${created}, skipped ${skipped} (already present).`);
  });
}

async function seedPartners(orgId: string) {
  await withTenantContext(orgId, async (tx) => {
    let created = 0;
    let skipped = 0;

    for (const def of PARTNERS) {
      const normalizedName = normalize(def.name);
      const existing = await tx.partner.findFirst({ where: { organizationId: orgId, normalizedName } });
      if (existing) {
        skipped++;
        continue;
      }

      // 1. Shared registry entry (not tenant-scoped, but written inside this
      // tenant-context transaction is fine — it's a plain insert with no
      // RLS predicate on it either way).
      const registryEntry = await tx.stakeholderRegistryEntry.create({
        data: {
          normalizedName,
          legalName: def.name,
          countryCode: def.countryCode,
          website: def.website,
          registrationNumber: def.companyRegistrationNumber,
          vatNumber: def.vatNumber,
          stakeholderTypes: JSON.stringify(def.stakeholderTypes),
        },
      });

      // 2. The Partner row itself.
      const partner = await tx.partner.create({
        data: {
          organizationId: orgId,
          name: def.name,
          normalizedName,
          countryCode: def.countryCode,
          website: def.website,
          approvalStatus: def.approvalStatus,
          riskTier: def.riskTier,
          companyRegistrationNumber: def.companyRegistrationNumber,
          vatNumber: def.vatNumber,
          registryEntryId: registryEntry.id,
          lastApprovalReviewDate: def.approvalStatus === "APPROVED" ? new Date("2026-06-01") : null,
          nextApprovalReviewDue: def.approvalStatus === "APPROVED" ? new Date("2027-06-01") : null,
        },
      });

      // 3. Roles.
      for (const roleType of def.roles) {
        await tx.partnerRole.create({ data: { partnerId: partner.id, roleType, isActive: true } });
      }

      // 4. Contacts.
      for (const c of def.contacts) {
        await tx.contact.create({
          data: { organizationId: orgId, partnerId: partner.id, name: c.name, email: c.email, phone: c.phone, title: c.title },
        });
      }

      // 5. Financial detail (standard for every role per schema doc comment).
      if (def.finance) {
        await tx.partnerFinancialDetail.create({
          data: {
            partnerId: partner.id,
            bankName: def.finance.bankName,
            accountHolderName: def.finance.accountHolderName,
            currencyCode: def.finance.currencyCode,
            swiftBic: def.finance.swiftBic,
          },
        });
      }

      // 6. Role-specific detail + certifications.
      const allCerts: { certs: CertDef[]; manufacturerSiteId?: string }[] = [];

      if (def.manufacturer) {
        await tx.manufacturerDetail.create({
          data: {
            partnerId: partner.id,
            partNumberConvention: def.manufacturer.partNumberConvention,
            countryOfManufactureCode: def.manufacturer.countryOfManufactureCode,
            scopeOfSupply: def.manufacturer.scopeOfSupply,
          },
        });
        for (const site of def.manufacturer.sites) {
          const createdSite = await tx.manufacturerSite.create({
            data: {
              partnerId: partner.id,
              siteName: site.siteName,
              countryCode: site.countryCode,
              address: site.address,
              isPrimary: site.isPrimary,
            },
          });
          allCerts.push({ certs: site.certs, manufacturerSiteId: createdSite.id });
        }
      }

      if (def.supplier) {
        await tx.supplierDetail.create({
          data: {
            partnerId: partner.id,
            supplierCode: def.supplier.supplierCode,
            productCategory: def.supplier.productCategory,
            scopeOfSupply: def.supplier.scopeOfSupply,
            codeOfConductAcknowledged: def.supplier.codeOfConductAcknowledged,
            codeOfConductAcknowledgedDate: def.supplier.codeOfConductAcknowledged ? new Date("2026-01-15") : null,
          },
        });
        allCerts.push({ certs: def.supplier.certs });
      }

      if (def.freightForwarder) {
        await tx.freightForwarderDetail.create({
          data: {
            partnerId: partner.id,
            modesOfTransport: def.freightForwarder.modesOfTransport,
            iataDgrCertified: def.freightForwarder.iataDgrCertified,
            aeoAccredited: def.freightForwarder.aeoAccredited,
            gdpTransportCapable: def.freightForwarder.gdpTransportCapable,
            referencesProvided: def.freightForwarder.referencesProvided,
          },
        });
        allCerts.push({ certs: def.freightForwarder.certs });
      }

      if (def.warehousing) {
        await tx.warehousingDetail.create({
          data: {
            partnerId: partner.id,
            wdaNumber: def.warehousing.wdaNumber,
            technicalAgreementRef: def.warehousing.technicalAgreementRef,
            gdpAuditDate: new Date(def.warehousing.gdpAuditDate),
            nextGdpAuditDue: new Date(def.warehousing.nextGdpAuditDue),
            monthlyReconciliationContact: def.warehousing.monthlyReconciliationContact,
          },
        });
        allCerts.push({ certs: def.warehousing.certs });
      }

      if (def.client) {
        await tx.clientDetail.create({
          data: {
            partnerId: partner.id,
            billingCity: def.client.billingCity,
            billingCountryCode: def.client.billingCountryCode,
            deliveryCity: def.client.deliveryCity,
            deliveryCountryCode: def.client.deliveryCountryCode,
            paymentTerms: def.client.paymentTerms,
            isPharmaApprovedCustomer: def.client.isPharmaApprovedCustomer,
            approvedCustomerLogRef: def.client.approvedCustomerLogRef ?? null,
          },
        });
      }

      for (const group of allCerts) {
        for (const cert of group.certs) {
          await tx.partnerCertification.create({
            data: {
              organizationId: orgId,
              partnerId: partner.id,
              manufacturerSiteId: group.manufacturerSiteId ?? null,
              type: cert.type,
              referenceNumber: cert.referenceNumber,
              issuingBody: cert.issuingBody,
              issuedDate: new Date(cert.issuedDate),
              expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
              verifiedAt: cert.verified ? new Date(cert.issuedDate) : null,
              status: "CURRENT",
            },
          });
        }
      }

      created++;
      console.log(`  created partner: ${def.name} (${def.roles.join(", ")})`);
    }

    console.log(`Partners: created ${created}, skipped ${skipped} (already present).`);
  });
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    throw new Error(`No organization found named "${ORG_NAME}" — run provision-universe-demo.ts first.`);
  }
  console.log(`Seeding Phase 1 demo data into "${org.name}" (${org.id})...\n`);

  await seedProductMaster();
  await seedPartners(org.id);

  console.log("\nPhase 1 seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
