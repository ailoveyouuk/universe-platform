import { describe, expect, it } from "vitest";
import { orgTypesOf, parseAdditionalTypes } from "@universe/types";
import { evaluateEligibility, type OrgProfile } from "../src/tenders/eligibility";
import { matchesNetworkCriteria } from "../src/supplier-directory/network-criteria";

const profile = (over: Partial<OrgProfile>): OrgProfile => ({ organizationId: "o", orgType: "PROCUREMENT_SERVICE_AGENT", countries: [], categories: [], qualifications: [], hasProfileEvidence: false, ...over });
const rule = [{ id: "r", ruleType: "ORG_TYPE", ruleValue: "SUPPLIER,MANUFACTURER", isRequired: true }];

describe("organisations holding more than one role", () => {
  it("parses the stored form and puts the primary type first", () => {
    expect(parseAdditionalTypes(",SUPPLIER,FUNDER_DONOR,")).toEqual(["SUPPLIER", "FUNDER_DONOR"]);
    expect(parseAdditionalTypes(null)).toEqual([]);
    expect(orgTypesOf({ type: "MANUFACTURER", additionalTypes: ",MANUFACTURER,SUPPLIER," })).toEqual(["MANUFACTURER", "SUPPLIER"]);
  });
  it("an agent that is also a supplier meets a suppliers-only tender", () => {
    expect(evaluateEligibility(rule, profile({})).items[0].status).toBe("NOT_MET");
    expect(evaluateEligibility(rule, profile({ orgTypes: ["PROCUREMENT_SERVICE_AGENT", "SUPPLIER"] })).items[0].status).toBe("MET");
  });
  it("the directory type filter matches any held role", () => {
    const subject = { name: "x", type: "PROCUREMENT_SERVICE_AGENT", types: ["PROCUREMENT_SERVICE_AGENT", "SUPPLIER"], description: null, principalManufacturers: null, scope: [], countryCodes: [], certificationTypes: [], whoPrequalified: false, localManufacturer: false, yearsInOperation: null, warehousing: null };
    expect(matchesNetworkCriteria({ type: "SUPPLIER" }, subject)).toBe(true);
    expect(matchesNetworkCriteria({ type: "MANUFACTURER" }, subject)).toBe(false);
  });
});
