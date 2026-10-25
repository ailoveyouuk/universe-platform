import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { COMMODITY_GROUPS, SERVICE_CATEGORIES, SERVICE_GROUPS, SERVICE_PRICING_BASIS_CODES } from "@universe/types";
import { ProjectLineDto } from "../src/projects/dto/project-line.dto";

describe("Services taxonomy (2026-10-25)", () => {
  it("is well formed: unique codes, known groups and bases, every group used", () => {
    const codes = SERVICE_CATEGORIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of SERVICE_CATEGORIES) {
      expect(SERVICE_GROUPS, c.code).toContain(c.group);
      expect(c.bases.length, c.code).toBeGreaterThan(0);
      for (const b of c.bases) expect(SERVICE_PRICING_BASIS_CODES, c.code).toContain(b);
      expect(c.description.length, c.code).toBeGreaterThan(20);
      expect(c.examples.length, c.code).toBeGreaterThanOrEqual(2);
    }
    for (const g of SERVICE_GROUPS) expect(SERVICE_CATEGORIES.some((c) => c.group === g), g).toBe(true);
  });
  it("keeps freight out: moving goods is priced as freight cost, not as a service", () => {
    for (const c of SERVICE_CATEGORIES) expect(`${c.code} ${c.label}`.toLowerCase(), c.code).not.toMatch(/\bfreight\b|air cargo|sea cargo/);
    expect(SERVICE_CATEGORIES.map((c) => c.group).join()).toContain("not freight");
  });
  it("covers the service types Lewis named", () => {
    const text = SERVICE_CATEGORIES.map((c) => c.label.toLowerCase()).join(" | ");
    expect(text).toContain("technical assistance");
    expect(text).toContain("advisory");
    expect(SERVICE_CATEGORIES.some((c) => c.procurementType === "CONSULTING")).toBe(true);
  });
  it("is a commodity group of its own, accepted by the project line", async () => {
    expect(COMMODITY_GROUPS).toContain("SERVICES");
    const ok = plainToInstance(ProjectLineDto, { productCategory: "SERVICES", serviceCategory: "TECHNICAL_ASSISTANCE", servicePricingBasis: "PER_DAY", quantity: 20 });
    expect(await validate(ok)).toHaveLength(0);
    const bad = plainToInstance(ProjectLineDto, { productCategory: "SERVICES", serviceCategory: "FREIGHT", servicePricingBasis: "PER_PARCEL" });
    expect((await validate(bad)).map((e) => e.property).sort()).toEqual(["serviceCategory", "servicePricingBasis"]);
  });
});
