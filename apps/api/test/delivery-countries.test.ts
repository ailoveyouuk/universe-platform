import { describe, expect, it } from "vitest";
import { deliversTo, deliveryCountryColumns, normaliseCountryCodes, readDeliveryCountries } from "../src/projects/delivery-countries";

/** Projects with several delivery countries (2026-10-18). */
describe("project delivery countries", () => {
  it("normalises: trims, upper-cases, drops invalid and duplicate codes, keeps order", () => {
    expect(normaliseCountryCodes([" ke ", "GB", "ke", "", null, undefined, "XYZ", "1A"])).toEqual(["KE", "GB"]);
    expect(normaliseCountryCodes(undefined)).toEqual([]);
  });

  it("stores the list delimited and the first country as the primary", () => {
    expect(deliveryCountryColumns(["KE", "GB"])).toEqual({ deliveryCountryCode: "KE", deliveryCountryCodes: ",KE,GB," });
    expect(deliveryCountryColumns([])).toEqual({ deliveryCountryCode: null, deliveryCountryCodes: null });
  });

  it("reads the list back, falling back to the primary for older rows", () => {
    expect(readDeliveryCountries({ deliveryCountryCode: "KE", deliveryCountryCodes: ",KE,GB," })).toEqual(["KE", "GB"]);
    expect(readDeliveryCountries({ deliveryCountryCode: "KE", deliveryCountryCodes: null })).toEqual(["KE"]);
    expect(readDeliveryCountries({ deliveryCountryCode: null, deliveryCountryCodes: null })).toEqual([]);
  });

  it("filters on an exact country, not a partial match", () => {
    expect(deliversTo("ke")).toEqual({ OR: [{ deliveryCountryCodes: { contains: ",KE," } }, { deliveryCountryCodes: null, deliveryCountryCode: "KE" }] });
  });
});
