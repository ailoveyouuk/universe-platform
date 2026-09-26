/**
 * One-off enrichment script for the Unimed pilot — added 2026-09-26, Phase 1
 * of admin-onboarding-intake-spec.md (category-specific detail tables).
 *
 * Fills in Unimed's real universal onboarding fields plus its
 * ProcurementAgentProfile, using the exact data captured and sourced in
 * claude/unimed-onboarding-pilot.md (Companies House record, Certificate of
 * Incorporation, VAT certificate, company profile document, insurance
 * broker letter). This is the proof that the new schema actually holds real
 * onboarding data, not just a hypothetical field list — same spirit as
 * provision-unimed-pilot.ts proving out the org+user+role provisioning path.
 *
 * Run on a machine that can reach the real Azure SQL database (this sandbox
 * cannot), with DATABASE_URL set to the app connection string:
 *
 *   npx.cmd tsx scripts/enrich-unimed-onboarding-data.ts
 *
 * Idempotent: upserts by organizationId, safe to re-run.
 */
import { prisma } from "../src/index";
import { OrganizationLegalEntityType, OrganizationOnboardingSource, LogisticsCapability } from "../src/enums";

const UNIMED_SLUG = "unimed-pilot";

// Named country examples from the company profile document — NOT the full
// 64-country operational footprint (that granular list wasn't itemized in
// the source document), just the specific countries named against specific
// funders/clients. Worth revisiting if the full list is ever compiled.
const NAMED_COUNTRY_CODES = ["GB", "US", "KE", "EC", "HN", "NI", "LB"];

async function main() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: UNIMED_SLUG } });

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      legalName: "Unimed Procurement Services Limited",
      legalEntityType: OrganizationLegalEntityType.PRIVATE_COMPANY,
      countryOfRegistrationCode: "GB",
      registrationNumber: "11311402",
      website: "unimedps.com",
      primaryContactName: "Shameet Thakkar",
      primaryContactTitle: "Managing Director",
      primaryContactEmail: "shameet@unimedps.com",
      primaryContactPhone: "+44 (0)116 464 8401",
      onboardingSource: OrganizationOnboardingSource.PLATFORM_STAFF_OUTREACH,
      notes:
        "Registered office: The Old Mill, 9 Soar Lane, Leicester, LE3 5DE. " +
        "Principal place of business: 190 London Road, Leicester, LE2 1ND. " +
        "VAT number 301 6376 34 (effective 1 Aug 2018). SIC codes: 46460 " +
        "(Wholesale of pharmaceutical goods, current) and 46180 (Agents " +
        "specialised in the sale of other particular products, 2020 VAT " +
        "certificate — may be superseded by 46460). Incorporated 16 April " +
        "2018. Regional offices added 2025: Unimed Americas (USA), Unimed " +
        "Africa (Kenya). Operates in 64 countries total.",
    },
  });

  for (const countryCode of NAMED_COUNTRY_CODES) {
    await prisma.organizationCountryPresence.upsert({
      where: { organizationId_countryCode: { organizationId: org.id, countryCode } },
      update: {},
      create: { organizationId: org.id, countryCode },
    });
  }

  await prisma.procurementAgentProfile.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      fundersProgramsOperatedUnder: JSON.stringify([
        "USAID GHSC-PSM (via a Basic Ordering Agreement with Chemonics International, since 2019)",
        "PAHO Strategic Fund (since 2023)",
        "MEDS Kenya (Basic Ordering Agreement)",
        "Order of Malta / Lebanese Association, Ministry of Health Lebanon (since 2024)",
      ]),
      productCategoriesProcured: JSON.stringify([
        "Pharmaceuticals",
        "Laboratory & medical consumables",
        "Medical devices",
        "Medical equipment",
      ]),
      clientTypesServed: JSON.stringify([
        "Multilateral health organizations (PAHO/WHO)",
        "National governments (Ministries of Health)",
        "USAID implementing partners",
        "Faith-based humanitarian organizations",
      ]),
      accreditations: JSON.stringify([
        "ISO 9001:2015",
        "ISO 14001",
        "GDP (Good Distribution Practice)",
        "UK Wholesale Dealer's Authorisation (Human medicines) — WDA(H) 49878",
        "Certificate of Good Standing",
      ]),
      logisticsCapability: LogisticsCapability.SUBCONTRACTED,
      yearsOperatingInRole: 8,
      insuranceCoverSummary:
        "Markel (UK) Ltd — Professional & Products Liability £5m aggregate, " +
        "Employers' Liability £10m/claim, Public Liability £5m/claim. " +
        "Excludes Ranitidine, infusion pumps, urogynaecology mesh, " +
        "HIV/AIDS/TSE/Viral Hepatitis treatments.",
      insuranceExpiryDate: new Date("2027-03-30"),
      trackRecordSummary:
        "~850 completed projects across 64 countries, 2018–2026. " +
        "Pre-qualified network of 250 manufacturers/suppliers across 16 " +
        "countries. Freight forwarding via 6 partners (including DHL).",
    },
  });

  console.log(`Enriched "${org.name}" (${org.id}) with real onboarding data.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
