/**
 * Phase 4 of the comprehensive demo-data build (2026-10-08) — see
 * claude/demo-data-build.md for full context. Adds, per Lewis's request:
 *   1. Deeper CRM/stakeholder registry: a second contact per partner that
 *      only had one, standard PartnerCompanyCheck rows (the Bioconnections
 *      FORM 008.1 checks — Companies House, VAT, Website, Insurance,
 *      Location) for every Phase 1 partner, a PartnerApprovalHistory
 *      "APPROVED" row for every approved partner, and six additional
 *      StakeholderRegistryEntry rows NOT linked to any Partner — real-
 *      world companies known to the market but not yet onboarded, showing
 *      the registry's de-duplication value beyond a flat 1:1 with Partners.
 *   2. Historical pricing depth: a 6-month ProductPriceHistory trend
 *      (Apr-Sep 2026) for the products actually used in Phase 2 projects,
 *      feeding packages/insights-db's aggregate-etl.ts (which reads
 *      ProductPriceHistory directly) so the sector-insights dashboards
 *      show real trend lines instead of a single snapshot.
 *
 * Idempotent: skips by natural key (partner+checkType, partner+second-
 * contact-email, productMaster+effectiveDate, registry entry by
 * normalizedName) — safe to re-run.
 *
 * Usage (from packages/db), AFTER Phase 1/2/3:
 *   npx tsx scripts/seed-phase4-crm-pricing.ts
 * Then, from packages/insights-db, re-run the aggregation:
 *   npx tsx src/aggregate-etl.ts
 */
import { prisma, withTenantContext } from "../src/index";

const ORG_NAME = "Universe Demo";

// ---------------------------------------------------------------------------
// CRM depth
// ---------------------------------------------------------------------------

interface SecondContactDef {
  partnerName: string;
  name: string;
  email: string;
  phone: string;
  title: string;
}

const SECOND_CONTACTS: SecondContactDef[] = [
  { partnerName: "Guangzhou Sterile Devices Co.", name: "Mei Lin", email: "mei.lin@gzsterile.example.com", phone: "+86 20 3822 1191", title: "Finance Director" },
  { partnerName: "SkyBridge Freight & Logistics Ltd", name: "Sarah Chen", email: "sarah.chen@skybridgefreight.example.com", phone: "+44 161 820 3345", title: "Pharma Logistics Coordinator" },
  { partnerName: "Meridian Cargo Solutions SA", name: "Pierre Dubois", email: "pierre.dubois@meridiancargo.example.com", phone: "+41 22 715 6033", title: "Customs & Compliance Officer" },
  { partnerName: "Coldline Storage & Distribution Ltd", name: "Femke de Groot", email: "femke.degroot@coldlinestorage.example.com", phone: "+31 10 266 4472", title: "Quality & GDP Compliance Lead" },
  { partnerName: "National Medical Procurement Agency", name: "Samuel Kiptoo", email: "samuel.kiptoo@nmpa-demo.example.com", phone: "+254 20 271 3346", title: "Finance & Payments Officer" },
  { partnerName: "Horn of Africa Relief Consortium", name: "Meron Tesfaye", email: "meron.tesfaye@hoarelief.example.com", phone: "+251 11 662 7391", title: "Programme Finance Manager" },
  { partnerName: "Community Health Access Foundation", name: "Joseph Ssemakula", email: "joseph.ssemakula@chaf-demo.example.com", phone: "+256 41 425 6619", title: "Field Operations Lead" },
  { partnerName: "Pacific Islands Health Alliance", name: "Mele Fifita", email: "mele.fifita@pihalliance.example.com", phone: "+679 331 8821", title: "Finance Officer" },
];

const COMPANY_CHECK_TEMPLATES: { checkType: "COMPANIES_HOUSE_REGISTRATION" | "OTHER_NATIONAL_COMPANY_REGISTRATION" | "VAT_CERTIFICATE" | "WEBSITE" | "BUSINESS_INSURANCE" | "LOCATION"; comment: string }[] = [
  { checkType: "WEBSITE", comment: "Corporate website verified as active and consistent with stated business." },
  { checkType: "BUSINESS_INSURANCE", comment: "Certificate of insurance on file, current policy period confirmed." },
  { checkType: "LOCATION", comment: "Registered address confirmed via company registry lookup." },
];

// Not every org has a UK Companies House entry — use the country-appropriate
// registration check type instead where relevant.
function registrationCheckType(countryCode: string): "COMPANIES_HOUSE_REGISTRATION" | "OTHER_NATIONAL_COMPANY_REGISTRATION" {
  return countryCode === "GB" ? "COMPANIES_HOUSE_REGISTRATION" : "OTHER_NATIONAL_COMPANY_REGISTRATION";
}

interface RegistryOnlyDef {
  legalName: string;
  countryCode: string;
  website: string;
  registrationNumber: string;
  stakeholderTypes: string[];
}

// Companies known to the market (e.g. seen in other organisations'
// stakeholder evidence, or flagged during sourcing) but not yet onboarded
// as a Partner by THIS org — demonstrates the registry's cross-tenant
// de-duplication/autopopulate value beyond a flat 1:1 with Partner.
const REGISTRY_ONLY: RegistryOnlyDef[] = [
  { legalName: "Nordic BioSupplies AB", countryCode: "SE", website: "nordicbiosupplies.example.com", registrationNumber: "SE556-234-5678", stakeholderTypes: ["SUPPLIER"] },
  { legalName: "Istanbul Pharma Export Ltd", countryCode: "TR", website: "istanbulpharmaexport.example.com", registrationNumber: "TR-IST-2016-4471", stakeholderTypes: ["MANUFACTURER"] },
  { legalName: "Lagos Freight Partners Nigeria Ltd", countryCode: "NG", website: "lagosfreightpartners.example.com", registrationNumber: "RC-NG-889012", stakeholderTypes: ["FREIGHT_FORWARDER"] },
  { legalName: "Dhaka MedTech Industries", countryCode: "BD", website: "dhakamedtech.example.com", registrationNumber: "BD-DHK-2014-00231", stakeholderTypes: ["MANUFACTURER"] },
  { legalName: "São Paulo Cold Chain Logistics SA", countryCode: "BR", website: "spcoldchain.example.com", registrationNumber: "BR-CNPJ-12.345.678/0001-90", stakeholderTypes: ["WAREHOUSING", "FREIGHT_FORWARDER"] },
  { legalName: "Manila Essential Supplies Inc.", countryCode: "PH", website: "manilaessentialsupplies.example.com", registrationNumber: "PH-SEC-CS201712345", stakeholderTypes: ["SUPPLIER"] },
];

// ---------------------------------------------------------------------------
// Historical pricing
// ---------------------------------------------------------------------------

interface PriceSeriesDef {
  productMasterName: string;
  currency: string;
  // (month offset from 2026-04-01, price) pairs — one row per month
  monthlyPrices: { month: string; price: number }[];
}

const PRICE_SERIES: PriceSeriesDef[] = [
  {
    productMasterName: "Amoxicillin 500mg Capsules, blister pack of 100",
    currency: "EUR",
    monthlyPrices: [
      { month: "2026-04-01", price: 4.65 }, { month: "2026-05-01", price: 4.7 }, { month: "2026-06-01", price: 4.78 },
      { month: "2026-07-01", price: 4.8 }, { month: "2026-08-01", price: 4.82 }, { month: "2026-09-01", price: 4.85 },
    ],
  },
  {
    productMasterName: "Oral Rehydration Salts (ORS), sachet, WHO formula",
    currency: "EUR",
    monthlyPrices: [
      { month: "2026-04-01", price: 0.17 }, { month: "2026-05-01", price: 0.17 }, { month: "2026-06-01", price: 0.175 },
      { month: "2026-07-01", price: 0.18 }, { month: "2026-08-01", price: 0.18 }, { month: "2026-09-01", price: 0.18 },
    ],
  },
  {
    productMasterName: "Oxytocin 10 IU/ml Injection, ampoule",
    currency: "EUR",
    monthlyPrices: [
      { month: "2026-04-01", price: 0.39 }, { month: "2026-05-01", price: 0.4 }, { month: "2026-06-01", price: 0.4 },
      { month: "2026-07-01", price: 0.41 }, { month: "2026-08-01", price: 0.415 }, { month: "2026-09-01", price: 0.42 },
    ],
  },
  {
    productMasterName: "Surgical Face Mask, Type IIR, 3-ply, box of 50",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 5.8 }, { month: "2026-05-01", price: 5.9 }, { month: "2026-06-01", price: 6.0 },
      { month: "2026-07-01", price: 6.05 }, { month: "2026-08-01", price: 6.15 }, { month: "2026-09-01", price: 6.2 },
    ],
  },
  {
    productMasterName: "Nitrile Examination Gloves, Powder-Free, box of 100",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 7.9 }, { month: "2026-05-01", price: 8.0 }, { month: "2026-06-01", price: 8.1 },
      { month: "2026-07-01", price: 8.2 }, { month: "2026-08-01", price: 8.3 }, { month: "2026-09-01", price: 8.4 },
    ],
  },
  {
    productMasterName: "Solar-Powered Vaccine Refrigerator, 60L",
    currency: "GBP",
    monthlyPrices: [
      { month: "2026-04-01", price: 1390 }, { month: "2026-05-01", price: 1405 }, { month: "2026-06-01", price: 1415 },
      { month: "2026-07-01", price: 1425 }, { month: "2026-08-01", price: 1440 }, { month: "2026-09-01", price: 1450 },
    ],
  },
  {
    productMasterName: "Rapid Diagnostic Test Kit — Malaria (RDT), box of 25",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 21.0 }, { month: "2026-05-01", price: 21.3 }, { month: "2026-06-01", price: 21.8 },
      { month: "2026-07-01", price: 22.1 }, { month: "2026-08-01", price: 22.3 }, { month: "2026-09-01", price: 22.5 },
    ],
  },
  {
    productMasterName: "Rapid Diagnostic Test Kit — HIV (RDT), box of 30",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 18.5 }, { month: "2026-05-01", price: 18.8 }, { month: "2026-06-01", price: 19.1 },
      { month: "2026-07-01", price: 19.4 }, { month: "2026-08-01", price: 19.6 }, { month: "2026-09-01", price: 19.75 },
    ],
  },
  {
    productMasterName: "Oxygen Concentrator, 5L/min, portable",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 265 }, { month: "2026-05-01", price: 270 }, { month: "2026-06-01", price: 275 },
      { month: "2026-07-01", price: 278 }, { month: "2026-08-01", price: 282 }, { month: "2026-09-01", price: 285 },
    ],
  },
  {
    productMasterName: "Suture Kit, non-absorbable, 3-0, with needle",
    currency: "USD",
    monthlyPrices: [
      { month: "2026-04-01", price: 2.85 }, { month: "2026-05-01", price: 2.9 }, { month: "2026-06-01", price: 2.95 },
      { month: "2026-07-01", price: 3.0 }, { month: "2026-08-01", price: 3.05 }, { month: "2026-09-01", price: 3.1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(ltd|limited|gmbh|inc|co|sa|plc|llc|srl|pty)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    throw new Error(`No organization found named "${ORG_NAME}" — run provision-universe-demo.ts first.`);
  }
  console.log(`Seeding Phase 4 demo data into "${org.name}" (${org.id})...\n`);

  await withTenantContext(org.id, async (tx) => {
    // --- Second contacts ---
    let contactsCreated = 0;
    for (const def of SECOND_CONTACTS) {
      const partner = await tx.partner.findFirst({ where: { organizationId: org.id, name: def.partnerName } });
      if (!partner) {
        console.warn(`  [contact] partner "${def.partnerName}" not found — skipping`);
        continue;
      }
      const existing = await tx.contact.findFirst({ where: { organizationId: org.id, partnerId: partner.id, email: def.email } });
      if (existing) continue;
      await tx.contact.create({
        data: { organizationId: org.id, partnerId: partner.id, name: def.name, email: def.email, phone: def.phone, title: def.title },
      });
      contactsCreated++;
    }
    console.log(`Contacts: created ${contactsCreated} additional.`);

    // --- Company checks + approval history, for every Phase 1 partner ---
    const allPartners = await tx.partner.findMany({ where: { organizationId: org.id } });
    let checksCreated = 0;
    let historyCreated = 0;
    for (const partner of allPartners) {
      const checkTypes = [
        { checkType: registrationCheckType(partner.countryCode ?? ""), comment: "Registration confirmed against national company registry." },
        ...COMPANY_CHECK_TEMPLATES,
      ];
      for (const check of checkTypes) {
        const existing = await tx.partnerCompanyCheck.findFirst({ where: { organizationId: org.id, partnerId: partner.id, checkType: check.checkType } });
        if (existing) continue;
        await tx.partnerCompanyCheck.create({
          data: {
            organizationId: org.id,
            partnerId: partner.id,
            checkType: check.checkType,
            result: "YES",
            checkedDate: new Date("2026-06-15"),
            referenceOrSource: partner.companyRegistrationNumber,
            comment: check.comment,
          },
        });
        checksCreated++;
      }

      if (partner.approvalStatus === "APPROVED") {
        const existing = await tx.partnerApprovalHistory.findFirst({ where: { organizationId: org.id, partnerId: partner.id, action: "APPROVED" } });
        if (!existing) {
          await tx.partnerApprovalHistory.create({
            data: {
              organizationId: org.id,
              partnerId: partner.id,
              action: "APPROVED",
              reason: "Standard onboarding checks and evidence review completed.",
              actionDate: new Date("2026-06-15"),
            },
          });
          historyCreated++;
        }
      }
    }
    console.log(`PartnerCompanyCheck: created ${checksCreated}. PartnerApprovalHistory: created ${historyCreated}.`);

    // --- Registry-only entries (not linked to any Partner) ---
    let registryCreated = 0;
    let registrySkipped = 0;
    for (const def of REGISTRY_ONLY) {
      const normalizedName = normalize(def.legalName);
      const existing = await tx.stakeholderRegistryEntry.findFirst({ where: { normalizedName } });
      if (existing) {
        registrySkipped++;
        continue;
      }
      await tx.stakeholderRegistryEntry.create({
        data: {
          normalizedName,
          legalName: def.legalName,
          countryCode: def.countryCode,
          website: def.website,
          registrationNumber: def.registrationNumber,
          stakeholderTypes: JSON.stringify(def.stakeholderTypes),
        },
      });
      registryCreated++;
    }
    console.log(`StakeholderRegistryEntry (registry-only): created ${registryCreated}, skipped ${registrySkipped}.`);

    // --- Historical pricing ---
    let priceRowsCreated = 0;
    let priceRowsSkipped = 0;
    for (const series of PRICE_SERIES) {
      const productMaster = await tx.productMaster.findFirst({ where: { name: series.productMasterName } });
      if (!productMaster) {
        console.warn(`  [price] product "${series.productMasterName}" not found — skipping`);
        continue;
      }
      for (const point of series.monthlyPrices) {
        const existing = await tx.productPriceHistory.findFirst({
          where: { organizationId: org.id, productMasterId: productMaster.id, effectiveDate: new Date(point.month) },
        });
        if (existing) {
          priceRowsSkipped++;
          continue;
        }
        await tx.productPriceHistory.create({
          data: {
            organizationId: org.id,
            productMasterId: productMaster.id,
            unitPrice: point.price,
            currency: series.currency,
            effectiveDate: new Date(point.month),
          },
        });
        priceRowsCreated++;
      }
    }
    console.log(`ProductPriceHistory: created ${priceRowsCreated}, skipped ${priceRowsSkipped}.`);
  });

  console.log("\nPhase 4 seed complete. Next: from packages/insights-db, run `npx tsx src/aggregate-etl.ts` to re-aggregate insights with the new price history.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
