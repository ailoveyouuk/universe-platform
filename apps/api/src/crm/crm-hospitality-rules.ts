import type { CrmHospitalityCategory, CrmHospitalityDirection } from "@universe/types";

/** The numbers and switches an organisation sets in its own gifts and hospitality policy. */
export interface PolicyRules { currency: string; giftThreshold: number; hospitalityThreshold: number; annualThreshold: number; alwaysApprovePublicOfficial: boolean }
export interface RuleInput {
  direction: CrmHospitalityDirection; category: CrmHospitalityCategory; publicOfficial: boolean;
  /** This benefit's value in the policy currency; null when it could not be converted. */
  value: number | null;
  /** Everything else with the same stakeholder in the twelve months to this date, in the policy currency (given or received, not declined or refused). */
  priorTwelveMonths: number;
}
export interface RuleResult { requiresApproval: boolean; reasons: string[] }

const fmt = (n: number, c: string) => `${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${c}`;

/**
 * Decides whether a gift or hospitality record needs a second person's approval, and says why in plain words.
 * An offer that was declined never needs approval (it is kept for the record). Donations and sponsorship always do. A benefit to or from a public official
 * does when the policy says so. Otherwise it is the organisation's own thresholds: per item (gifts and hospitality have their own), and per stakeholder over a
 * rolling twelve months. If the value cannot be read in the policy currency, it cannot be judged against a threshold, so approval is asked for.
 */
export function evaluateHospitality(p: PolicyRules, i: RuleInput): RuleResult {
  if (i.direction === "DECLINED") return { requiresApproval: false, reasons: [] };
  const reasons: string[] = [];
  if (i.category === "DONATION" || i.category === "SPONSORSHIP") reasons.push("Donations and sponsorship always need approval.");
  if (i.publicOfficial && p.alwaysApprovePublicOfficial) reasons.push("A public official is involved.");
  if (i.value === null) reasons.push(`The value could not be read in ${p.currency}, so it cannot be checked against the thresholds.`);
  else {
    const limit = i.category === "GIFT" ? p.giftThreshold : p.hospitalityThreshold;
    if (i.category !== "DONATION" && i.category !== "SPONSORSHIP" && i.value > limit) reasons.push(`${fmt(i.value, p.currency)} is above your ${i.category === "GIFT" ? "gift" : "hospitality"} threshold of ${fmt(limit, p.currency)}.`);
    const total = i.priorTwelveMonths + i.value;
    if (total > p.annualThreshold && i.value > 0) reasons.push(`With the last twelve months, ${fmt(total, p.currency)} is above your yearly threshold of ${fmt(p.annualThreshold, p.currency)} for one stakeholder.`);
  }
  return { requiresApproval: reasons.length > 0, reasons };
}
