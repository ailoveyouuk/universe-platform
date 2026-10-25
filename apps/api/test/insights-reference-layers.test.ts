import { describe, expect, it } from "vitest";
import { noticeCountries, referenceCountries } from "../src/insights/reference-layers";

describe("insights reference layers", () => {
  it("keeps a figure only when at least five items stand behind it", () => {
    const out = referenceCountries(new Map([["GB", 38], ["FR", 2]]), new Map([["GB", 4], ["KE", 12]]), new Map([["KE", 5]]));
    expect(out).toEqual([
      { countryCode: "GB", exportRestrictions: 38, registrations: 0, safetyNotices: 0 },
      { countryCode: "KE", exportRestrictions: 0, registrations: 12, safetyNotices: 5 },
    ]);
  });
  it("leaves out a country with nothing above the floor", () => {
    expect(referenceCountries(new Map([["FR", 1]]), new Map(), new Map())).toEqual([]);
  });
  it("reads a notice's country list and ignores worldwide notices", () => {
    expect(noticeCountries("ke, UG ,xx1")).toEqual(["KE", "UG"]);
    expect(noticeCountries("")).toEqual([]);
    expect(noticeCountries(null)).toEqual([]);
  });
});
