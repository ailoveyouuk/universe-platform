import { describe, expect, it } from "vitest";
import { CATEGORY_HS_MAP, SCOPE_TAXONOMY, scopeSubById, scopeSubsForHs, scopeSubsForProduct } from "@universe/types";

describe("supplier scope taxonomy", () => {
  it("has the nineteen groups of the HS map, 3 to 8 subcategories each", () => {
    expect(SCOPE_TAXONOMY.map((g) => g.group).sort()).toEqual(Object.keys(CATEGORY_HS_MAP).sort());
    for (const g of SCOPE_TAXONOMY) { expect(g.subs.length, g.group).toBeGreaterThanOrEqual(3); expect(g.subs.length, g.group).toBeLessThanOrEqual(8); }
  });
  it("has unique ids, a label, and every subcategory has an HS prefix or terms", () => {
    const ids = SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of SCOPE_TAXONOMY) for (const s of g.subs) { expect(s.label).toBeTruthy(); expect(s.hs.length + s.terms.length, s.id).toBeGreaterThan(0); for (const t of s.terms) expect(t, s.id).toBe(t.toLowerCase()); }
  });
  it("keeps each subcategory's HS prefixes inside its group's mapping", () => {
    for (const g of SCOPE_TAXONOMY) for (const s of g.subs) for (const c of s.hs) {
      const covered = CATEGORY_HS_MAP[g.group].some((e) => c.startsWith(e.code) || e.code.startsWith(c));
      expect(covered, `${s.id} ${c}`).toBe(true);
    }
  });
  it("places products by HS, by name and by the category path", () => {
    expect(scopeSubsForProduct({ category: "Personal Protective Equipment", hsCode: "4015.19", name: "Nitrile examination gloves" })).toContain("ppe-gloves");
    expect(scopeSubsForProduct({ category: "Pharmaceuticals", hsCode: "3004.90", name: "Artemether injection, 80 mg/mL" })).toEqual(["pharma-antimalarials"]);
    expect(scopeSubsForProduct({ category: "Pharmaceuticals.Vaccines", name: "Measles vaccine" })).toContain("pharma-vaccines");
    expect(scopeSubsForProduct({ category: "Unknown", name: "gloves" })).toEqual([]);
  });
  it("places products in the groups added on 2026-10-24", () => {
    expect(scopeSubsForProduct({ category: "Vector Control", name: "Long-lasting insecticidal net, 180 x 190 cm" })).toContain("vc-nets");
    expect(scopeSubsForProduct({ category: "Reproductive Health", hsCode: "4014.10", name: "Male condom, lubricated" })).toContain("rh-condoms");
    expect(scopeSubsForProduct({ category: "Nutrition", name: "Ready-to-use therapeutic food paste" })).toContain("nut-rutf");
    expect(scopeSubsForProduct({ category: "Immunisation", name: "Auto-disable syringe 0.5 mL" })).toContain("imz-syringes");
    expect(scopeSubsForProduct({ category: "Logistics and Services", name: "Air freight and customs clearing" })).toContain("ls-freight");
    expect(scopeSubById("wash-treatment")?.group).toBe("Water, Sanitation and Hygiene");
  });
  it("finds subcategories by HS code and by id", () => {
    expect(scopeSubsForHs("9018.31")).toEqual([{ group: "Surgical Supplies", id: "ss-syringes" }]);
    expect(scopeSubsForHs("12")).toEqual([]);
    expect(scopeSubById("cc-boxes")?.group).toBe("Cold Chain");
    expect(scopeSubById("nope")).toBeNull();
  });
});
