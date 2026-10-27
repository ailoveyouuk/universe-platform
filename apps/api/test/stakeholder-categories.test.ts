import { describe, expect, it } from "vitest";
import { categoryAccent, categoryLabel, ORG_TYPE_LABELS, PARTNER_ROLE_TYPES, STAKEHOLDER_CATEGORIES, STAKEHOLDER_CATEGORY_KEYS } from "@universe/types";

describe("stakeholder categories (one list for the whole platform)", () => {
  it("has unique keys, and every category has a label, a plural and a colour token", () => {
    expect(new Set(STAKEHOLDER_CATEGORY_KEYS).size).toBe(STAKEHOLDER_CATEGORIES.length);
    for (const c of STAKEHOLDER_CATEGORIES) { expect(c.label.length).toBeGreaterThan(2); expect(c.plural.length).toBeGreaterThan(2); expect(c.accent).toMatch(/^--u-cat-/); }
  });
  it("every Universe organisation type except data and insights is also a stakeholder role with the same key", () => {
    for (const k of Object.keys(ORG_TYPE_LABELS).filter((k) => k !== "DATA_INSIGHTS_USER")) expect(PARTNER_ROLE_TYPES).toContain(k);
  });
  it("logistics provider is kept for old records but cannot be chosen for new ones", () => {
    expect(STAKEHOLDER_CATEGORY_KEYS).toContain("LOGISTICS");
    expect(PARTNER_ROLE_TYPES).not.toContain("LOGISTICS");
  });
  it("labels are sentence case and unknown keys read sensibly", () => {
    expect(categoryLabel("FREIGHT_FORWARDER")).toBe("Freight forwarder");
    expect(categoryLabel("DATA_INSIGHTS_USER")).toBe("Data and insights user");
    expect(categoryLabel("SOMETHING_NEW")).toBe("Something new");
    expect(categoryAccent("FUNDER_DONOR")).toBe("--u-cat-funder");
    expect(categoryAccent("NOPE")).toBeNull();
  });
});
