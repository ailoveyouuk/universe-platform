import { describe, expect, it } from "vitest";
import { crmHealth } from "@universe/types";
import { counterpartyKeyForPartner, startingStatus } from "../src/crm/crm.service";

const now = new Date("2026-10-26T12:00:00Z");
const base = { approvalStatus: "APPROVED", nextApprovalReviewDue: null, nextReviewDue: "2027-01-01T00:00:00Z", status: "ACTIVE" };

describe("CRM relationship health (calculated, with reasons)", () => {
  it("is healthy when approved and nothing is overdue", () => {
    expect(crmHealth(base, now)).toEqual({ health: "GOOD", reasons: [] });
  });
  it("needs attention when approval is pending or a review is overdue", () => {
    expect(crmHealth({ ...base, approvalStatus: "PENDING" }, now).health).toBe("WATCH");
    const r = crmHealth({ ...base, nextReviewDue: "2026-01-01T00:00:00Z" }, now);
    expect(r.health).toBe("WATCH");
    expect(r.reasons).toContain("Relationship review is overdue");
    expect(crmHealth({ ...base, nextApprovalReviewDue: "2026-09-01T00:00:00Z" }, now).reasons).toContain("Approval review is overdue");
  });
  it("is at risk when the stakeholder is rejected or suspended, and the worst reason wins", () => {
    const r = crmHealth({ ...base, approvalStatus: "SUSPENDED", nextReviewDue: "2026-01-01T00:00:00Z" }, now);
    expect(r.health).toBe("AT_RISK");
    expect(r.reasons.length).toBe(2);
  });
  it("does not nag about reviews for prospects or ended relationships", () => {
    expect(crmHealth({ ...base, status: "ENDED", nextReviewDue: "2026-01-01T00:00:00Z" }, now).health).toBe("GOOD");
    expect(crmHealth({ ...base, status: "PROSPECT", nextReviewDue: "2026-01-01T00:00:00Z" }, now).health).toBe("GOOD");
  });
});

describe("CRM health reads the stakeholder data that already exists", () => {
  it("flags expired and soon-to-expire certificates and open complaints", () => {
    expect(crmHealth({ ...base, certsExpired: 1 }, now)).toEqual({ health: "AT_RISK", reasons: ["1 certificate has expired"] });
    expect(crmHealth({ ...base, certsExpiringSoon: 2 }, now).reasons).toEqual(["2 certificates expire within 60 days"]);
    expect(crmHealth({ ...base, openComplaints: 3 }, now)).toEqual({ health: "WATCH", reasons: ["3 open quality complaints"] });
  });
  it("ignores complaints the viewer may not see (null)", () => {
    expect(crmHealth({ ...base, openComplaints: null }, now).health).toBe("GOOD");
  });
});

describe("CRM relationship creation", () => {
  it("starts approved stakeholders as active and the rest as prospects", () => {
    expect(startingStatus("APPROVED")).toBe("ACTIVE");
    expect(startingStatus("PENDING")).toBe("PROSPECT");
  });
  it("keys one relationship per counterpart", () => {
    expect(counterpartyKeyForPartner("abc")).toBe("partner:abc");
  });
});
