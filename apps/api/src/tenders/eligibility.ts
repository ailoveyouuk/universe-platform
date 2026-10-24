import { parseRatingRule, ratingRuleMet, type SupplierAggregate } from "./tender-performance";

/**
 * Tender eligibility (design section 5). Pure logic: given an issuer's rules and a registered organisation's recorded profile,
 * produce a requirement checklist (Met / Not met / Needs evidence, each with a plain statement of what to do), an overall
 * chip, and a list of fix actions. A tender is never hidden because of this; it only decides whether the organisation may bid.
 */

export const RULE_TYPES = ["ORG_TYPE", "COUNTRY", "CATEGORY", "QUALIFICATION", "EXCLUDED_ORG", "MIN_SUPPLIER_RATING"] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export type CheckStatus = "MET" | "NOT_MET" | "NEEDS_EVIDENCE";
export type EligibilityOutcome = "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_ELIGIBLE";

export interface RuleLike { id: string; ruleType: string; ruleValue: string; explanation?: string | null; isRequired: boolean }

export interface OrgProfile {
  organizationId: string;
  orgType: string;
  /** ISO codes the organisation is registered in or operates in or distributes to. */
  countries: string[];
  /** Product categories it makes or supplies ("Laboratory Consumables.Cryovial"). */
  categories: string[];
  /** Qualification codes on record: WHO_PQ, SRA, ISO_13485, or free-text certifications (upper-cased). */
  qualifications: string[];
  /** Whether the organisation has any manufacturer/supplier profile at all (decides Not met vs Needs evidence). */
  hasProfileEvidence: boolean;
  /** The organisation's anonymised performance aggregate on the platform (step 6); absent when not loaded. */
  performance?: SupplierAggregate;
}

export interface CheckItem { ruleId: string; ruleType: string; required: boolean; status: CheckStatus; requirement: string; action: string | null }
export interface EligibilityResult { outcome: EligibilityOutcome; canBid: boolean; invited: boolean; unmetRequired: number; items: CheckItem[] }

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, "_");

const QUAL_LABELS: Record<string, string> = { WHO_PQ: "WHO prequalification", SRA: "an SRA approval", ISO_13485: "ISO 13485", ISO_9001: "ISO 9001", ERP: "Expert Review Panel (ERP) approval", WLA: "a WHO Listed Authority authorisation", PICS_GMP: "a GMP inspection by a WHO, SRA or PIC/S authority", NATIONAL_MA: "a national marketing authorisation", WHO_GDP: "Good Distribution Practice compliance", MQAS: "WHO MQAS compliance", ISO_17025: "ISO/IEC 17025 accreditation" };
const qualLabel = (c: string) => QUAL_LABELS[norm(c)] ?? c;

function evaluateRule(rule: RuleLike, p: OrgProfile): { status: CheckStatus; requirement: string; action: string | null } {
  const values = list(rule.ruleValue);
  const custom = rule.explanation?.trim() || null;
  switch (rule.ruleType) {
    case "ORG_TYPE": {
      const ok = values.map(norm).includes(norm(p.orgType));
      const nice = values.map((v) => v.toLowerCase().replace(/_/g, " ")).join(" or ");
      return { status: ok ? "MET" : "NOT_MET", requirement: `Organisation type: ${nice}`, action: ok ? null : custom ?? `This tender is open to ${nice} organisations only.` };
    }
    case "COUNTRY": {
      const have = new Set(p.countries.map((c) => c.toUpperCase()));
      const ok = values.some((v) => have.has(v.toUpperCase()));
      return { status: ok ? "MET" : "NOT_MET", requirement: `Registered, operating or distributing in: ${values.join(", ")}`, action: ok ? null : custom ?? `Add ${values.join(" or ")} to your organisation's countries of operation.` };
    }
    case "CATEGORY": {
      const ok = values.some((v) => p.categories.some((c) => c === v || c.startsWith(`${v}.`) || v.startsWith(`${c}.`)));
      return { status: ok ? "MET" : "NOT_MET", requirement: `Supplies or manufactures: ${values.join(", ")}`, action: ok ? null : custom ?? `Publish a product in ${values.join(" or ")} in your supplier or manufacturer profile.` };
    }
    case "QUALIFICATION": {
      const have = new Set(p.qualifications.map(norm));
      const missing = values.filter((v) => !have.has(norm(v)));
      if (missing.length === 0) return { status: "MET", requirement: `Holds ${values.map(qualLabel).join(" and ")}`, action: null };
      const action = custom ?? `Record ${missing.map(qualLabel).join(" and ")} in your manufacturer or supplier profile, with the certificate.`;
      return { status: p.hasProfileEvidence ? "NOT_MET" : "NEEDS_EVIDENCE", requirement: `Holds ${values.map(qualLabel).join(" and ")}`, action };
    }
    case "EXCLUDED_ORG": {
      const excluded = values.includes(p.organizationId);
      return { status: excluded ? "NOT_MET" : "MET", requirement: "Not excluded by the issuer", action: excluded ? custom ?? "The issuer has excluded your organisation from this tender." : null };
    }
    case "MIN_SUPPLIER_RATING": {
      const r = parseRatingRule(rule.ruleValue);
      const allow = r.allowInsufficient ? " Organisations with no history yet are welcome to bid." : "";
      const requirement = `Platform performance rating of ${r.min === "STRONG" ? "Strong" : "Good or better"}.${allow}`;
      if (!p.performance) return { status: "NEEDS_EVIDENCE", requirement, action: custom };
      const res = ratingRuleMet(rule.ruleValue, p.performance);
      return { status: res.met ? "MET" : "NOT_MET", requirement, action: res.met ? null : custom ?? `Your platform record is currently ${res.reason}. It improves as you complete contracts on time and in full.` };
    }
    default:
      return { status: "NEEDS_EVIDENCE", requirement: `${rule.ruleType}: ${rule.ruleValue}`, action: custom };
  }
}

/** Rules that can never be fixed by the organisation, so a failure means Not eligible rather than Almost eligible. */
const UNFIXABLE: ReadonlySet<string> = new Set(["ORG_TYPE", "EXCLUDED_ORG", "MIN_SUPPLIER_RATING"]);

export function evaluateEligibility(rules: RuleLike[], profile: OrgProfile, opts: { invited?: boolean } = {}): EligibilityResult {
  const items: CheckItem[] = rules.map((r) => ({ ruleId: r.id, ruleType: r.ruleType, required: r.isRequired, ...evaluateRule(r, profile) }));
  const failing = items.filter((i) => i.required && i.status !== "MET");
  const excluded = items.some((i) => i.ruleType === "EXCLUDED_ORG" && i.status === "NOT_MET");
  const invited = !!opts.invited && !excluded;
  let outcome: EligibilityOutcome;
  if (failing.length === 0) outcome = "ELIGIBLE";
  else if (failing.some((i) => UNFIXABLE.has(i.ruleType)) || failing.length > 2) outcome = "NOT_ELIGIBLE";
  else outcome = "ALMOST_ELIGIBLE";
  return { outcome, canBid: outcome === "ELIGIBLE" || invited, invited, unmetRequired: failing.length, items };
}

/**
 * A saved tender search. The first group is what an alert can be matched on when a tender is published; the second group (chip, status, windows, shortlisted)
 * describes the current state of a tender for you and is only restored into the Find tenders filters, never used for alerts.
 */
export interface SavedCriteria {
  categories?: string[]; countries?: string[]; types?: string[]; onlyEligible?: boolean; keyword?: string;
  issuer?: string; currency?: string; scopeMatch?: boolean;
  chip?: string; status?: string; closingWithinDays?: number; publishedWithinDays?: number; shortlisted?: boolean;
}
export interface TenderForMatch {
  title: string; summary?: string | null; tenderType: string; deliveryCountryCodes?: string | null; categories: string[];
  issuerName?: string; currency?: string | null;
  /** Scope-of-supply categories the tender's catalogue lines fall into. */
  scopeSubs?: string[];
  /** The descriptions of the tender's line items, so a keyword also finds what is being bought. */
  lineText?: string;
}

/** Does a published tender fit a saved search? (Eligibility is checked separately when onlyEligible is set.) */
export function matchesSavedSearch(c: SavedCriteria, t: TenderForMatch, orgScope?: Set<string>): boolean {
  if (c.types?.length && !c.types.includes(t.tenderType)) return false;
  if (c.countries?.length) {
    const codes = (t.deliveryCountryCodes ?? "").split(",").filter(Boolean);
    if (!c.countries.some((x) => codes.includes(x.toUpperCase()))) return false;
  }
  if (c.categories?.length && !c.categories.some((v) => t.categories.some((tc) => tc === v || tc.startsWith(`${v}.`)))) return false;
  if (c.issuer?.trim() && !(t.issuerName ?? "").toLowerCase().includes(c.issuer.trim().toLowerCase())) return false;
  if (c.currency && (t.currency ?? "").toUpperCase() !== c.currency.toUpperCase()) return false;
  if (c.scopeMatch && !(orgScope && (t.scopeSubs ?? []).some((x) => orgScope.has(x)))) return false;
  if (c.keyword?.trim()) {
    const k = c.keyword.trim().toLowerCase();
    if (!`${t.title} ${t.summary ?? ""} ${t.lineText ?? ""}`.toLowerCase().includes(k)) return false;
  }
  return true;
}

export type ParticipantChip = "ELIGIBLE" | "ALMOST_ELIGIBLE" | "NOT_ELIGIBLE" | "INVITED" | "PARTICIPATING" | "CLOSING_SOON" | "SHORTLISTED" | "CLOSED";

export function chipsFor(args: { result: EligibilityResult; participating: boolean; shortlisted: boolean; closingAt: Date | null; status: string; now?: Date }): ParticipantChip[] {
  const now = args.now ?? new Date();
  const chips: ParticipantChip[] = [args.result.outcome];
  if (args.result.invited) chips.push("INVITED");
  if (args.participating) chips.push("PARTICIPATING");
  if (args.shortlisted) chips.push("SHORTLISTED");
  if (args.closingAt && args.status === "PUBLISHED") {
    const days = (args.closingAt.getTime() - now.getTime()) / 86_400_000;
    if (days < 0) chips.push("CLOSED");
    else if (days <= 7) chips.push("CLOSING_SOON");
  }
  return chips;
}
