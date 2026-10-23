import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseDate, parseEmaMedicines, parseMhraCategory, rowHash } from "@universe/db";
import { scopeSubForAtc, scopeSubsForProduct } from "@universe/types";

async function workbook(rows: (string | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("s");
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const EMA_HDR = ["Category", "Name of medicine", "EMA product number", "Medicine status", "International non-proprietary name (INN) / common name", "Active substance", "ATC code (human)", "ATCvet code (veterinary)", "Pharmacotherapeutic group (human)", "Therapeutic indication", "Generic", "Biosimilar", "Orphan medicine", "Marketing authorisation developer / applicant / holder", "Marketing authorisation date", "Medicine URL"];

describe("EMA medicines table parser", () => {
  it("finds the header below the banner rows and maps human and veterinary rows", async () => {
    const buf = await workbook([
      ["Content type:", "Medicine", "Output automatically generated", "23/10/2026 - 06:00"], [], [],
      EMA_HDR,
      ["Human", "Zarzio", "EMEA/H/C/000917", "Authorised", "filgrastim", "filgrastim", "L03AA02", null, "Immunostimulants", "Neutropenia", "No", "Yes", "No", "Sandoz GmbH", "06/02/2009", "https://www.ema.europa.eu/en/medicines/human/EPAR/zarzio"],
      ["Veterinary", "Bovilis", "EMEA/V/C/000001", "Authorised", null, "vaccine", null, "QI02AA01", null, null, "No", "No", "No", "MSD", "01/03/2010", null],
      ["Human", null, "EMEA/H/C/9", "Authorised"],
    ]);
    const rows = await parseEmaMedicines(buf);
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ source: "EMA", sourceKey: "EMEA/H/C/000917", name: "Zarzio", atcCode: "L03AA02", isBiosimilar: true, isGeneric: false, productType: "HUMAN", holder: "Sandoz GmbH" });
    expect(rows[0].authorisedOn?.toISOString().slice(0, 10)).toBe("2009-02-06");
    expect(rows[1]).toMatchObject({ productType: "VETERINARY", atcCode: "QI02AA01" });
  });
  it("fails clearly when the layout changes", async () => {
    await expect(parseEmaMedicines(await workbook([["a", "b"], ["1", "2"]]))).rejects.toThrow(/Header row not found/);
  });
});

describe("MHRA category list parser", () => {
  it("joins repeated licences into one row with all active substances", async () => {
    const buf = await workbook([
      ["Authorisation Number", "Authorisation Holder Company Name", "Licensed Product Name", "Active Substance Name", "Legal Status Type", "Windsor Framework Classification"],
      ["PL 00010/0757", "BAYER PLC", "ANGELIQ 1 MG/2 MG FILM-COATED TABLETS", "DROSPIRENONE", "POM", "Category 1"],
      ["PL 00010/0757", "BAYER PLC", "ANGELIQ 1 MG/2 MG FILM-COATED TABLETS", "ESTRADIOL HEMIHYDRATE", "POM", "Category 1"],
      ["PL 00010/0757", "BAYER PLC", "ANGELIQ 1 MG/2 MG FILM-COATED TABLETS", "DROSPIRENONE", "POM", "Category 1"],
      ["PL 00057/1068", "PFIZER LIMITED", "ZYVOX 600MG FILM COATED TABLETS", "LINEZOLID", "POM", null],
    ]);
    const rows = await parseMhraCategory(buf, "Category 2");
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ source: "MHRA", sourceKey: "PL 00010/0757", activeSubstances: "DROSPIRENONE; ESTRADIOL HEMIHYDRATE", legalStatus: "POM", windsorCategory: "Category 1" });
    expect(rows[1].windsorCategory).toBe("Category 2");
  });
});

describe("helpers", () => {
  it("parses dd/mm/yyyy and ignores junk", () => {
    expect(parseDate("06/02/2009")?.toISOString().slice(0, 10)).toBe("2009-02-06");
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
  it("hash changes when a field changes and not otherwise", async () => {
    const [a] = await parseMhraCategory(await workbook([["Authorisation Number", "Licensed Product Name", "Active Substance Name"], ["PL 1/1", "X", "Y"]]), "Category 1");
    expect(rowHash(a)).toBe(rowHash({ ...a }));
    expect(rowHash(a)).not.toBe(rowHash({ ...a, status: "Withdrawn" }));
  });
  it("places pharmaceuticals by ATC, longest prefix first, and combines with name terms", () => {
    expect(scopeSubForAtc("J01CA04")).toBe("pharma-antibiotics");
    expect(scopeSubForAtc("P01BF05")).toBe("pharma-antimalarials");
    expect(scopeSubForAtc("J05AR")).toBe("pharma-hiv-tb");
    expect(scopeSubForAtc("A10BA02")).toBe("pharma-endocrine");
    expect(scopeSubForAtc("L01XX")).toBeNull();
    expect(scopeSubForAtc(null)).toBeNull();
    expect(scopeSubsForProduct({ category: "Pharmaceuticals", name: "Unbranded tablets", atcCode: "N02BE01" })).toEqual(["pharma-analgesics"]);
    expect(scopeSubsForProduct({ category: "Wound Care", name: "x", atcCode: "N02BE01" })).toEqual([]);
  });
});
