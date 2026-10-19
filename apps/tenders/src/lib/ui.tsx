"use client";

import type { CSSProperties, ReactNode } from "react";
import type { TenderStatus, TenderType } from "@universe/types";

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

export const ErrorNote = ({ message }: { message: string | null }) => message ? <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", color: "var(--u-status-critical)", fontSize: 13.5, backgroundColor: "rgba(208,59,59,0.06)" }}>{message}</div> : null;

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set");
export const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set");
/** `<input type="datetime-local">` value from an ISO string, in local time. */
export const toLocalInput = (iso: string | null | undefined) => { if (!iso) return ""; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);
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
export const QUALIFICATIONS = [{ value: "WHO_PQ", label: "WHO prequalification" }, { value: "SRA", label: "Stringent Regulatory Authority approval" }, { value: "ISO_13485", label: "ISO 13485" }, { value: "ISO_9001", label: "ISO 9001" }, { value: "ERP", label: "Expert Review Panel (ERP) approval" }];
export const RULE_LABEL: Record<string, string> = { ORG_TYPE: "Organisation type", COUNTRY: "Country", CATEGORY: "Product category", QUALIFICATION: "Qualification", EXCLUDED_ORG: "Excluded organisation" };
export const EVENT_LABEL: Record<string, string> = { CREATED: "Created", PUBLISHED: "Published", INVITED: "Invitation", DEADLINE_EXTENDED: "Deadline extended", CANCELLED: "Cancelled", INTEREST_EXPRESSED: "Interest", INTEREST_WITHDRAWN: "Interest withdrawn" };
