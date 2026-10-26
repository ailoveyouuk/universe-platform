"use client";

import type { CSSProperties, ReactNode } from "react";
import type { TenderStatus, TenderType } from "@universe/types";
import { QUALIFICATION_OPTIONS } from "@universe/types";

export const inputStyle: CSSProperties = { padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5, minWidth: 0, width: "100%", boxSizing: "border-box", backgroundColor: "var(--u-surface)", color: "var(--u-ink)" };

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: wide ? "1 / -1" : undefined, minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--u-ink)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)", lineHeight: 1.4 }}>{hint}</span>}
    </label>
  );
}

export function Card({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "18px 20px", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {title && <h2 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16, color: "var(--u-ink)" }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Page = ({ children }: { children: ReactNode }) => <div style={{ padding: "28px 32px 56px", maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>;

export const Heading = ({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) => (
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24, color: "var(--u-ink)" }}>{title}</h1>
      {sub && <div style={{ marginTop: 6, color: "var(--u-ink-secondary)", fontSize: 13.5 }}>{sub}</div>}
    </div>
    {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

/** Sticky so an error stays in view even when the action that caused it is far down a long panel. */
export const ErrorNote = ({ message }: { message: string | null }) => message ? <div role="alert" style={{ position: "sticky", top: 8, zIndex: 20, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", color: "var(--u-status-critical-text)", fontSize: 13.5, backgroundColor: "var(--u-surface)", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>{message}</div> : null;

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set");
/** The viewer's own IANA zone, used as the default for a new tender. */
export const browserZone = (): string => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } };
export const zoneList = (): string[] => { try { const l = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone"); return l && l.length ? ["UTC", ...l.filter((z) => z !== "UTC")] : ["UTC", "Europe/London"]; } catch { return ["UTC", "Europe/London"]; } };
/** A date and time with its zone spelled out, e.g. "12 Nov 2026, 12:00 GMT" (UTC 12:00). Without a zone the viewer's own is used and named. */
export const fmtDateTime = (iso: string | null | undefined, zone?: string | null) => {
  if (!iso) return "Not set";
  const d = new Date(iso);
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" };
  try {
    const main = d.toLocaleString("en-GB", { ...o, ...(zone ? { timeZone: zone } : {}) });
    return zone && zone !== "UTC" ? `${main} (${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC)` : main;
  } catch { return d.toLocaleString("en-GB", o); }
};
const zoneParts = (d: Date, tz: string) => { const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); const o: Record<string, string> = {}; for (const p of f.formatToParts(d)) o[p.type] = p.value; return o; };
const zoneOffsetMs = (d: Date, tz: string) => { const o = zoneParts(d, tz); return Date.UTC(+o.year!, +o.month! - 1, +o.day!, +o.hour!, +o.minute!, +o.second!) - Math.floor(d.getTime() / 1000) * 1000; };
/** `<input type="datetime-local">` value for an instant, as the wall-clock time in the given zone. */
export const toLocalInput = (iso: string | null | undefined, zone?: string | null) => { if (!iso) return ""; const z = zone || browserZone(); const o = zoneParts(new Date(iso), z); return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`; };
/** The instant (ISO) for a wall-clock `datetime-local` value typed in the given zone. */
export const fromLocalInput = (v: string, zone?: string | null) => {
  if (!v) return undefined;
  const z = zone || browserZone();
  const [d, t] = v.split("T"); const [y, m, da] = d!.split("-").map(Number); const [h, mi] = t!.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, da!, h!, mi!);
  let utc = guess - zoneOffsetMs(new Date(guess), z);
  utc = guess - zoneOffsetMs(new Date(utc), z);
  return new Date(utc).toISOString();
};
export const daysUntil = (iso: string | null | undefined, now = new Date()) => (iso ? Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000) : null);

export const STATUS_LABEL: Record<TenderStatus, string> = { DRAFT: "Draft", PUBLISHED: "Open", CLOSED: "Closed", EVALUATING: "Evaluating", AWARDED: "Awarded", CONTRACTED: "Contracted", CANCELLED: "Cancelled" };
export const STATUS_TONE: Record<TenderStatus, "neutral" | "brand" | "good" | "warning" | "critical"> = { DRAFT: "neutral", PUBLISHED: "good", CLOSED: "warning", EVALUATING: "brand", AWARDED: "brand", CONTRACTED: "good", CANCELLED: "critical" };
export const TYPE_LABEL: Record<TenderType, string> = { RFQ: "Request for quotation", RFP: "Request for proposals", ITT: "Invitation to tender", OPEN_TENDER: "Open tender", FRAMEWORK: "Framework agreement" };
export const VISIBILITY_LABEL: Record<string, string> = {
  ELIGIBLE_ORGANISATIONS: "Every registered organisation can see it; only eligible or invited ones can bid",
  ALL_REGISTERED: "Every registered organisation can see it and bid",
  INVITED_ONLY: "Only organisations you invite can see it",
};
export const ORG_TYPE_LABEL: Record<string, string> = { PROCUREMENT_SERVICE_AGENT: "Procurement agent", TENDERING_PURCHASING_BODY: "Tendering body", MANUFACTURER: "Manufacturer", SUPPLIER: "Supplier", FUNDER_DONOR: "Funder or donor", DATA_INSIGHTS_USER: "Data and insights" };
export const QUALIFICATIONS = QUALIFICATION_OPTIONS;
export const RULE_LABEL: Record<string, string> = { ORG_TYPE: "Organisation type", COUNTRY: "Country", CATEGORY: "Product category", QUALIFICATION: "Qualification", EXCLUDED_ORG: "Excluded organisation", MIN_SUPPLIER_RATING: "Platform rating" };
export const EVENT_LABEL: Record<string, string> = { MINI_COMP_SCORED: "Quote scored", CALL_OFF_RAISED: "Call-off raised", EVIDENCE_ADDED: "Evidence logged", EVIDENCE_ACKNOWLEDGED: "Evidence acknowledged", EVIDENCE_WITHDRAWN: "Evidence withdrawn", VARIATION_PROPOSED: "Variation proposed", VARIATION_ACCEPTED: "Variation accepted", VARIATION_REJECTED: "Variation rejected", VARIATION_WITHDRAWN: "Variation withdrawn", MINI_COMP_INVITED: "Invited to quote", MINI_COMP_QUOTED: "Quote submitted", MINI_COMP_DECLINED: "Declined to quote", MINI_COMP_CLOSED: "Quoting closed early", MINI_COMP_CANCELLED: "Mini-competition cancelled", MINI_COMP_WON: "Mini-competition won", MINI_COMP_LOST: "Mini-competition lost", CALL_OFF_APPROVED: "Call-off authorised", CALL_OFF_CANCELLED: "Call-off cancelled", CALL_OFF_ACCEPTED: "Call-off accepted", CALL_OFF_DECLINED: "Call-off declined", PRICE_REVIEW_PROPOSED: "Price review proposed", PRICE_REVIEW_ACCEPTED: "Price review accepted", PRICE_REVIEW_REJECTED: "Price review rejected", CREATED: "Created", PUBLISHED: "Published", INVITED: "Invitation", DEADLINE_EXTENDED: "Deadline extended", CANCELLED: "Cancelled", INTEREST_EXPRESSED: "Interest", INTEREST_WITHDRAWN: "Interest withdrawn", QUESTION_ASKED: "Question received", CLARIFICATION_PUBLISHED: "Clarification published", ADDENDUM_ISSUED: "Addendum issued", ADDENDUM_ACKNOWLEDGED: "Addendum acknowledged", SCREENING_RECORDED: "Screening recorded", BID_SUBMITTED: "Bid submitted", BID_WITHDRAWN: "Bid withdrawn", BIDS_OPENED: "Bids opened", BIDS_VIEWED: "Bids viewed", TIMETABLE_CHANGED: "Timetable changed", EVALUATORS_ASSIGNED: "Evaluators assigned", COI_DECLARED: "Conflict declaration made", EVALUATION_STARTED: "Evaluation started", SCORING_FINALISED: "Scoring finalised", AWARD_MADE: "Award made", AWARD_APPROVAL_REQUESTED: "Award proposed, waiting for a second authoriser", AWARD_APPROVAL_REJECTED: "Proposed award not approved", AWARD_APPROVAL_WITHDRAWN: "Proposed award withdrawn", DEBRIEFS_RELEASED: "Debriefs released", COMPLAINT_LODGED: "Complaint lodged", COMPLAINT_RESPONDED: "Complaint answered", BID_FILE_VIEWED: "Bid document opened", CONTRACT_CREATED: "Contract drafted", CONTRACT_UPDATED: "Contract updated", CONTRACT_SENT: "Contract sent", CONTRACT_FILE_ADDED: "Contract file added", CONTRACT_SIGNATORY_RECORDED: "Signatory recorded", CONTRACT_SIGNATORY_REMOVED: "Signatory removed", CONTRACT_EXECUTED: "Contract executed", CONTRACT_CLOSED: "Contract closed", MILESTONE_ADDED: "Milestone added", MILESTONE_UPDATED: "Milestone updated", PROJECT_CREATED: "Delivery project created", DOCUMENT_ADDED: "Document added", DOCUMENT_REPLACED: "Document replaced", DOCUMENT_REMOVED: "Document withdrawn", PERFORMANCE_RECORDED: "Performance record created", PERFORMANCE_REPLIED: "Supplier replied to record", PERFORMANCE_DISPUTED: "Supplier disputed a measure", PERFORMANCE_ANSWERED: "Dispute answered", PERFORMANCE_WITHDRAWN: "Performance record withdrawn", PERFORMANCE_RESTORED: "Performance record restored", PAYMENT_LOGGED: "Payment logged" };

export const CHIP_LABEL: Record<string, string> = { ELIGIBLE: "You can bid", ALMOST_ELIGIBLE: "Almost eligible", NOT_ELIGIBLE: "Not eligible", INVITED: "Invited", PARTICIPATING: "Interested", SHORTLISTED: "Shortlisted", CLOSING_SOON: "Closing soon", CLOSED: "Closed" };
export const CHIP_TONE: Record<string, "neutral" | "brand" | "good" | "warning" | "critical"> = { ELIGIBLE: "good", ALMOST_ELIGIBLE: "warning", NOT_ELIGIBLE: "critical", INVITED: "brand", PARTICIPATING: "brand", SHORTLISTED: "neutral", CLOSING_SOON: "warning", CLOSED: "neutral" };
