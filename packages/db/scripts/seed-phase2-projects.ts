/**
 * Phase 2 of the comprehensive demo-data build (2026-10-08) — see Phase 1's
 * seed-phase1-partners-products.ts for the full context. Seeds a moderate
 * volume of Projects (headers) and ProjectLines (items) spanning the full
 * pipeline (IDENTIFIED -> IN_PROGRESS -> SUBMITTED -> AWARDED -> COMPLETED,
 * plus one UNAWARDED), referencing the partners and catalog products Phase 1
 * created, so Phase 2 MUST run after Phase 1.
 *
 * Scope deliberately excludes:
 *   - The currency-conversion lock fields (reportingCurrencyCode,
 *     *ExchangeRateSnapshotId, *ReportingCcy) — these are a real, versioned
 *     computation (ExchangeRatesService) keyed to actual ExchangeRateSnapshot
 *     rows for the exact date a price was saved; fabricating them by hand
 *     risks internally-inconsistent "locked" figures that don't match what
 *     the real pricing service would have produced. Core financial fields
 *     (supplierUnitPrice, productMarginPercent, clientPaymentAmount, etc.)
 *     ARE seeded — only the base-currency lock/snapshot layer on top is left
 *     for the real app to compute next time a price is touched in the UI.
 *   - ProjectLineLogisticsMetric — computed server-side by
 *     LogisticsMetricsService. This script seeds the INPUTS it needs
 *     (Project.deliveryCountryCode, Project.freightMode,
 *     ProjectLine.countryOfManufactureCode) and the metrics themselves
 *     should be generated afterward by re-running the existing
 *     `npm run backfill:logistics-metrics`.
 *   - ProductBatch / BatchTemperatureLog / RiskAssessment /
 *     ControlledDocument / StakeholderEvidenceRecord (the GDP quality/
 *     compliance tables) — deferred to a follow-up pass; flagged in the
 *     handoff notes, not silently skipped.
 *
 * Idempotent by (organizationId, referenceNumber) — safe to re-run.
 *
 * Usage (from packages/db), AFTER seed-phase1-partners-products.ts:
 *   npx tsx scripts/seed-phase2-projects.ts
 */
import { prisma, withTenantContext } from "../src/index";

const ORG_NAME = "Universe Demo";

interface LineDef {
  clientProductDescription: string;
  productMasterName: string; // looked up against ProductMaster.name
  quantity: number;
  countryOfManufactureCode: string;
  manufacturerName?: string; // looked up against Partner.name
  supplierName?: string;
  supplierUnitPrice: number;
  supplierCurrency: string;
  productMarginPercent: number;
  productCategory: string;
  // pharma-only
  batchNumber?: string;
  expiryDate?: string;
  strength?: string;
  form?: string;
}

interface ProjectDef {
  referenceNumber: string;
  title: string;
  category: "PROCUREMENT" | "TECHNICAL_ASSISTANCE";
  projectType: "PHARMACEUTICAL" | "NON_PHARMACEUTICAL";
  clientName: string; // looked up against Partner.name
  status: "IDENTIFIED" | "IN_PROGRESS" | "SUBMITTED" | "AWARDED" | "COMPLETED" | "UNAWARDED";
  startDate: string;
  dueDate?: string;
  submissionDate?: string;
  deliveryCountryCode: string;
  incoterm: string;
  freightMode: "AIR" | "SEA" | "LAND";
  freightForwarderName?: string;
  freightCost?: number;
  freightCurrency?: string;
  lines: LineDef[];
}

const PROJECTS: ProjectDef[] = [
  {
    referenceNumber: "UNV-2026-001",
    title: "Essential Medicines Replenishment — National Medical Procurement Agency",
    category: "PROCUREMENT",
    projectType: "PHARMACEUTICAL",
    clientName: "National Medical Procurement Agency",
    status: "COMPLETED",
    startDate: "2026-04-02",
    dueDate: "2026-06-15",
    submissionDate: "2026-04-10",
    deliveryCountryCode: "KE",
    incoterm: "CIP",
    freightMode: "AIR",
    freightForwarderName: "SkyBridge Freight & Logistics Ltd",
    freightCost: 18500,
    freightCurrency: "USD",
    lines: [
      {
        clientProductDescription: "Amoxicillin 500mg Capsules — quarterly replenishment",
        productMasterName: "Amoxicillin 500mg Capsules, blister pack of 100",
        quantity: 20000,
        countryOfManufactureCode: "DE",
        manufacturerName: "Rhein Pharma Produktion GmbH",
        supplierName: "Rhein Pharma Produktion GmbH",
        supplierUnitPrice: 4.85,
        supplierCurrency: "EUR",
        productMarginPercent: 12,
        productCategory: "PHARMACEUTICALS",
        batchNumber: "RP-AMX-2602",
        expiryDate: "2028-02-28",
        strength: "500mg",
        form: "Capsule",
      },
      {
        clientProductDescription: "Oral Rehydration Salts — buffer stock",
        productMasterName: "Oral Rehydration Salts (ORS), sachet, WHO formula",
        quantity: 50000,
        countryOfManufactureCode: "DE",
        manufacturerName: "Rhein Pharma Produktion GmbH",
        supplierName: "Rhein Pharma Produktion GmbH",
        supplierUnitPrice: 0.18,
        supplierCurrency: "EUR",
        productMarginPercent: 10,
        productCategory: "PHARMACEUTICALS",
        batchNumber: "RP-ORS-2611",
        expiryDate: "2028-11-30",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-002",
    title: "Emergency PPE Consignment — Horn of Africa Relief Consortium",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Horn of Africa Relief Consortium",
    status: "COMPLETED",
    startDate: "2026-02-10",
    dueDate: "2026-03-20",
    submissionDate: "2026-02-14",
    deliveryCountryCode: "ET",
    incoterm: "DAP",
    freightMode: "AIR",
    freightForwarderName: "SkyBridge Freight & Logistics Ltd",
    freightCost: 9800,
    freightCurrency: "USD",
    lines: [
      {
        clientProductDescription: "Surgical masks and nitrile gloves for field clinics",
        productMasterName: "Surgical Face Mask, Type IIR, 3-ply, box of 50",
        quantity: 8000,
        countryOfManufactureCode: "CN",
        manufacturerName: "Guangzhou Sterile Devices Co.",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 6.2,
        supplierCurrency: "USD",
        productMarginPercent: 15,
        productCategory: "CONSUMABLES",
      },
      {
        clientProductDescription: "Nitrile examination gloves, powder-free",
        productMasterName: "Nitrile Examination Gloves, Powder-Free, box of 100",
        quantity: 5000,
        countryOfManufactureCode: "CN",
        manufacturerName: "Guangzhou Sterile Devices Co.",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 8.4,
        supplierCurrency: "USD",
        productMarginPercent: 15,
        productCategory: "CONSUMABLES",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-003",
    title: "Cold-Chain Equipment Upgrade — Community Health Access Foundation",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Community Health Access Foundation",
    status: "AWARDED",
    startDate: "2026-07-01",
    dueDate: "2026-09-30",
    submissionDate: "2026-07-05",
    deliveryCountryCode: "UG",
    incoterm: "DDP",
    freightMode: "SEA",
    freightForwarderName: "Meridian Cargo Solutions SA",
    freightCost: 6400,
    freightCurrency: "USD",
    lines: [
      {
        clientProductDescription: "Solar-powered vaccine refrigerators for 6 rural health centres",
        productMasterName: "Solar-Powered Vaccine Refrigerator, 60L",
        quantity: 6,
        countryOfManufactureCode: "IN",
        manufacturerName: "Apex MedTech Manufacturing Ltd",
        supplierName: "Horizon Health Procurement Ltd",
        supplierUnitPrice: 1450,
        supplierCurrency: "GBP",
        productMarginPercent: 14,
        productCategory: "EQUIPMENT",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-004",
    title: "Malaria & HIV Rapid Test Kit Supply — National Medical Procurement Agency",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "National Medical Procurement Agency",
    status: "AWARDED",
    startDate: "2026-08-01",
    dueDate: "2026-10-15",
    submissionDate: "2026-08-04",
    deliveryCountryCode: "KE",
    incoterm: "CPT",
    freightMode: "AIR",
    freightForwarderName: "SkyBridge Freight & Logistics Ltd",
    freightCost: 7200,
    freightCurrency: "USD",
    lines: [
      {
        clientProductDescription: "Malaria RDT kits, box of 25",
        productMasterName: "Rapid Diagnostic Test Kit — Malaria (RDT), box of 25",
        quantity: 3000,
        countryOfManufactureCode: "IN",
        manufacturerName: "Apex MedTech Manufacturing Ltd",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 22.5,
        supplierCurrency: "USD",
        productMarginPercent: 13,
        productCategory: "DEVICES",
      },
      {
        clientProductDescription: "HIV RDT kits, box of 30",
        productMasterName: "Rapid Diagnostic Test Kit — HIV (RDT), box of 30",
        quantity: 2000,
        countryOfManufactureCode: "IN",
        manufacturerName: "Apex MedTech Manufacturing Ltd",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 19.75,
        supplierCurrency: "USD",
        productMarginPercent: 13,
        productCategory: "DEVICES",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-005",
    title: "Maternal Health Commodities — Horn of Africa Relief Consortium",
    category: "PROCUREMENT",
    projectType: "PHARMACEUTICAL",
    clientName: "Horn of Africa Relief Consortium",
    status: "SUBMITTED",
    startDate: "2026-09-10",
    dueDate: "2026-11-01",
    submissionDate: "2026-09-18",
    deliveryCountryCode: "ET",
    incoterm: "CIF",
    freightMode: "SEA",
    freightForwarderName: "Meridian Cargo Solutions SA",
    lines: [
      {
        clientProductDescription: "Oxytocin 10 IU/ml injection for maternal health programme",
        productMasterName: "Oxytocin 10 IU/ml Injection, ampoule",
        quantity: 15000,
        countryOfManufactureCode: "DE",
        manufacturerName: "Rhein Pharma Produktion GmbH",
        supplierName: "Rhein Pharma Produktion GmbH",
        supplierUnitPrice: 0.42,
        supplierCurrency: "EUR",
        productMarginPercent: 11,
        productCategory: "PHARMACEUTICALS",
        batchNumber: "RP-OXY-2609",
        expiryDate: "2027-09-30",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-006",
    title: "Surgical Instrument Kits — Pacific Islands Health Alliance",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Pacific Islands Health Alliance",
    status: "SUBMITTED",
    startDate: "2026-09-20",
    dueDate: "2026-11-30",
    submissionDate: "2026-09-25",
    deliveryCountryCode: "FJ",
    incoterm: "FOB",
    freightMode: "SEA",
    freightForwarderName: "Meridian Cargo Solutions SA",
    lines: [
      {
        clientProductDescription: "Disposable suture kits for district hospital theatres",
        productMasterName: "Suture Kit, non-absorbable, 3-0, with needle",
        quantity: 2500,
        countryOfManufactureCode: "CN",
        manufacturerName: "Guangzhou Sterile Devices Co.",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 3.1,
        supplierCurrency: "USD",
        productMarginPercent: 16,
        productCategory: "DEVICES",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-007",
    title: "Portable Diagnostic Imaging — Community Health Access Foundation",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Community Health Access Foundation",
    status: "IN_PROGRESS",
    startDate: "2026-09-25",
    dueDate: "2026-12-10",
    deliveryCountryCode: "UG",
    incoterm: "DAP",
    freightMode: "AIR",
    freightForwarderName: "SkyBridge Freight & Logistics Ltd",
    lines: [
      {
        clientProductDescription: "Handheld ultrasound scanners for outreach teams",
        productMasterName: "Portable Ultrasound Scanner, handheld, battery-powered",
        quantity: 10,
        countryOfManufactureCode: "IN",
        manufacturerName: "Apex MedTech Manufacturing Ltd",
        supplierName: "Horizon Health Procurement Ltd",
        supplierUnitPrice: 3200,
        supplierCurrency: "GBP",
        productMarginPercent: 10,
        productCategory: "DEVICES",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-008",
    title: "Oxygen Therapy Equipment — National Medical Procurement Agency",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "National Medical Procurement Agency",
    status: "IN_PROGRESS",
    startDate: "2026-09-28",
    dueDate: "2026-12-20",
    deliveryCountryCode: "KE",
    incoterm: "CPT",
    freightMode: "AIR",
    freightForwarderName: "SkyBridge Freight & Logistics Ltd",
    lines: [
      {
        clientProductDescription: "Portable oxygen concentrators for regional hospitals",
        productMasterName: "Oxygen Concentrator, 5L/min, portable",
        quantity: 40,
        countryOfManufactureCode: "CN",
        manufacturerName: "Guangzhou Sterile Devices Co.",
        supplierName: "MedSource Global Supplies Inc.",
        supplierUnitPrice: 285,
        supplierCurrency: "USD",
        productMarginPercent: 12,
        productCategory: "EQUIPMENT",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-009",
    title: "Routine Immunization Cold Chain Audit & Supply",
    category: "TECHNICAL_ASSISTANCE",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Horn of Africa Relief Consortium",
    status: "IDENTIFIED",
    startDate: "2026-10-01",
    deliveryCountryCode: "ET",
    incoterm: "EXW",
    freightMode: "LAND",
    lines: [
      {
        clientProductDescription: "Vaccine carriers for last-mile cold chain (scoping stage)",
        productMasterName: "Vaccine Carrier, cold-chain, 4x 0.3L ice packs",
        quantity: 200,
        countryOfManufactureCode: "IN",
        manufacturerName: "Apex MedTech Manufacturing Ltd",
        supplierUnitPrice: 35,
        supplierCurrency: "USD",
        productMarginPercent: 15,
        productCategory: "EQUIPMENT",
      },
    ],
  },
  {
    referenceNumber: "UNV-2026-010",
    title: "Laboratory Reagent Framework — Pacific Islands Health Alliance",
    category: "PROCUREMENT",
    projectType: "NON_PHARMACEUTICAL",
    clientName: "Pacific Islands Health Alliance",
    status: "UNAWARDED",
    startDate: "2026-05-01",
    dueDate: "2026-06-30",
    submissionDate: "2026-05-15",
    deliveryCountryCode: "FJ",
    incoterm: "FOB",
    freightMode: "SEA",
    freightForwarderName: "Meridian Cargo Solutions SA",
    lines: [
      {
        clientProductDescription: "HbA1c test reagent cartridges — framework tender, not awarded",
        productMasterName: "HbA1c Test Reagent Cartridge, box of 10",
        quantity: 500,
        countryOfManufactureCode: "DE",
        manufacturerName: "Rhein Pharma Produktion GmbH",
        supplierName: "Horizon Health Procurement Ltd",
        supplierUnitPrice: 42,
        supplierCurrency: "GBP",
        productMarginPercent: 10,
        productCategory: "LABORATORY",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    throw new Error(`No organization found named "${ORG_NAME}" — run provision-universe-demo.ts first.`);
  }
  console.log(`Seeding Phase 2 demo data into "${org.name}" (${org.id})...\n`);

  await withTenantContext(org.id, async (tx) => {
    let created = 0;
    let skipped = 0;

    for (const def of PROJECTS) {
      const existing = await tx.project.findFirst({ where: { organizationId: org.id, referenceNumber: def.referenceNumber } });
      if (existing) {
        skipped++;
        continue;
      }

      const client = await tx.partner.findFirst({ where: { organizationId: org.id, name: def.clientName } });
      if (!client) {
        throw new Error(`Client partner "${def.clientName}" not found — run seed-phase1-partners-products.ts first.`);
      }
      const freightForwarder = def.freightForwarderName
        ? await tx.partner.findFirst({ where: { organizationId: org.id, name: def.freightForwarderName } })
        : null;

      const freightCost = def.freightCost ?? null;
      const freightCurrency = def.freightCurrency ?? null;

      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          referenceNumber: def.referenceNumber,
          title: def.title,
          category: def.category,
          projectType: def.projectType,
          clientId: client.id,
          deliveryCountryCode: def.deliveryCountryCode,
          status: def.status,
          startDate: new Date(def.startDate),
          dueDate: def.dueDate ? new Date(def.dueDate) : null,
          submissionDate: def.submissionDate ? new Date(def.submissionDate) : null,
          incoterm: def.incoterm,
          freightMode: def.freightMode,
          freightForwarderId: freightForwarder?.id ?? null,
          freightCost,
          freightCurrency,
          freightTotalCost: freightCost, // no insurance/additional-cost breakdown seeded — see scope note
        },
      });

      for (const lineDef of def.lines) {
        const productMaster = await tx.productMaster.findFirst({ where: { name: lineDef.productMasterName } });
        const manufacturer = lineDef.manufacturerName
          ? await tx.partner.findFirst({ where: { organizationId: org.id, name: lineDef.manufacturerName } })
          : null;
        const supplier = lineDef.supplierName
          ? await tx.partner.findFirst({ where: { organizationId: org.id, name: lineDef.supplierName } })
          : null;

        const supplierTotal = lineDef.supplierUnitPrice * lineDef.quantity;
        const productMarginAmount = supplierTotal * (lineDef.productMarginPercent / 100);
        const unitSalesPrice = lineDef.supplierUnitPrice * (1 + lineDef.productMarginPercent / 100);
        const clientPaymentAmount = supplierTotal + productMarginAmount;

        await tx.projectLine.create({
          data: {
            organizationId: org.id,
            projectId: project.id,
            clientProductDescription: lineDef.clientProductDescription,
            productMasterId: productMaster?.id ?? null,
            quantity: lineDef.quantity,
            productCategory: lineDef.productCategory,
            countryOfManufactureCode: lineDef.countryOfManufactureCode,
            manufacturerId: manufacturer?.id ?? null,
            supplierId: supplier?.id ?? null,
            supplierUnitPrice: lineDef.supplierUnitPrice,
            supplierPaymentAmountTotal: supplierTotal,
            supplierPaymentCurrency: lineDef.supplierCurrency,
            productMarginPercent: lineDef.productMarginPercent,
            productMarginAmount,
            unitSalesPrice,
            clientPaymentAmount,
            clientPaymentCurrency: lineDef.supplierCurrency,
            batchNumber: lineDef.batchNumber ?? null,
            expiryDate: lineDef.expiryDate ? new Date(lineDef.expiryDate) : null,
            strength: lineDef.strength ?? null,
            form: lineDef.form ?? null,
          },
        });
      }

      created++;
      console.log(`  created project: ${def.referenceNumber} — ${def.title} [${def.status}] (${def.lines.length} line(s))`);
    }

    console.log(`\nProjects: created ${created}, skipped ${skipped} (already present).`);
  });

  console.log("\nPhase 2 seed complete. Next: run `npm run backfill:logistics-metrics` to compute CO2/distance metrics for these lines.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
