/**
 * Phase 3 of the comprehensive demo-data build (2026-10-08) — see Phase 1/2
 * (seed-phase1-partners-products.ts, seed-phase2-projects.ts) for context.
 * Seeds the GDP quality/compliance tables deferred from those phases:
 *   - StakeholderEvidenceRecord against the org's EvidenceStandardDefinition
 *     catalog, for the relevant Phase 1 partners.
 *   - ProductBatch for the pharma ProjectLines Phase 2 created (and backfills
 *     those lines' productBatchId, promoting their plain-text batchNumber
 *     to the first-class entity).
 *   - BatchTemperatureLog readings against those batches.
 *   - RiskAssessment rows against a few partners/projects.
 *   - ControlledDocument register entries for the org's own SOPs/policies.
 *
 * PREREQUISITE: run `npm run seed:evidence-standards -- "Universe Demo"`
 * first (idempotent, safe to re-run) — this script links evidence records
 * to that catalog by name and will error out clearly if it's missing.
 *
 * Idempotent: skips any row that already exists by its natural key
 * (partner+standard, batch number, etc.) — safe to re-run.
 *
 * Usage (from packages/db), AFTER Phase 1, Phase 2, and seed-evidence-standards:
 *   npx tsx scripts/seed-phase3-quality-compliance.ts
 */
import { prisma, withTenantContext } from "../src/index";

const ORG_NAME = "Universe Demo";

// ---------------------------------------------------------------------------
// Stakeholder evidence
// ---------------------------------------------------------------------------

interface EvidenceDef {
  partnerName: string;
  standardName: string;
  referenceNumber?: string;
  issuingBody?: string;
  issuedDate: string;
  expiryDate?: string;
  status: "VERIFIED" | "PENDING";
}

const EVIDENCE: EvidenceDef[] = [
  // Manufacturers
  { partnerName: "Apex MedTech Manufacturing Ltd", standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: "IN-13485-2024-0417", issuingBody: "TÜV SÜD", issuedDate: "2024-03-10", expiryDate: "2027-03-09", status: "VERIFIED" },
  { partnerName: "Apex MedTech Manufacturing Ltd", standardName: "Annual Bona Fide Review", issuedDate: "2026-06-01", expiryDate: "2027-06-01", status: "VERIFIED" },
  { partnerName: "Apex MedTech Manufacturing Ltd", standardName: "Company Registration Certificate", referenceNumber: "U24230MH2012PTC234567", issuedDate: "2024-01-15", status: "VERIFIED" },
  { partnerName: "Rhein Pharma Produktion GmbH", standardName: "GMP Certificate", referenceNumber: "DE-GMP-2024-5591", issuingBody: "Bezirksregierung Köln", issuedDate: "2024-01-15", expiryDate: "2027-01-14", status: "VERIFIED" },
  { partnerName: "Rhein Pharma Produktion GmbH", standardName: "GDP Certificate", referenceNumber: "DE-GDP-2024-0912", issuingBody: "Bezirksregierung Köln", issuedDate: "2024-02-01", expiryDate: "2027-01-31", status: "VERIFIED" },
  { partnerName: "Rhein Pharma Produktion GmbH", standardName: "Annual Bona Fide Review", issuedDate: "2026-06-01", expiryDate: "2027-06-01", status: "VERIFIED" },
  { partnerName: "Guangzhou Sterile Devices Co.", standardName: "ISO 13485 — Medical Devices QMS Certificate", referenceNumber: "CN-13485-2023-7741", issuingBody: "SGS", issuedDate: "2023-06-12", expiryDate: "2026-06-11", status: "VERIFIED" },
  { partnerName: "Guangzhou Sterile Devices Co.", standardName: "FDA Registration", referenceNumber: "FDA-REG-3014872", issuingBody: "US FDA", issuedDate: "2023-01-10", status: "PENDING" },
  // Suppliers
  { partnerName: "MedSource Global Supplies Inc.", standardName: "Code of Conduct Acknowledgement", issuedDate: "2026-01-15", status: "VERIFIED" },
  { partnerName: "MedSource Global Supplies Inc.", standardName: "Company Registration Certificate", referenceNumber: "DE-EIN-47-3821156", issuedDate: "2024-01-10", status: "VERIFIED" },
  { partnerName: "Horizon Health Procurement Ltd", standardName: "Code of Conduct Acknowledgement", issuedDate: "2026-01-15", status: "VERIFIED" },
  { partnerName: "Horizon Health Procurement Ltd", standardName: "VAT Certificate", referenceNumber: "GB204581739", issuedDate: "2024-02-01", status: "VERIFIED" },
  // Freight forwarders
  { partnerName: "SkyBridge Freight & Logistics Ltd", standardName: "IATA Dangerous Goods Regulations Certification", issuedDate: "2024-01-20", expiryDate: "2026-01-19", status: "VERIFIED" },
  { partnerName: "SkyBridge Freight & Logistics Ltd", standardName: "AEO Accreditation", issuedDate: "2024-01-20", expiryDate: "2027-01-19", status: "VERIFIED" },
  { partnerName: "Meridian Cargo Solutions SA", standardName: "IATA Dangerous Goods Regulations Certification", issuedDate: "2023-10-05", expiryDate: "2025-10-04", status: "VERIFIED" },
  { partnerName: "Meridian Cargo Solutions SA", standardName: "AEO Accreditation", issuedDate: "2023-10-05", expiryDate: "2026-10-04", status: "VERIFIED" },
  // Warehousing
  { partnerName: "Coldline Storage & Distribution Ltd", standardName: "Wholesale Distribution Authorisation (WDA)", referenceNumber: "NL-WDA-2024-0398", issuingBody: "IGJ (Dutch Health Care Inspectorate)", issuedDate: "2024-06-01", expiryDate: "2027-05-31", status: "VERIFIED" },
  { partnerName: "Coldline Storage & Distribution Ltd", standardName: "Technical Agreement", referenceNumber: "TA-COLDLINE-2024-01", issuedDate: "2024-06-01", status: "VERIFIED" },
  // Clients (lighter touch — only the standards that actually apply to CLIENT)
  { partnerName: "National Medical Procurement Agency", standardName: "Service Level Agreement", issuedDate: "2026-01-10", status: "VERIFIED" },
  { partnerName: "Horn of Africa Relief Consortium", standardName: "Service Level Agreement", issuedDate: "2025-11-01", status: "VERIFIED" },
];

// ---------------------------------------------------------------------------
// Product batches + temperature logs
// ---------------------------------------------------------------------------

interface TempLogDef {
  loggerReference: string;
  readingSummary: string;
  hasExcursion: boolean;
  excursionNotes?: string;
  reviewed: boolean;
  recordedAt: string;
}

interface BatchDef {
  batchNumber: string;
  productMasterName: string;
  manufacturerName: string;
  manufacturedDate: string;
  expiryDate: string;
  storageConditions: string;
  qualificationPathway: "WHO_PQ" | "SRA" | "ERP";
  projectLineBatchNumber: string; // matches ProjectLine.batchNumber from Phase 2, for backfilling productBatchId
  temperatureLogs: TempLogDef[];
}

const BATCHES: BatchDef[] = [
  {
    batchNumber: "RP-AMX-2602",
    productMasterName: "Amoxicillin 500mg Capsules, blister pack of 100",
    manufacturerName: "Rhein Pharma Produktion GmbH",
    manufacturedDate: "2026-02-15",
    expiryDate: "2028-02-28",
    storageConditions: "Store below 25°C, dry place",
    qualificationPathway: "SRA",
    projectLineBatchNumber: "RP-AMX-2602",
    temperatureLogs: [
      { loggerReference: "DL-AMX-2602-01", readingSummary: "18-22°C maintained throughout transit, no excursions", hasExcursion: false, reviewed: true, recordedAt: "2026-04-05" },
    ],
  },
  {
    batchNumber: "RP-ORS-2611",
    productMasterName: "Oral Rehydration Salts (ORS), sachet, WHO formula",
    manufacturerName: "Rhein Pharma Produktion GmbH",
    manufacturedDate: "2026-02-20",
    expiryDate: "2028-11-30",
    storageConditions: "Store below 25°C",
    qualificationPathway: "WHO_PQ",
    projectLineBatchNumber: "RP-ORS-2611",
    temperatureLogs: [
      { loggerReference: "DL-ORS-2611-01", readingSummary: "19-24°C maintained throughout transit, no excursions", hasExcursion: false, reviewed: true, recordedAt: "2026-04-05" },
    ],
  },
  {
    batchNumber: "RP-OXY-2609",
    productMasterName: "Oxytocin 10 IU/ml Injection, ampoule",
    manufacturerName: "Rhein Pharma Produktion GmbH",
    manufacturedDate: "2026-01-25",
    expiryDate: "2027-09-30",
    storageConditions: "Store at 2-8°C (cold chain) — WHO PQ cold-chain product",
    qualificationPathway: "WHO_PQ",
    projectLineBatchNumber: "RP-OXY-2609",
    temperatureLogs: [
      { loggerReference: "DL-OXY-2609-01", readingSummary: "2-8°C maintained for first 5 days of transit", hasExcursion: false, reviewed: true, recordedAt: "2026-09-12" },
      {
        loggerReference: "DL-OXY-2609-02",
        readingSummary: "Excursion to 11°C for 40 minutes during customs hold, day 6 — recovered to 2-8°C after re-icing",
        hasExcursion: true,
        excursionNotes: "Customs hold at Addis Ababa caused a 40-minute cold-chain break. RP (Responsible Person) reviewed stability data for the excursion window and approved continued use — documented per GDP excursion-review procedure.",
        reviewed: true,
        recordedAt: "2026-09-18",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Risk assessments
// ---------------------------------------------------------------------------

interface RiskDef {
  subjectType: "PARTNER" | "PROJECT" | "SUPPLY_CHAIN";
  subjectName: string; // Partner.name or Project.referenceNumber, resolved at runtime; ignored for SUPPLY_CHAIN
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  likelihood: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
  status: "OPEN" | "MITIGATED" | "ACCEPTED" | "CLOSED";
  reviewDate: string;
}

const RISKS: RiskDef[] = [
  {
    subjectType: "PARTNER",
    subjectName: "Guangzhou Sterile Devices Co.",
    title: "FDA registration verification outstanding",
    description: "FDA registration number recorded but not yet independently verified against the FDA's public registration database.",
    severity: "MEDIUM",
    likelihood: "MEDIUM",
    mitigation: "Verification request logged with FDA establishment registration lookup; follow up within 30 days.",
    status: "OPEN",
    reviewDate: "2026-11-15",
  },
  {
    subjectType: "PARTNER",
    subjectName: "Rhein Pharma Produktion GmbH",
    title: "Single-source manufacturer dependency for essential medicines lines",
    description: "Rhein Pharma is currently the sole qualified manufacturer/supplier for amoxicillin, ORS, and oxytocin lines — a supply disruption at this one site would affect multiple active projects simultaneously.",
    severity: "HIGH",
    likelihood: "LOW",
    mitigation: "Qualify a second SRA-approved manufacturer for at least the oxytocin line (WHO PQ cold-chain product) as a backup source during 2027.",
    status: "MITIGATED",
    reviewDate: "2027-03-01",
  },
  {
    subjectType: "PROJECT",
    subjectName: "UNV-2026-009",
    title: "Last-mile cold chain integrity risk — Horn of Africa corridor",
    description: "Scoping-stage project for vaccine carrier supply; prior shipments on this corridor (see RP-OXY-2609 temperature log) have shown cold-chain excursions during customs holds.",
    severity: "HIGH",
    likelihood: "MEDIUM",
    mitigation: "Specify extended-duration cold-chain packaging (≥96hr hold time) in the technical specification before this project proceeds past scoping.",
    status: "OPEN",
    reviewDate: "2026-11-01",
  },
  {
    subjectType: "PARTNER",
    subjectName: "Pacific Islands Health Alliance",
    title: "Client approval pending — limited transaction history",
    description: "First engagement with this client; approval status is PENDING pending standard onboarding checks.",
    severity: "LOW",
    likelihood: "LOW",
    mitigation: "Complete standard client onboarding checklist before the framework tender (UNV-2026-010) is reopened or a new one issued.",
    status: "OPEN",
    reviewDate: "2026-12-01",
  },
  {
    subjectType: "SUPPLY_CHAIN",
    subjectName: "",
    title: "Global freight cost volatility impacting project margins",
    description: "Air and sea freight rates have shown material volatility across 2026, affecting the accuracy of freight cost estimates locked in at project award stage.",
    severity: "MEDIUM",
    likelihood: "HIGH",
    mitigation: "Review freight cost assumptions quarterly against current forwarder quotes; flag projects with freight-cost variance exceeding 15% for margin re-review.",
    status: "ACCEPTED",
    reviewDate: "2027-01-01",
  },
];

// ---------------------------------------------------------------------------
// Controlled documents
// ---------------------------------------------------------------------------

interface ControlledDocumentDef {
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
}

const CONTROLLED_DOCUMENTS: ControlledDocumentDef[] = [
  { title: "Quality Manual", category: "QUALITY_MANUAL", version: "3.0", effectiveDate: "2026-01-01" },
  { title: "Supplier & Manufacturer Qualification SOP", category: "SOP", version: "2.1", effectiveDate: "2026-02-01" },
  { title: "Cold Chain Management Policy", category: "POLICY", version: "1.4", effectiveDate: "2026-03-01" },
  { title: "Partner Approval & Risk Tiering SOP", category: "SOP", version: "1.0", effectiveDate: "2026-01-15" },
  { title: "Data Sharing & Sector Insights Consent Policy", category: "POLICY", version: "1.0", effectiveDate: "2026-01-01" },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    throw new Error(`No organization found named "${ORG_NAME}" — run provision-universe-demo.ts first.`);
  }
  console.log(`Seeding Phase 3 demo data into "${org.name}" (${org.id})...\n`);

  await withTenantContext(org.id, async (tx) => {
    const standardsCount = await tx.evidenceStandardDefinition.count({ where: { organizationId: org.id } });
    if (standardsCount === 0) {
      throw new Error(
        `No EvidenceStandardDefinition rows found for "${org.name}". Run ` +
          `\`npm run seed:evidence-standards -- "${org.name}"\` first, then re-run this script.`,
      );
    }

    const adminUser = await tx.user.findFirst({ where: { organizationId: org.id } });

    // --- Stakeholder evidence records ---
    let evidenceCreated = 0;
    let evidenceSkipped = 0;
    for (const def of EVIDENCE) {
      const partner = await tx.partner.findFirst({ where: { organizationId: org.id, name: def.partnerName } });
      if (!partner) {
        console.warn(`  [evidence] partner "${def.partnerName}" not found — skipping (run Phase 1 first?)`);
        continue;
      }
      const standard = await tx.evidenceStandardDefinition.findFirst({ where: { organizationId: org.id, name: def.standardName } });
      if (!standard) {
        console.warn(`  [evidence] standard "${def.standardName}" not found — skipping`);
        continue;
      }
      const existing = await tx.stakeholderEvidenceRecord.findFirst({
        where: { organizationId: org.id, partnerId: partner.id, standardId: standard.id },
      });
      if (existing) {
        evidenceSkipped++;
        continue;
      }
      await tx.stakeholderEvidenceRecord.create({
        data: {
          organizationId: org.id,
          partnerId: partner.id,
          standardId: standard.id,
          referenceNumber: def.referenceNumber ?? null,
          issuingBody: def.issuingBody ?? null,
          issuedDate: new Date(def.issuedDate),
          expiryDate: def.expiryDate ? new Date(def.expiryDate) : null,
          status: def.status,
          verifiedById: def.status === "VERIFIED" ? (adminUser?.id ?? null) : null,
          verifiedAt: def.status === "VERIFIED" ? new Date(def.issuedDate) : null,
        },
      });
      evidenceCreated++;
    }
    console.log(`StakeholderEvidenceRecord: created ${evidenceCreated}, skipped ${evidenceSkipped}.`);

    // --- Product batches + temperature logs ---
    let batchesCreated = 0;
    let batchesSkipped = 0;
    let tempLogsCreated = 0;
    for (const def of BATCHES) {
      const existing = await tx.productBatch.findFirst({ where: { organizationId: org.id, batchNumber: def.batchNumber } });
      if (existing) {
        batchesSkipped++;
        continue;
      }
      const productMaster = await tx.productMaster.findFirst({ where: { name: def.productMasterName } });
      const manufacturer = await tx.partner.findFirst({ where: { organizationId: org.id, name: def.manufacturerName } });

      const batch = await tx.productBatch.create({
        data: {
          organizationId: org.id,
          productMasterId: productMaster?.id ?? null,
          manufacturerId: manufacturer?.id ?? null,
          batchNumber: def.batchNumber,
          manufacturedDate: new Date(def.manufacturedDate),
          expiryDate: new Date(def.expiryDate),
          storageConditions: def.storageConditions,
          qualificationPathway: def.qualificationPathway,
          status: "ACTIVE",
        },
      });
      batchesCreated++;

      for (const log of def.temperatureLogs) {
        await tx.batchTemperatureLog.create({
          data: {
            organizationId: org.id,
            productBatchId: batch.id,
            loggerReference: log.loggerReference,
            readingSummary: log.readingSummary,
            hasExcursion: log.hasExcursion,
            excursionNotes: log.excursionNotes ?? null,
            reviewed: log.reviewed,
            reviewedById: log.reviewed ? (adminUser?.id ?? null) : null,
            reviewedAt: log.reviewed ? new Date(log.recordedAt) : null,
            recordedAt: new Date(log.recordedAt),
          },
        });
        tempLogsCreated++;
      }

      // Backfill the Phase 2 ProjectLine's productBatchId, promoting its
      // plain-text batchNumber to this first-class batch.
      await tx.projectLine.updateMany({
        where: { organizationId: org.id, batchNumber: def.projectLineBatchNumber, productBatchId: null },
        data: { productBatchId: batch.id },
      });
    }
    console.log(`ProductBatch: created ${batchesCreated}, skipped ${batchesSkipped}. BatchTemperatureLog: created ${tempLogsCreated}.`);

    // --- Risk assessments ---
    let risksCreated = 0;
    let risksSkipped = 0;
    for (const def of RISKS) {
      let subjectId: string = org.id;
      if (def.subjectType === "PARTNER") {
        const partner = await tx.partner.findFirst({ where: { organizationId: org.id, name: def.subjectName } });
        if (!partner) {
          console.warn(`  [risk] partner "${def.subjectName}" not found — skipping`);
          continue;
        }
        subjectId = partner.id;
      } else if (def.subjectType === "PROJECT") {
        const project = await tx.project.findFirst({ where: { organizationId: org.id, referenceNumber: def.subjectName } });
        if (!project) {
          console.warn(`  [risk] project "${def.subjectName}" not found — skipping`);
          continue;
        }
        subjectId = project.id;
      }
      // SUPPLY_CHAIN: no real entity — subjectId stays the org's own id as a
      // generic anchor (see RiskAssessment's doc comment on the
      // subjectType/subjectId convention being free-text/polymorphic).

      const existing = await tx.riskAssessment.findFirst({ where: { organizationId: org.id, title: def.title } });
      if (existing) {
        risksSkipped++;
        continue;
      }
      await tx.riskAssessment.create({
        data: {
          organizationId: org.id,
          subjectType: def.subjectType,
          subjectId,
          title: def.title,
          description: def.description,
          severity: def.severity,
          likelihood: def.likelihood,
          mitigation: def.mitigation,
          status: def.status,
          reviewDate: new Date(def.reviewDate),
          ownerId: adminUser?.id ?? null,
        },
      });
      risksCreated++;
    }
    console.log(`RiskAssessment: created ${risksCreated}, skipped ${risksSkipped}.`);

    // --- Controlled documents ---
    let docsCreated = 0;
    let docsSkipped = 0;
    for (const def of CONTROLLED_DOCUMENTS) {
      const existing = await tx.controlledDocument.findFirst({ where: { organizationId: org.id, title: def.title, version: def.version } });
      if (existing) {
        docsSkipped++;
        continue;
      }
      await tx.controlledDocument.create({
        data: {
          organizationId: org.id,
          title: def.title,
          category: def.category,
          version: def.version,
          effectiveDate: new Date(def.effectiveDate),
          approvedById: adminUser?.id ?? null,
          approvedAt: new Date(def.effectiveDate),
        },
      });
      docsCreated++;
    }
    console.log(`ControlledDocument: created ${docsCreated}, skipped ${docsSkipped}.`);
  });

  console.log("\nPhase 3 seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
