import { describe, expect, it } from "vitest";
import { CATEGORY_HS_MAP, categoriesForHs, hsPrefixesForCategory } from "@universe/types";

const NINE_NEW = ["Reproductive Health", "Nutrition", "Vector Control", "Water, Sanitation and Hygiene", "Immunisation", "Kits and Emergency Supplies", "Shelter and Household Items", "Field and Military Medical", "Logistics and Services"];
const TEN = ["Medical Devices", "Reagents", "Diagnostics", "Imaging", "Surgical Supplies", "Pharmaceuticals", "Cold Chain", "Personal Protective Equipment", "Laboratory Consumables", "Wound Care"];

describe("category to HS mapping", () => {
  it("covers exactly the ten standard categories and the nine added on 2026-10-24", () => {
    expect(Object.keys(CATEGORY_HS_MAP).sort()).toEqual([...TEN, ...NINE_NEW].sort());
  });
  it("uses 4 or 6 digit codes only, no duplicates within a category", () => {
    for (const [cat, entries] of Object.entries(CATEGORY_HS_MAP)) {
      for (const e of entries) expect(e.code, cat).toMatch(/^(\d{4}|\d{6})$/);
      expect(new Set(entries.map((e) => e.code)).size, cat).toBe(entries.length);
    }
  });
  it("maps a heading to every subheading beneath it, with or without dots", () => {
    expect(categoriesForHs("4015.11")).toContain("Personal Protective Equipment");
    expect(categoriesForHs("3004.90")).toEqual(["Pharmaceuticals"]);
    expect(categoriesForHs("9018.31")).toEqual(expect.arrayContaining(["Medical Devices", "Surgical Supplies"]));
  });
  it("narrow 6-digit entries do not claim the rest of the heading", () => {
    expect(categoriesForHs("901812")).toEqual(expect.arrayContaining(["Imaging", "Medical Devices"]));
    expect(categoriesForHs("902780")).toEqual(["Diagnostics"]);
    expect(categoriesForHs("902710")).toEqual([]);
  });
  it("maps the new groups' codes and keeps pharmaceutical headings pure", () => {
    expect(categoriesForHs("4014.10")).toEqual(["Reproductive Health"]);
    expect(categoriesForHs("6304.91")).toEqual(["Vector Control"]);
    expect(categoriesForHs("2106.90")).toEqual(["Nutrition"]);
    expect(categoriesForHs("3004.50")).toEqual(expect.arrayContaining(["Pharmaceuticals", "Nutrition"]));
    expect(categoriesForHs("3004.90")).toEqual(["Pharmaceuticals"]);
  });
  it("returns nothing for unrelated or too-short codes", () => {
    expect(categoriesForHs("0901.11")).toEqual([]);
    expect(categoriesForHs("30")).toEqual([]);
  });
  it("exposes prefixes for a category", () => {
    expect(hsPrefixesForCategory("Wound Care")).toContain("3005");
    expect(hsPrefixesForCategory("Nope")).toEqual([]);
  });
});
