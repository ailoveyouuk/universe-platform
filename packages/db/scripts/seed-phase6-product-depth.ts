/**
 * Phase 6 of the comprehensive demo-data build (2026-10-09) — see
 * claude/demo-data-build.md for full context. Deepens the Product
 * Database side of the platform specifically (Lewis's call: "deepen the
 * global product catalogue... ProductPriceHistory time-series... create
 * products, full data, and assign them to the current manufacturers and
 * suppliers"). Four parts, all idempotent, all additive to Phase 1-5:
 *
 *   1. ProductAttributeDefinition — category-scoped dynamic field
 *      schemas. Zero rows existed before this (confirmed: the API/
 *      frontend plumbing to read these — ProductCatalogService.getOne(),
 *      now also surfaced in the Product Database catalogue UI as of the
 *      2026-10-09 "Category attributes" section — has existed since
 *      2026-10-02 with nothing to show). Keyed purely by `category`
 *      string match (NOT the unused ProductMaster<->ProductAttributeDefinition
 *      M2M connect table — confirmed by reading the service, it never
 *      touches that relation), so these apply to every existing AND
 *      future ProductMaster row in a matching category with no per-row
 *      wiring needed.
 *   2. New ProductMaster entries — 18 more, deepening (not widening)
 *      the six top-level categories Phase 1 already established
 *      (Personal Protective Equipment / Consumables / Laboratory /
 *      Medical Devices / Pharmaceuticals / Equipment) rather than
 *      inventing new top-level groups, since the Product Database
 *      catalogue page's category filter (fixed same day, see commit
 *      3b90e2e) now depends on exactly those six.
 *   3. ProductSourceApproval — links a broad slice of ProductMaster
 *      entries (old Phase 1 ones + new ones from part 2) to Phase 1's
 *      three manufacturers (Apex MedTech, Rhein Pharma, Guangzhou
 *      Sterile Devices) and two suppliers (MedSource Global, Horizon
 *      Health) via the real Quality-module sourcing-approval record,
 *      not a guessed/synthetic join table. Rhein Pharma Produktion GmbH
 *      (the one Phase 1 partner with BOTH roles) deliberately appears as
 *      both manufacturer AND supplier on one row — the case Lewis asked
 *      for. Mostly APPROVED, a couple left PENDING (real QA queue item),
 *      one with a nextReviewDue already in the past (exercises the
 *      "review overdue" flag ProductSourceApprovalsService computes).
 *   4. ProductPriceHistory — multi-point time series for a dozen
 *      products, organizationId-scoped to "Universe Demo", 3-5 points
 *      each spanning roughly the last 18 months, mixed currencies
 *      (USD/EUR/GBP matching each product's typical sourcing region).
 *      Exposed read-only via GET /product-catalog/:id/price-history
 *      (new 2026-10-09 endpoint) and the catalogue UI's new "Price
 *      history" section — this is the first real data either has ever
 *      shown.
 *
 * Idempotency: part 1 upserts by (category, attributeKey) — the model's
 * own unique constraint. Part 2 skips any (name, category) pair that
 * already exists, same as Phase 1's seedProductMaster(). Part 3 skips any
 * (productMasterId, manufacturerId, supplierId) combination that already
 * exists. Part 4 skips if that exact (productMasterId, effectiveDate,
 * unitPrice) combination is already present. Safe to re-run after a
 * partial failure.
 *
 * Usage (from packages/db), AFTER Phase 1-5:
 *   npx tsx scripts/seed-phase6-product-depth.ts
 */
import { prisma, withTenantContext, withPlatformStaffContext } from "../src/index";

const ORG_NAME = "Universe Demo";

// ---------------------------------------------------------------------------
// Part 1 — ProductAttributeDefinition
// ---------------------------------------------------------------------------

interface AttrDef {
  category: string;
  attributeKey: string;
  label: string;
  dataType: "STRING" | "NUMBER" | "BOOLEAN" | "ENUM" | "DATE";
  enumOptions?: string[];
  required?: boolean;
  sortOrder?: number;
}

const ATTRIBUTE_DEFINITIONS: AttrDef[] = [
  // Personal Protective Equipment.Masks
  { category: "Personal Protective Equipment.Masks", attributeKey: "size", label: "Size", dataType: "ENUM", enumOptions: ["Small", "Medium", "Large", "One size"], required: true, sortOrder: 1 },
  { category: "Personal Protective Equipment.Masks", attributeKey: "filtrationStandard", label: "Filtration Standard", dataType: "ENUM", enumOptions: ["Type I", "Type II", "Type IIR", "N95", "FFP2", "FFP3"], required: true, sortOrder: 2 },
  { category: "Personal Protective Equipment.Masks", attributeKey: "sterile", label: "Sterile", dataType: "BOOLEAN", required: false, sortOrder: 3 },
  // Personal Protective Equipment.Gloves
  { category: "Personal Protective Equipment.Gloves", attributeKey: "size", label: "Glove Size", dataType: "ENUM", enumOptions: ["XS", "S", "M", "L", "XL"], required: true, sortOrder: 1 },
  { category: "Personal Protective Equipment.Gloves", attributeKey: "material", label: "Material", dataType: "ENUM", enumOptions: ["Nitrile", "Latex", "Vinyl"], required: true, sortOrder: 2 },
  { category: "Personal Protective Equipment.Gloves", attributeKey: "powderFree", label: "Powder-Free", dataType: "BOOLEAN", required: false, sortOrder: 3 },
  // Consumables.Syringes & Needles
  { category: "Consumables.Syringes & Needles", attributeKey: "volumeMl", label: "Volume (ml)", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Consumables.Syringes & Needles", attributeKey: "needleGauge", label: "Needle Gauge", dataType: "ENUM", enumOptions: ["21G", "23G", "25G", "27G"], required: false, sortOrder: 2 },
  { category: "Consumables.Syringes & Needles", attributeKey: "sterile", label: "Sterile", dataType: "BOOLEAN", required: true, sortOrder: 3 },
  // Consumables.Wound Care
  { category: "Consumables.Wound Care", attributeKey: "dimensions", label: "Dimensions", dataType: "STRING", required: false, sortOrder: 1 },
  { category: "Consumables.Wound Care", attributeKey: "sterile", label: "Sterile", dataType: "BOOLEAN", required: true, sortOrder: 2 },
  // Laboratory.Sample Storage
  { category: "Laboratory.Sample Storage", attributeKey: "volumeMl", label: "Volume (ml)", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Laboratory.Sample Storage", attributeKey: "material", label: "Material", dataType: "ENUM", enumOptions: ["Polypropylene", "Polystyrene", "Glass"], required: false, sortOrder: 2 },
  // Laboratory.Sample Collection
  { category: "Laboratory.Sample Collection", attributeKey: "volumeMl", label: "Volume (ml)", dataType: "NUMBER", required: false, sortOrder: 1 },
  { category: "Laboratory.Sample Collection", attributeKey: "additive", label: "Additive", dataType: "ENUM", enumOptions: ["EDTA", "Heparin", "Citrate", "None"], required: false, sortOrder: 2 },
  // Laboratory.Reagents
  { category: "Laboratory.Reagents", attributeKey: "shelfLifeMonths", label: "Shelf Life (months)", dataType: "NUMBER", required: false, sortOrder: 1 },
  { category: "Laboratory.Reagents", attributeKey: "storageRequirement", label: "Storage Requirement", dataType: "ENUM", enumOptions: ["Room temperature", "2-8°C refrigerated", "Frozen"], required: true, sortOrder: 2 },
  // Medical Devices.Diagnostic Test Kits
  { category: "Medical Devices.Diagnostic Test Kits", attributeKey: "testCount", label: "Tests per Box", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Medical Devices.Diagnostic Test Kits", attributeKey: "shelfLifeMonths", label: "Shelf Life (months)", dataType: "NUMBER", required: false, sortOrder: 2 },
  { category: "Medical Devices.Diagnostic Test Kits", attributeKey: "whoPrequalified", label: "WHO Prequalified", dataType: "BOOLEAN", required: false, sortOrder: 3 },
  // Medical Devices.Diagnostic Equipment
  { category: "Medical Devices.Diagnostic Equipment", attributeKey: "powerSource", label: "Power Source", dataType: "ENUM", enumOptions: ["Battery", "Mains (AC)", "Battery + Mains"], required: false, sortOrder: 1 },
  // Pharmaceuticals.Antibiotics
  { category: "Pharmaceuticals.Antibiotics", attributeKey: "dosageForm", label: "Dosage Form", dataType: "ENUM", enumOptions: ["Tablet", "Capsule", "Powder for Injection", "Oral Suspension"], required: true, sortOrder: 1 },
  { category: "Pharmaceuticals.Antibiotics", attributeKey: "strength", label: "Strength", dataType: "STRING", required: true, sortOrder: 2 },
  // Pharmaceuticals.Essential Medicines
  { category: "Pharmaceuticals.Essential Medicines", attributeKey: "dosageForm", label: "Dosage Form", dataType: "ENUM", enumOptions: ["Tablet", "Sachet", "Oral Suspension", "Injection"], required: true, sortOrder: 1 },
  // Pharmaceuticals.Vaccines
  { category: "Pharmaceuticals.Vaccines", attributeKey: "coldChainClass", label: "Cold Chain Class", dataType: "ENUM", enumOptions: ["WHO CTC", "+2 to +8°C standard", "Frozen"], required: true, sortOrder: 1 },
  { category: "Pharmaceuticals.Vaccines", attributeKey: "doseCount", label: "Doses per Vial", dataType: "NUMBER", required: false, sortOrder: 2 },
  // Equipment.Cold Chain
  { category: "Equipment.Cold Chain", attributeKey: "capacityLitres", label: "Capacity (litres)", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Equipment.Cold Chain", attributeKey: "powerSource", label: "Power Source", dataType: "ENUM", enumOptions: ["Mains (AC)", "Solar", "Mains + Solar", "Ice-lined"], required: true, sortOrder: 2 },
  // Equipment.Sterilization
  { category: "Equipment.Sterilization", attributeKey: "capacityLitres", label: "Chamber Capacity (litres)", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Equipment.Sterilization", attributeKey: "cycleType", label: "Cycle Type", dataType: "ENUM", enumOptions: ["Gravity", "Vacuum-assisted", "Both"], required: false, sortOrder: 2 },
  // Equipment.Respiratory Care
  { category: "Equipment.Respiratory Care", attributeKey: "flowRateLpm", label: "Max Flow Rate (L/min)", dataType: "NUMBER", required: true, sortOrder: 1 },
  { category: "Equipment.Respiratory Care", attributeKey: "powerSource", label: "Power Source", dataType: "ENUM", enumOptions: ["Battery", "Mains (AC)", "Battery + Mains"], required: false, sortOrder: 2 },
];

// ---------------------------------------------------------------------------
// Part 2 — new ProductMaster entries (deepening the existing six categories)
// ---------------------------------------------------------------------------

interface ProductMasterDef {
  name: string;
  category: string;
  hsCode?: string;
  unspscCode?: string;
  gtin?: string;
  standardUnit?: string;
  sourceStandard: "WHO_EML" | "HS_CODE" | "UNSPSC" | "GS1_GTIN" | "INTERNAL";
  expectedQualityDocumentation?: string;
}

const NEW_PRODUCT_MASTER_ENTRIES: ProductMasterDef[] = [
  // Personal Protective Equipment
  { name: "Surgical Gown, Level 3, reinforced, sterile", category: "Personal Protective Equipment.Gowns", hsCode: "6210.10", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Shoe Covers, disposable, non-slip sole, pair", category: "Personal Protective Equipment.Footwear", hsCode: "3926.90", standardUnit: "pair", sourceStandard: "HS_CODE" },
  { name: "Safety Goggles, indirect vent, anti-fog", category: "Personal Protective Equipment.Eye & Face Protection", hsCode: "9004.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  // Consumables
  { name: "Syringe, 10ml, Luer Lock, disposable, sterile", category: "Consumables.Syringes & Needles", hsCode: "9018.31", standardUnit: "each", sourceStandard: "HS_CODE", expectedQualityDocumentation: "CE Mark / ISO 13485 Declaration of Conformity" },
  { name: "Hypodermic Needle, 23G x 1\", single use, sterile", category: "Consumables.Syringes & Needles", hsCode: "9018.32", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Elastic Adhesive Bandage, 10cm x 4.5m", category: "Consumables.Wound Care", hsCode: "3005.90", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Alcohol Prep Pads, 70% isopropyl, box of 100", category: "Consumables.Antiseptics", hsCode: "3005.90", standardUnit: "box of 100", sourceStandard: "HS_CODE" },
  // Laboratory
  { name: "Microcentrifuge Tube, 1.5ml, graduated, sterile", category: "Laboratory.Sample Storage", gtin: "5012345679001", standardUnit: "each", sourceStandard: "GS1_GTIN" },
  { name: "Capillary Blood Collection Tube, lithium heparin, 500µl", category: "Laboratory.Sample Collection", hsCode: "9018.39", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Rapid HbA1c Test Reagent Cartridge, box of 25", category: "Laboratory.Reagents", hsCode: "3822.00", standardUnit: "box of 25", sourceStandard: "HS_CODE" },
  // Medical Devices
  { name: "Rapid Diagnostic Test Kit — COVID-19 Antigen (RDT), box of 25", category: "Medical Devices.Diagnostic Test Kits", hsCode: "3822.00", standardUnit: "box of 25", sourceStandard: "HS_CODE", expectedQualityDocumentation: "WHO Emergency Use Listing reference" },
  { name: "Rapid Diagnostic Test Kit — Pregnancy (hCG), box of 50", category: "Medical Devices.Diagnostic Test Kits", hsCode: "3822.00", standardUnit: "box of 50", sourceStandard: "HS_CODE" },
  { name: "ECG Machine, 12-lead, portable with printer", category: "Medical Devices.Diagnostic Equipment", hsCode: "9018.19", standardUnit: "each", sourceStandard: "HS_CODE" },
  { name: "Suture Kit, absorbable, 2-0, with needle", category: "Medical Devices.Surgical Instruments", hsCode: "3006.10", standardUnit: "each", sourceStandard: "HS_CODE" },
  // Pharmaceuticals
  { name: "Metronidazole 400mg Tablets, blister pack of 100", category: "Pharmaceuticals.Antibiotics", unspscCode: "51191501", standardUnit: "pack of 100", sourceStandard: "WHO_EML" },
  { name: "Zinc Sulfate 20mg Dispersible Tablets, pack of 100", category: "Pharmaceuticals.Essential Medicines", unspscCode: "51181701", standardUnit: "pack of 100", sourceStandard: "WHO_EML" },
  { name: "Measles-Rubella Vaccine, multi-dose vial", category: "Pharmaceuticals.Vaccines", unspscCode: "51141612", standardUnit: "vial", sourceStandard: "WHO_EML" },
  // Equipment
  { name: "Cold Box, cold-chain, 20L, for vaccine transport", category: "Equipment.Cold Chain", hsCode: "8418.69", standardUnit: "each", sourceStandard: "HS_CODE" },
];

// ---------------------------------------------------------------------------
// Part 3 — ProductSourceApproval (product <-> manufacturer/supplier)
// ---------------------------------------------------------------------------

interface SourceApprovalDef {
  productName: string;
  manufacturerName: string;
  supplierName?: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  approvedMonthsAgo?: number;
  nextReviewInMonths?: number; // negative = already overdue
  notes?: string;
}

const SOURCE_APPROVALS: SourceApprovalDef[] = [
  { productName: "Surgical Face Mask, Type IIR, 3-ply, box of 50", manufacturerName: "Apex MedTech Manufacturing Ltd", supplierName: "MedSource Global Supplies Inc.", status: "APPROVED", approvedMonthsAgo: 8, nextReviewInMonths: 4 },
  { productName: "N95 Respirator Mask, NIOSH-approved", manufacturerName: "Guangzhou Sterile Devices Co.", supplierName: "Horizon Health Procurement Ltd", status: "APPROVED", approvedMonthsAgo: 5, nextReviewInMonths: 7 },
  { productName: "Nitrile Examination Gloves, Powder-Free, box of 100", manufacturerName: "Guangzhou Sterile Devices Co.", status: "APPROVED", approvedMonthsAgo: 11, nextReviewInMonths: -1, notes: "Annual re-review lapsed — flagged for QA follow-up." },
  { productName: "Syringe, 5ml, Luer Lock, disposable, sterile", manufacturerName: "Apex MedTech Manufacturing Ltd", supplierName: "MedSource Global Supplies Inc.", status: "APPROVED", approvedMonthsAgo: 14, nextReviewInMonths: 10 },
  { productName: "Syringe, 10ml, Luer Lock, disposable, sterile", manufacturerName: "Apex MedTech Manufacturing Ltd", supplierName: "MedSource Global Supplies Inc.", status: "PENDING" },
  { productName: "Hypodermic Needle, 23G x 1\", single use, sterile", manufacturerName: "Apex MedTech Manufacturing Ltd", status: "APPROVED", approvedMonthsAgo: 3, nextReviewInMonths: 9 },
  { productName: "IV Administration Set, 20 drops/ml, with Y-site, sterile", manufacturerName: "Rhein Pharma Produktion GmbH", status: "APPROVED", approvedMonthsAgo: 6, nextReviewInMonths: 6 },
  { productName: "Ceftriaxone 1g Powder for Injection, vial", manufacturerName: "Rhein Pharma Produktion GmbH", supplierName: "Rhein Pharma Produktion GmbH", status: "APPROVED", approvedMonthsAgo: 9, nextReviewInMonths: 3, notes: "Direct-from-manufacturer sourcing — Rhein Pharma supplies this line itself, no intermediary." },
  { productName: "Metronidazole 400mg Tablets, blister pack of 100", manufacturerName: "Rhein Pharma Produktion GmbH", supplierName: "Rhein Pharma Produktion GmbH", status: "APPROVED", approvedMonthsAgo: 4, nextReviewInMonths: 8 },
  { productName: "Oxytocin 10 IU/ml Injection, ampoule", manufacturerName: "Rhein Pharma Produktion GmbH", status: "PENDING" },
  { productName: "Tetanus Toxoid Vaccine, multi-dose vial", manufacturerName: "Rhein Pharma Produktion GmbH", supplierName: "Horizon Health Procurement Ltd", status: "APPROVED", approvedMonthsAgo: 10, nextReviewInMonths: 2 },
  { productName: "Measles-Rubella Vaccine, multi-dose vial", manufacturerName: "Rhein Pharma Produktion GmbH", supplierName: "Horizon Health Procurement Ltd", status: "APPROVED", approvedMonthsAgo: 2, nextReviewInMonths: 10 },
  { productName: "Digital Thermometer, non-contact infrared", manufacturerName: "Guangzhou Sterile Devices Co.", supplierName: "MedSource Global Supplies Inc.", status: "APPROVED", approvedMonthsAgo: 7, nextReviewInMonths: 5 },
  { productName: "Pulse Oximeter, fingertip, digital display", manufacturerName: "Guangzhou Sterile Devices Co.", supplierName: "MedSource Global Supplies Inc.", status: "APPROVED", approvedMonthsAgo: 13, nextReviewInMonths: -3, notes: "Re-review overdue since Q2 — no change reported but needs sign-off." },
  { productName: "Rapid Diagnostic Test Kit — Malaria (RDT), box of 25", manufacturerName: "Guangzhou Sterile Devices Co.", supplierName: "Horizon Health Procurement Ltd", status: "APPROVED", approvedMonthsAgo: 12, nextReviewInMonths: 0 },
  { productName: "Rapid Diagnostic Test Kit — COVID-19 Antigen (RDT), box of 25", manufacturerName: "Guangzhou Sterile Devices Co.", supplierName: "Horizon Health Procurement Ltd", status: "PENDING" },
  { productName: "Solar-Powered Vaccine Refrigerator, 60L", manufacturerName: "Apex MedTech Manufacturing Ltd", status: "APPROVED", approvedMonthsAgo: 1, nextReviewInMonths: 11 },
  { productName: "Cold Box, cold-chain, 20L, for vaccine transport", manufacturerName: "Apex MedTech Manufacturing Ltd", supplierName: "MedSource Global Supplies Inc.", status: "APPROVED", approvedMonthsAgo: 1, nextReviewInMonths: 11 },
];

// ---------------------------------------------------------------------------
// Part 4 — ProductPriceHistory (multi-point time series)
// ---------------------------------------------------------------------------

interface PricePoint {
  monthsAgo: number;
  unitPrice: number;
  currency: "USD" | "EUR" | "GBP";
}

interface PriceHistoryDef {
  productName: string;
  points: PricePoint[];
}

const PRICE_HISTORIES: PriceHistoryDef[] = [
  { productName: "Surgical Face Mask, Type IIR, 3-ply, box of 50", points: [
    { monthsAgo: 16, unitPrice: 4.1, currency: "USD" },
    { monthsAgo: 11, unitPrice: 3.85, currency: "USD" },
    { monthsAgo: 6, unitPrice: 3.6, currency: "USD" },
    { monthsAgo: 1, unitPrice: 3.45, currency: "USD" },
  ] },
  { productName: "N95 Respirator Mask, NIOSH-approved", points: [
    { monthsAgo: 14, unitPrice: 0.92, currency: "USD" },
    { monthsAgo: 9, unitPrice: 0.98, currency: "USD" },
    { monthsAgo: 4, unitPrice: 1.05, currency: "USD" },
  ] },
  { productName: "Nitrile Examination Gloves, Powder-Free, box of 100", points: [
    { monthsAgo: 18, unitPrice: 6.2, currency: "USD" },
    { monthsAgo: 12, unitPrice: 5.75, currency: "USD" },
    { monthsAgo: 6, unitPrice: 5.4, currency: "USD" },
    { monthsAgo: 2, unitPrice: 5.5, currency: "USD" },
  ] },
  { productName: "Syringe, 5ml, Luer Lock, disposable, sterile", points: [
    { monthsAgo: 15, unitPrice: 0.11, currency: "USD" },
    { monthsAgo: 8, unitPrice: 0.115, currency: "USD" },
    { monthsAgo: 2, unitPrice: 0.12, currency: "USD" },
  ] },
  { productName: "IV Administration Set, 20 drops/ml, with Y-site, sterile", points: [
    { monthsAgo: 12, unitPrice: 0.78, currency: "EUR" },
    { monthsAgo: 6, unitPrice: 0.82, currency: "EUR" },
    { monthsAgo: 1, unitPrice: 0.85, currency: "EUR" },
  ] },
  { productName: "Ceftriaxone 1g Powder for Injection, vial", points: [
    { monthsAgo: 17, unitPrice: 1.35, currency: "EUR" },
    { monthsAgo: 11, unitPrice: 1.42, currency: "EUR" },
    { monthsAgo: 5, unitPrice: 1.5, currency: "EUR" },
    { monthsAgo: 1, unitPrice: 1.48, currency: "EUR" },
  ] },
  { productName: "Oxytocin 10 IU/ml Injection, ampoule", points: [
    { monthsAgo: 10, unitPrice: 0.34, currency: "EUR" },
    { monthsAgo: 4, unitPrice: 0.36, currency: "EUR" },
  ] },
  { productName: "Tetanus Toxoid Vaccine, multi-dose vial", points: [
    { monthsAgo: 16, unitPrice: 2.9, currency: "EUR" },
    { monthsAgo: 9, unitPrice: 2.95, currency: "EUR" },
    { monthsAgo: 3, unitPrice: 3.1, currency: "EUR" },
  ] },
  { productName: "Digital Thermometer, non-contact infrared", points: [
    { monthsAgo: 13, unitPrice: 8.4, currency: "USD" },
    { monthsAgo: 7, unitPrice: 7.9, currency: "USD" },
    { monthsAgo: 1, unitPrice: 7.6, currency: "USD" },
  ] },
  { productName: "Pulse Oximeter, fingertip, digital display", points: [
    { monthsAgo: 18, unitPrice: 6.1, currency: "USD" },
    { monthsAgo: 12, unitPrice: 5.8, currency: "USD" },
    { monthsAgo: 6, unitPrice: 5.5, currency: "USD" },
    { monthsAgo: 1, unitPrice: 5.3, currency: "USD" },
  ] },
  { productName: "Rapid Diagnostic Test Kit — Malaria (RDT), box of 25", points: [
    { monthsAgo: 15, unitPrice: 22.5, currency: "GBP" },
    { monthsAgo: 8, unitPrice: 23.75, currency: "GBP" },
    { monthsAgo: 2, unitPrice: 24.1, currency: "GBP" },
  ] },
  { productName: "Solar-Powered Vaccine Refrigerator, 60L", points: [
    { monthsAgo: 10, unitPrice: 1450, currency: "USD" },
    { monthsAgo: 4, unitPrice: 1510, currency: "USD" },
  ] },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function monthsAgoDate(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function seedAttributeDefinitions() {
  let created = 0;
  let skipped = 0;
  for (const def of ATTRIBUTE_DEFINITIONS) {
    const existing = await prisma.productAttributeDefinition.findUnique({
      where: { category_attributeKey: { category: def.category, attributeKey: def.attributeKey } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.productAttributeDefinition.create({
      data: {
        category: def.category,
        attributeKey: def.attributeKey,
        label: def.label,
        dataType: def.dataType,
        enumOptions: def.enumOptions ? JSON.stringify(def.enumOptions) : null,
        required: def.required ?? false,
        sortOrder: def.sortOrder ?? 0,
      },
    });
    created++;
  }
  console.log(`ProductAttributeDefinition: created ${created}, skipped ${skipped} (already present).`);
}

async function seedNewProductMaster() {
  let created = 0;
  let skipped = 0;
  for (const def of NEW_PRODUCT_MASTER_ENTRIES) {
    const existing = await prisma.productMaster.findFirst({ where: { name: def.name, category: def.category } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.productMaster.create({
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
  console.log(`ProductMaster (Phase 6 additions): created ${created}, skipped ${skipped} (already present).`);
}

async function seedSourceApprovals(orgId: string) {
  let created = 0;
  let skipped = 0;
  let missing = 0;

  await withTenantContext(orgId, async (tx) => {
    for (const def of SOURCE_APPROVALS) {
      const product = await prisma.productMaster.findFirst({ where: { name: def.productName } });
      const manufacturer = await tx.partner.findFirst({ where: { organizationId: orgId, name: def.manufacturerName } });
      const supplier = def.supplierName
        ? await tx.partner.findFirst({ where: { organizationId: orgId, name: def.supplierName } })
        : null;

      if (!product || !manufacturer || (def.supplierName && !supplier)) {
        console.warn(`  Skipping source approval for "${def.productName}" — missing product/manufacturer/supplier lookup.`);
        missing++;
        continue;
      }

      const existing = await tx.productSourceApproval.findFirst({
        where: {
          organizationId: orgId,
          productMasterId: product.id,
          manufacturerId: manufacturer.id,
          supplierId: supplier?.id ?? null,
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const approvedAt = def.status === "APPROVED" && def.approvedMonthsAgo !== undefined ? monthsAgoDate(def.approvedMonthsAgo) : null;
      const nextReviewDue = def.nextReviewInMonths !== undefined ? monthsAgoDate(-def.nextReviewInMonths) : null;

      await tx.productSourceApproval.create({
        data: {
          organizationId: orgId,
          productMasterId: product.id,
          manufacturerId: manufacturer.id,
          supplierId: supplier?.id ?? null,
          status: def.status,
          approvedAt,
          nextReviewDue,
          notes: def.notes ?? null,
        },
      });
      created++;
    }
  });

  console.log(`ProductSourceApproval: created ${created}, skipped ${skipped} (already present), ${missing} skipped for missing lookups.`);
}

async function seedPriceHistory(orgId: string, recordedById: string | null) {
  let created = 0;
  let skipped = 0;
  let missing = 0;

  await withTenantContext(orgId, async (tx) => {
    for (const def of PRICE_HISTORIES) {
      const product = await prisma.productMaster.findFirst({ where: { name: def.productName } });
      if (!product) {
        console.warn(`  Skipping price history for "${def.productName}" — product not found.`);
        missing++;
        continue;
      }

      for (const point of def.points) {
        const effectiveDate = monthsAgoDate(point.monthsAgo);
        const existing = await tx.productPriceHistory.findFirst({
          where: {
            organizationId: orgId,
            productMasterId: product.id,
            effectiveDate,
            unitPrice: point.unitPrice,
          },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await tx.productPriceHistory.create({
          data: {
            organizationId: orgId,
            productMasterId: product.id,
            unitPrice: point.unitPrice,
            currency: point.currency,
            effectiveDate,
            recordedById,
          },
        });
        created++;
      }
    }
  });

  console.log(`ProductPriceHistory: created ${created}, skipped ${skipped} (already present), ${missing} products not found.`);
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: ORG_NAME }, select: { id: true } });
  if (!org) {
    throw new Error(`No organization found matching name "${ORG_NAME}"`);
  }

  const demoUser = await prisma.user.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  console.log("--- Part 1: ProductAttributeDefinition ---");
  await seedAttributeDefinitions();

  console.log("--- Part 2: new ProductMaster entries ---");
  await seedNewProductMaster();

  console.log("--- Part 3: ProductSourceApproval ---");
  await seedSourceApprovals(org.id);

  console.log("--- Part 4: ProductPriceHistory ---");
  await seedPriceHistory(org.id, demoUser?.id ?? null);

  console.log("Phase 6 product-depth seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
