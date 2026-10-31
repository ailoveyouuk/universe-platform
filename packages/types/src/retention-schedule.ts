/**
 * Default retention schedule (2026-10-31), set at Lewis's request to "the default standard
 * expectations that are compliant with UK/EU regulations".
 *
 * How to read this honestly:
 * - UK GDPR and EU GDPR set no fixed periods. They require a period that is justified, no longer than
 *   needed, and reviewed ("storage limitation"). These are therefore *defaults*, each tied to a stated
 *   reason, not legal minimums. Each organisation may set a different period if it can justify it.
 * - `confidence` says how firm the reason is: "statute" = a period set by law that we are sure of
 *   (Limitation Act 1980 six-year contract claims; HMRC/Companies Act six-year accounting records);
 *   "guidance" = widely followed regulator or sector guidance (MHRA and EU GDP at least five years);
 *   "practice" = common practice, recalled, no single source. Everything marked "practice" or
 *   "guidance" goes in docs/LEGAL-REVIEW-BRIEF.md for the specialist to confirm.
 * - Nothing is ever deleted automatically. At the end of a period the record enters a review queue; a
 *   person keeps it (with a reason) or it is anonymised/archived. This follows the platform's rule that
 *   nothing is hard deleted without Lewis's say-so.
 */
export type RetentionConfidence = "statute" | "guidance" | "practice";
export type RetentionAction = "review" | "anonymise-person" | "archive";

export interface RetentionRule {
  key: string;
  category: string;
  /** What is kept. */
  covers: string;
  months: number;
  /** When the clock starts. */
  from: string;
  /** What happens at the end (never automatic deletion). */
  atEnd: RetentionAction;
  reason: string;
  confidence: RetentionConfidence;
}

export const RETENTION_SCHEDULE: RetentionRule[] = [
  { key: "crm-contact-left", category: "CRM people", covers: "Contact details of a person who has left the organisation they were a contact at", months: 24, from: "the date they left", atEnd: "anonymise-person", reason: "No fixed period in UK GDPR; two years lets the relationship recover while avoiding keeping people \"just in case\".", confidence: "practice" },
  { key: "crm-contact-unverified", category: "CRM people", covers: "Contact details not re-checked", months: 36, from: "the last check", atEnd: "review", reason: "Data must be accurate; details unchecked for three years are probably out of date.", confidence: "practice" },
  { key: "crm-relationship-ended", category: "CRM relationships", covers: "People linked to a stakeholder relationship that has ended", months: 24, from: "the relationship ending", atEnd: "review", reason: "Keep enough to show the relationship existed; review the personal detail.", confidence: "practice" },
  { key: "crm-kept-after-review", category: "CRM people", covers: "A person a reviewer chose to keep", months: 12, from: "the review", atEnd: "review", reason: "A decision to keep expires and must be made again with a reason.", confidence: "practice" },
  { key: "privacy-requests", category: "Privacy", covers: "Subject-access, erasure and other privacy requests, decisions and exemptions", months: 72, from: "the request closing", atEnd: "review", reason: "Needed to show compliance; matches the six-year limitation period for claims.", confidence: "statute" },
  { key: "suppression-list", category: "Privacy", covers: "Hashed email kept so an erased person is not added back", months: 0, from: "kept while the organisation operates (no end date)", atEnd: "review", reason: "Holds only a one-way hash; keeping it is what makes the erasure stick.", confidence: "guidance" },
  { key: "access-log", category: "Security", covers: "Who viewed personal data in the CRM", months: 24, from: "the view", atEnd: "archive", reason: "Security and audit evidence (UK GDPR Article 32; ISO 27001 logging); two years covers an annual audit cycle plus a year.", confidence: "practice" },
  { key: "audit-trail", category: "Security", covers: "Field-change log and audit trail of who changed what", months: 72, from: "the change", atEnd: "archive", reason: "Business and dispute evidence; matches the six-year limitation period.", confidence: "statute" },
  { key: "tender-file", category: "Tenders", covers: "Tender documents, evaluation scores, award decision and standstill record", months: 72, from: "contract award (or tender cancellation)", atEnd: "review", reason: "Challenges and contract claims can be brought for six years (Limitation Act 1980); public-sector norms are five to seven years.", confidence: "statute" },
  { key: "tender-unsuccessful-person", category: "Tenders", covers: "Personal details of people at unsuccessful bidders (names, emails, CVs)", months: 24, from: "contract award", atEnd: "anonymise-person", reason: "Keep the bid and score for the file; the personal detail is not needed once challenge time has passed.", confidence: "practice" },
  { key: "contract", category: "Contracts", covers: "Awarded contracts, variations, performance records and signatures", months: 72, from: "contract end or expiry", atEnd: "review", reason: "Six years for contract claims; twelve if executed as a deed (shown on the contract).", confidence: "statute" },
  { key: "quality-complaint", category: "Quality", covers: "Complaint record, investigation, corrective action and closure", months: 60, from: "the complaint closing", atEnd: "review", reason: "MHRA and EU Good Distribution Practice expect distribution and quality records to be kept for at least five years.", confidence: "guidance" },
  { key: "quality-complainant-person", category: "Quality", covers: "Name and contact details of the person who complained", months: 24, from: "the complaint closing", atEnd: "anonymise-person", reason: "The complaint stays for five years; the complainant's identity is minimised sooner unless a regulator or safety matter is open.", confidence: "practice" },
  { key: "product-regulatory", category: "Products", covers: "Registrations, safety notices, recall records and batch traceability", months: 60, from: "the later of last batch expiry and the record closing", atEnd: "review", reason: "GDP expects at least five years; product-safety actions may need longer, so a reviewer extends them.", confidence: "guidance" },
  { key: "certification", category: "Compliance", covers: "Licences, certificates and audit reports", months: 72, from: "expiry or replacement", atEnd: "review", reason: "Evidence for inspections and disputes over the period claims can be brought.", confidence: "practice" },
  { key: "gifts-hospitality", category: "Anti-bribery", covers: "Gifts and hospitality register entries", months: 72, from: "the entry date", atEnd: "review", reason: "Evidence of adequate procedures (Bribery Act 2010; ISO 37001 documented information); six years is typical.", confidence: "practice" },
  { key: "financial", category: "Finance", covers: "Invoices, payment and accounting records", months: 72, from: "the end of the financial year", atEnd: "review", reason: "HMRC and Companies Act accounting records: six years (UK).", confidence: "statute" },
  { key: "user-account", category: "Accounts", covers: "A person's platform account after they leave (archived, not deleted)", months: 72, from: "the account being archived", atEnd: "anonymise-person", reason: "Needed so the audit trail still says who did what; then the name is replaced.", confidence: "practice" },
  { key: "enquiry-unsuccessful", category: "Supplier directory", covers: "Supplier enquiries that never led to a relationship", months: 12, from: "the enquiry closing", atEnd: "anonymise-person", reason: "No continuing purpose once the enquiry is closed.", confidence: "practice" },
  { key: "notification", category: "Notifications", covers: "In-app alerts", months: 3, from: "the alert being read or dismissed", atEnd: "archive", reason: "Convenience messages with no record-keeping purpose.", confidence: "practice" },
  { key: "backup", category: "Backups", covers: "Database backups", months: 1, from: "the backup being taken", atEnd: "archive", reason: "ICO: where erasure is not immediate in backups, data is put beyond use until the backup expires; the backup window is the stated period.", confidence: "guidance" },
];

export const RETENTION_SCHEDULE_UPDATED = "2026-10-31";

export function retentionRule(key: string): RetentionRule {
  const r = RETENTION_SCHEDULE.find((x) => x.key === key);
  if (!r) throw new Error(`Unknown retention rule ${key}`);
  return r;
}

// ---- Review queue and decisions (2026-10-31) ----------------------------------------------------------------------------------------------

export type RetentionRecordType = "TENDER" | "CONTRACT" | "COMPLAINT" | "COMPLAINANT";
export type RetentionDecisionKind = "KEEP" | "ARCHIVED" | "ANONYMISED";

export interface RetentionQueueItem {
  ruleKey: string;
  recordType: RetentionRecordType;
  recordId: string;
  label: string;
  /** When the period ended. */
  dueSince: string;
  months: number;
  /** What the person may choose; KEEP always needs a reason. */
  actions: RetentionDecisionKind[];
  link: string | null;
}

export interface RetentionDecisionInput {
  ruleKey: string;
  recordType: RetentionRecordType;
  recordId: string;
  decision: RetentionDecisionKind;
  reason?: string;
}

export interface RetentionEffectiveRule extends RetentionRule {
  defaultMonths: number;
  overridden: boolean;
  overrideReason: string | null;
}

export interface RetentionOverrideInput { ruleKey: string; months: number; reason: string }

/** A copy of everything held about a complainant (subject access), for a person to read before sending. */
export interface ComplaintSubjectAccessCopy {
  generatedAt: string;
  query: string;
  complaints: {
    id: string; referenceNumber: string; title: string; status: string; direction: string; receivedAt: string; closedAt: string | null;
    complainantName: string | null; complainantEmail: string | null; complainantPhone: string | null; anonymisedAt: string | null;
    description: string; findings: string | null; outcome: string | null; responseSummary: string | null;
    timeline: { when: string; kind: string; summary: string; body: string | null }[];
  }[];
}
export interface ComplaintSubjectMatch { id: string; referenceNumber: string; title: string; status: string; complainant: string | null; anonymised: boolean }

/** The months a rule applies for an organisation: its own override if it set one, otherwise the platform default. */
export function effectiveRetentionMonths(ruleKey: string, overrides: { ruleKey: string; months: number }[]): number {
  return overrides.find((o) => o.ruleKey === ruleKey)?.months ?? retentionRule(ruleKey).months;
}
