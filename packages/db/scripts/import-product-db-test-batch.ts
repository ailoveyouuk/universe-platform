/**
 * Test-batch import for the Product Database cleanup effort
 * (claude/product-catalog-build.md / stakeholder-registry-build.md build
 * on this; see the project doc written after this run for the full
 * writeup). Imports exactly the 9 real rows from Product_Database_LIVE.xlsx
 * whose Purchase Order Date falls in the last ~3 months (2026-07-10 to
 * 2026-09-11, across PO15811/PO15813/PO15814) — a small, hand-reviewed
 * slice, not the full ~890-row database. Confirmed with Lewis against the
 * "product-db-cleanup-test-block-review.xlsx" workbook before this script
 * was written.
 *
 * Deliberately NOT a generic importer: the canonicalization decisions
 * below (which raw names merge, which stay separate, which category each
 * row maps to) are hand-verified for these 9 rows specifically, following
 * the same soft-gating/registry-matching/evidence model already built —
 * see each inline comment for the judgment call it encodes. Re-running
 * this script is safe (idempotent — matches on normalizedName/name before
 * creating anything) but it is NOT the shape the eventual full-database
 * importer should copy verbatim; that one needs the fuzzy-matching +
 * human-review pass this test batch stood in for by hand.
 *
 * Run from the repo root on a machine with a working DATABASE_URL:
 *   cd packages/db
 *   npm run import:product-db-test-batch
 */
import { prisma, withTenantContext } from "../src/index";

function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|gmbh|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type StakeholderSeed = { canonicalName: string; roles: ("SUPPLIER" | "MANUFACTURER")[] };

const STAKEHOLDERS: StakeholderSeed[] = [
  { canonicalName: "Yifeng Yingtai", roles: ["SUPPLIER"] },
  { canonicalName: "Taizhou Rich", roles: ["MANUFACTURER"] },
  { canonicalName: "Jiangyin Nanquan", roles: ["MANUFACTURER"] },
  { canonicalName: "Zarys International", roles: ["SUPPLIER", "MANUFACTURER"] },
  { canonicalName: "Globus", roles: ["SUPPLIER"] },
  { canonicalName: "Globus (Anhui Intco Medical Products)", roles: ["MANUFACTURER"] },
];

const COMPANY_EVIDENCE: { stakeholder: string; standardName: string; verifiedAt: string }[] = [
  { stakeholder: "Yifeng Yingtai", standardName: "ISO 9001 — Quality Management System Certificate", verifiedAt: "2026-07-10" },
  { stakeholder: "Taizhou Rich", standardName: "ISO 13485 — Medical Devices QMS Certificate", verifiedAt: "2026-07-10" },
  { stakeholder: "Jiangyin Nanquan", standardName: "ISO 13485 — Medical Devices QMS Certificate", verifiedAt: "2026-07-10" },
  { stakeholder: "Zarys International", standardName: "ISO 13485 — Medical Devices QMS Certificate", verifiedAt: "2026-08-04" },
  { stakeholder: "Globus", standardName: "ISO 9001 — Quality Management System Certificate", verifiedAt: "2026-09-11" },
  { stakeholder: "Globus (Anhui Intco Medical Products)", standardName: "ISO 13485 — Medical Devices QMS Certificate", verifiedAt: "2026-09-11" },
];

type ProductSeed = { name: string; category: string };

const PRODUCTS: ProductSeed[] = [
  { name: "Cotton roll absorbent sterile 1lb", category: "Medical device /IVD" },
  { name: "Foil wrap, 220x140cm, survival blanket", category: "Consumable" },
  { name: "Syringe, 10ml, 3pc, luer slip, with Needle 22gx1.25'', disposable, sterile, blister packing", category: "Medical device /IVD" },
  { name: "Syringe, 3ml, 3pc, luer slip, with Needle 21gx1.5'', disposable, sterile, blister packing", category: "Medical device /IVD" },
  { name: "Examination Gloves (Latex), Powder-Free, Non-Sterile, 100 Each [Zarys]", category: "PPE" },
  { name: "Nitrile examination gloves, latex-free, powder-free, single-use", category: "PPE" },
];

type LineSeed = {
  poRef: string;
  poDate: string;
  officerNames: string[];
  customerPoProductName: string;
  productSeedName: string;
  stakeholderSupplier: string;
  stakeholderManufacturer: string;
  manufacturerPartNumber: string | null;
  unitOfSupply: string;
  exactMatchFlag: boolean;
  productType: string;
  storageRequirement: string;
  supplierProductDescription: string;
  productCertificationExpiry: string | null;
  matchNotes: string;
};

const LINES: LineSeed[] = [
  {
    poRef: "PO15811", poDate: "2026-07-10", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Cotton roll absorbent sterile 1lb",
    productSeedName: "Cotton roll absorbent sterile 1lb",
    stakeholderSupplier: "Yifeng Yingtai", stakeholderManufacturer: "Taizhou Rich",
    manufacturerPartNumber: null, unitOfSupply: "Each", exactMatchFlag: true,
    productType: "Medical device /IVD", storageRequirement: "Ambient",
    supplierProductDescription: "Cotton Roll, Absorbent, 1LB, sterile, each roll",
    productCertificationExpiry: "2024-05-27",
    matchNotes:
      "TEST BATCH IMPORT. Source cert text: \"DD 60140545 0001 exp 27-May-2024 and ext letter 326006719\" " +
      "— imported expiry as 27-May-2024 (already expired as of import). The extension letter " +
      "(ref 326006719) referenced alongside it has no date in the source sheet, so it could NOT be " +
      "used to extend the expiry here — someone needs to check the actual letter before treating this " +
      "as current. \"Taizhou Rich\" was flagged against a separate \"Taizhou Bright\" elsewhere in the " +
      "full database during review — kept as a distinct manufacturer pending confirmation.",
  },
  {
    poRef: "PO15811", poDate: "2026-07-10", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Foil wrap, 220x140cm, survival blanket",
    productSeedName: "Foil wrap, 220x140cm, survival blanket",
    stakeholderSupplier: "Yifeng Yingtai", stakeholderManufacturer: "Taizhou Rich",
    manufacturerPartNumber: null, unitOfSupply: "Each", exactMatchFlag: true,
    productType: "Consumable", storageRequirement: "Ambient",
    supplierProductDescription: "Foil Wrap Survival Blanket, 220x140cm, each",
    productCertificationExpiry: null,
    matchNotes: "TEST BATCH IMPORT. Source cert field was literally \"n/a\" — no product-level certification on file for this line.",
  },
  {
    poRef: "PO15811", poDate: "2026-07-10", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Syringe, 10ml, 3pc, luer slip, with Needle 22gx1.25'', disposable, sterile, blister packing",
    productSeedName: "Syringe, 10ml, 3pc, luer slip, with Needle 22gx1.25'', disposable, sterile, blister packing",
    stakeholderSupplier: "Yifeng Yingtai", stakeholderManufacturer: "Jiangyin Nanquan",
    manufacturerPartNumber: null, unitOfSupply: "100/box", exactMatchFlag: true,
    productType: "Medical device /IVD", storageRequirement: "Ambient",
    supplierProductDescription: "Syringe, 10ml, 3pc, luer slip, with needle 22Gx1.25'', disposable, sterile, blister packing, 100pcs/box",
    productCertificationExpiry: "2029-04-08",
    matchNotes:
      "TEST BATCH IMPORT. Source cert: \"MDR G20 071195 0013 exp 08-Apr-2029\". " +
      "\"Jiangyin Nanquan\" was flagged against a near-identical \"Jianyin Nanquan\" (one letter " +
      "different) elsewhere in the full database — near-certain same company, kept separate pending your confirmation to merge.",
  },
  {
    poRef: "PO15811", poDate: "2026-07-10", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Syringe, 3ml, 3pc, luer slip, with Needle 21gx1.5'', disposable, sterile, blister packing",
    productSeedName: "Syringe, 3ml, 3pc, luer slip, with Needle 21gx1.5'', disposable, sterile, blister packing",
    stakeholderSupplier: "Yifeng Yingtai", stakeholderManufacturer: "Jiangyin Nanquan",
    manufacturerPartNumber: null, unitOfSupply: "100/box", exactMatchFlag: true,
    productType: "Medical device /IVD", storageRequirement: "Ambient",
    supplierProductDescription: "Syringe, 3ml, 3pc, luer slip, with needle 21Gx1.5'', disposable, sterile, blister packing, 100pcs/box",
    productCertificationExpiry: "2029-04-08",
    matchNotes: "TEST BATCH IMPORT. Same certificate (MDR G20 071195 0013) as the 10ml syringe line above — same manufacturer, same cert covers both.",
  },
  {
    poRef: "PO15813", poDate: "2026-08-04", officerNames: ["Toni Stefanov"],
    customerPoProductName: "Examination Gloves (Latex) Large, Powder-Free, Non-Sterile, 100 Each [Zarys]",
    productSeedName: "Examination Gloves (Latex), Powder-Free, Non-Sterile, 100 Each [Zarys]",
    stakeholderSupplier: "Zarys International", stakeholderManufacturer: "Zarys International",
    manufacturerPartNumber: "RLBL10007", unitOfSupply: "100/box", exactMatchFlag: true,
    productType: "PPE", storageRequirement: "Ambient",
    supplierProductDescription: "easyCARE latex PF Latex examination gloves, powder-free, non-sterile size: L (a100)",
    productCertificationExpiry: "2027-01-10",
    matchNotes:
      "TEST BATCH IMPORT. Source cert: \"SATRA 2777/10467-05/E21-01 Exp 10-Jan-2027\". " +
      "Supplier and manufacturer are the SAME company for this line (the source sheet only differed by a " +
      "trailing space on the manufacturer field) — both roles attached to one Partner record, not two. " +
      "Size (Large) not modelled as a distinct ProductMaster attribute yet — all sizes share one ProductMaster row for now; see matchNotes on each line for the actual size ordered.",
  },
  {
    poRef: "PO15813", poDate: "2026-08-04", officerNames: ["Toni Stefanov"],
    customerPoProductName: "Examination Gloves (Latex) Medium, Powder-Free, Non-Sterile, 100 Each [Zarys]",
    productSeedName: "Examination Gloves (Latex), Powder-Free, Non-Sterile, 100 Each [Zarys]",
    stakeholderSupplier: "Zarys International", stakeholderManufacturer: "Zarys International",
    manufacturerPartNumber: "RLBM10007", unitOfSupply: "100/box", exactMatchFlag: true,
    productType: "PPE", storageRequirement: "Ambient",
    supplierProductDescription: "easyCARE latex PF Latex examination gloves, powder-free, non-sterile size: M (a100)",
    productCertificationExpiry: "2027-01-10",
    matchNotes: "TEST BATCH IMPORT. Size ordered: Medium. Same certificate/company as the Large-size line above.",
  },
  {
    poRef: "PO15814", poDate: "2026-09-11", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Nitrile examination gloves, latex-free, powder-free, size Large, single-use",
    productSeedName: "Nitrile examination gloves, latex-free, powder-free, single-use",
    stakeholderSupplier: "Globus", stakeholderManufacturer: "Globus (Anhui Intco Medical Products)",
    manufacturerPartNumber: "HAIKA NX520", unitOfSupply: "200 pcs/box", exactMatchFlag: true,
    productType: "PPE", storageRequirement: "Ambient",
    supplierProductDescription: "Nitrile examination gloves, latex-free, powder-free, size Large, single-use",
    productCertificationExpiry: "2030-04-10",
    matchNotes:
      "TEST BATCH IMPORT. Size ordered: Large. Source cert: \"SATRA 2777/14815-05/E16-01 Exp 10-Apr-2030\". " +
      "Supplier (\"Globus\") and manufacturer (\"Globus (Anhui Intco Medical Products)\") kept as TWO distinct " +
      "stakeholders — brand/distributor vs. the actual factory — pending your confirmation this split is correct.",
  },
  {
    poRef: "PO15814", poDate: "2026-09-11", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Nitrile examination gloves, latex-free, powder-free, size Small, single-use",
    productSeedName: "Nitrile examination gloves, latex-free, powder-free, single-use",
    stakeholderSupplier: "Globus", stakeholderManufacturer: "Globus (Anhui Intco Medical Products)",
    manufacturerPartNumber: "HAIKA NX520", unitOfSupply: "200 pcs/box", exactMatchFlag: true,
    productType: "PPE", storageRequirement: "Ambient",
    supplierProductDescription: "Nitrile examination gloves, latex-free, powder-free, size Small, single-use",
    productCertificationExpiry: "2030-04-10",
    matchNotes: "TEST BATCH IMPORT. Size ordered: Small. Same certificate/companies as the Large-size line above.",
  },
  {
    poRef: "PO15814", poDate: "2026-09-11", officerNames: ["Bianca Lassaponari"],
    customerPoProductName: "Nitrile examination gloves, latex-free, powder-free, size Medium, single-use",
    productSeedName: "Nitrile examination gloves, latex-free, powder-free, single-use",
    stakeholderSupplier: "Globus", stakeholderManufacturer: "Globus (Anhui Intco Medical Products)",
    manufacturerPartNumber: "HAIKA NX520", unitOfSupply: "200 pcs/box", exactMatchFlag: true,
    productType: "PPE", storageRequirement: "Ambient",
    supplierProductDescription: "Nitrile examination gloves, latex-free, powder-free, size Medium, single-use",
    productCertificationExpiry: "2030-04-10",
    matchNotes: "TEST BATCH IMPORT. Size ordered: Medium. Same certificate/companies as the Large-size line above.",
  },
];

async function main() {
  const orgNameFilter = process.argv[2] ?? "Unimed";
  const org = await prisma.organization.findFirst({ where: { name: { contains: orgNameFilter } } });
  if (!org) {
    throw new Error(`No organization found matching name "${orgNameFilter}". Pass the exact org name as an argument.`);
  }
  console.log(`Importing product-database test batch for organization "${org.name}" (${org.id})\n`);

  const partnerIdByName = new Map<string, string>();
  const productMasterIdByName = new Map<string, string>();

  await withTenantContext(org.id, async (tx) => {
    for (const s of STAKEHOLDERS) {
      const normalizedName = normalizeStakeholderName(s.canonicalName);

      let registryEntry = await tx.stakeholderRegistryEntry.findFirst({ where: { normalizedName } });
      if (!registryEntry) {
        registryEntry = await tx.stakeholderRegistryEntry.create({
          data: { normalizedName, legalName: s.canonicalName, stakeholderTypes: s.roles.join(",") },
        });
        console.log(`  [registry] created "${s.canonicalName}"`);
      } else {
        console.log(`  [registry] matched existing entry for "${s.canonicalName}"`);
      }

      let partner = await tx.partner.findFirst({ where: { organizationId: org.id, normalizedName } });
      if (!partner) {
        partner = await tx.partner.create({
          data: {
            organizationId: org.id,
            name: s.canonicalName,
            normalizedName,
            registryEntryId: registryEntry.id,
            approvalStatus: "PENDING",
          },
        });
        console.log(`  [partner]  created "${s.canonicalName}" (PENDING)`);
      } else {
        console.log(`  [partner]  matched existing Partner for "${s.canonicalName}" (status: ${partner.approvalStatus})`);
      }
      partnerIdByName.set(s.canonicalName, partner.id);

      for (const roleType of s.roles) {
        const existingRole = await tx.partnerRole.findFirst({ where: { partnerId: partner.id, roleType } });
        if (!existingRole) {
          await tx.partnerRole.create({ data: { partnerId: partner.id, roleType, isActive: true } });
          console.log(`  [role]     ${s.canonicalName} -> ${roleType}`);
        }
      }
    }

    console.log();
    for (const ev of COMPANY_EVIDENCE) {
      const partnerId = partnerIdByName.get(ev.stakeholder);
      if (!partnerId) continue;
      const standard = await tx.evidenceStandardDefinition.findFirst({
        where: { organizationId: org.id, name: ev.standardName },
      });
      if (!standard) {
        console.log(`  [evidence] SKIPPED — standard "${ev.standardName}" not found (run seed:evidence-standards first)`);
        continue;
      }
      const existing = await tx.stakeholderEvidenceRecord.findFirst({
        where: { organizationId: org.id, partnerId, standardId: standard.id },
      });
      if (existing) {
        console.log(`  [evidence] already on file: ${ev.stakeholder} / ${ev.standardName}`);
        continue;
      }
      await tx.stakeholderEvidenceRecord.create({
        data: {
          organizationId: org.id,
          partnerId,
          standardId: standard.id,
          status: "VERIFIED",
          verifiedAt: new Date(ev.verifiedAt),
          notes:
            "TEST BATCH IMPORT (legacy/partial): source spreadsheet captured only the bare ISO standard " +
            "number against this stakeholder, with no certificate reference number or expiry date ever " +
            "recorded. Imported as VERIFIED to reflect that Unimed's procurement team did check this at " +
            "the time, per the historical process — but re-verification should obtain the actual " +
            "certificate detail rather than just re-confirming this record.",
        },
      });
      console.log(`  [evidence] created: ${ev.stakeholder} / ${ev.standardName} (VERIFIED, no expiry on file)`);
    }

    console.log();
    for (const p of PRODUCTS) {
      let pm = await tx.productMaster.findFirst({ where: { name: p.name } });
      if (!pm) {
        pm = await tx.productMaster.create({
          data: {
            name: p.name,
            category: p.category,
            sourceStandard: "INTERNAL",
            addedByOrganizationId: org.id,
            addedByOrganizationType: org.type,
          },
        });
        console.log(`  [product]  created "${p.name}"`);
      } else {
        console.log(`  [product]  matched existing ProductMaster "${p.name}"`);
      }
      productMasterIdByName.set(p.name, pm.id);
    }

    console.log();
    const users = await tx.user.findMany({ where: { organizationId: org.id } });
    const now = new Date();
    for (const line of LINES) {
      const existing = await tx.productLine.findFirst({
        where: { organizationId: org.id, poNumber: line.poRef, customerPoProductName: line.customerPoProductName },
      });
      if (existing) {
        console.log(`  [line]     already imported: ${line.poRef} / ${line.customerPoProductName}`);
        continue;
      }

      const officerName = line.officerNames[0];
      const matchedUser = users.find((u) =>
        officerName.toLowerCase().includes(u.forename.toLowerCase()) &&
        officerName.toLowerCase().includes(u.surname.toLowerCase()),
      );
      const notes = matchedUser
        ? line.matchNotes
        : `${line.matchNotes} Procurement officer "${officerName}" has no matching User record in Universe — left unlinked.`;

      const expiry = line.productCertificationExpiry ? new Date(line.productCertificationExpiry) : null;
      const expiredAlready = expiry !== null && expiry < now;

      await tx.productLine.create({
        data: {
          organizationId: org.id,
          customerPoProductName: line.customerPoProductName,
          poNumber: line.poRef,
          procurementOfficerId: matchedUser?.id ?? null,
          poDate: new Date(line.poDate),
          productType: line.productType,
          supplierId: partnerIdByName.get(line.stakeholderSupplier),
          supplierProductDescription: line.supplierProductDescription,
          manufacturerId: partnerIdByName.get(line.stakeholderManufacturer),
          manufacturerPartNumber: line.manufacturerPartNumber,
          unitOfSupply: line.unitOfSupply,
          exactMatchFlag: line.exactMatchFlag,
          matchNotes: notes,
          storageRequirement: line.storageRequirement,
          productCertificationExpiry: expiry,
          productMasterId: productMasterIdByName.get(line.productSeedName) ?? null,
        },
      });
      console.log(
        `  [line]     created: ${line.poRef} / ${line.customerPoProductName}` +
          (expiredAlready ? "  ⚠ product certification already EXPIRED" : ""),
      );
    }
  });

  console.log("\nDone. Check each Partner's status in the QA Queue (Quality -> QA Queue) — all 5 should");
  console.log("show PENDING with mandatory evidence standards still missing, which is correct: this");
  console.log("batch only ever supplied the ISO 9001/13485 claim and nothing else Unimed's catalog");
  console.log("requires for full approval. The Cotton Roll line's certification is already expired —");
  console.log("confirm it surfaces as an issue on that line/product rather than looking clean.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
