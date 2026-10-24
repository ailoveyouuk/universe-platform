"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductDossier } from "@universe/types";
import { Button, DownloadIcon, Pill, PrinterIcon } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { saveTextFile } from "../../../lib/download";

const d = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section style={{ marginTop: 26, breakInside: "avoid-page" }}>
      <h2 style={{ fontFamily: "var(--u-font-display)", fontSize: 17, margin: "0 0 8px", borderBottom: "1px solid var(--u-border)", paddingBottom: 6 }}>
        {title}{count !== undefined ? ` (${count})` : ""}
      </h2>
      {children}
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: 0 }}>{empty}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid var(--u-border)", color: "var(--u-ink-secondary)", fontWeight: 600 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "5px 8px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" }}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Product dossier (step 5, 2026-10-18): one product's whole record on one printable page, plus a JSON download. */
export function DossierView() {
  const id = useSearchParams()?.get("id") ?? "";
  const [dossier, setDossier] = useState<ProductDossier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.getProductDossier(id).then(setDossier).catch((e) => setError(e instanceof Error ? e.message : "Could not build the dossier."));
  }, [id]);

  if (error) return <div style={{ padding: 32, color: "var(--u-status-critical-text)" }}>{error}</div>;
  if (!dossier) return <div style={{ padding: 32 }}>{id ? "Building the dossier…" : "No product selected."}</div>;
  const p = dossier.product;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`@media print { .no-print, nav, aside { display: none !important; } main { padding: 0 !important; max-width: none !important; } }`}</style>
      <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <Link href={`/products/detail?id=${p.id}`} style={{ fontSize: 13 }}>Back to product</Link>
        <span style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={() => window.print()}><PrinterIcon size={14} /> Print or save as PDF</Button>
        <Button variant="secondary" size="sm" onClick={() => saveTextFile(`universe-dossier-${p.id}.json`, JSON.stringify(dossier, null, 2), "application/json")}><DownloadIcon size={14} /> Download data (JSON)</Button>
      </div>

      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>{p.name}</h1>
      <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "4px 0 0" }}>
        Product dossier prepared for {dossier.generatedFor} on {d(dossier.generatedAt)}. Registrations, documents and notices are shared catalogue facts; verifications and reviews are your organisation&rsquo;s own. Not a substitute for the regulator&rsquo;s own record.
      </p>

      <Section title="Compliance position">
        <Pill tone={p.compliance.status === "OK" ? "good" : p.compliance.status === "WARNING" ? "warning" : "critical"}>{p.compliance.status === "OK" ? "No issues recorded" : p.compliance.status === "WARNING" ? "Needs attention" : "Blocked"}</Pill>
        {p.compliance.reasons.length > 0 && <ul style={{ fontSize: 13, margin: "8px 0 0", paddingLeft: 18 }}>{p.compliance.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "8px 0 0" }}>Record completeness {p.completeness.score}% ({p.completeness.filled} of {p.completeness.total} applicable fields).{p.completeness.missing.length > 0 ? ` Missing: ${p.completeness.missing.join(", ")}.` : ""}</p>
      </Section>

      <Section title="Identity">
        <Table
          head={["Field", "Value", "Field", "Value"]}
          empty=""
          rows={[
            ["Family", v(p.familyName), "Variant", v(p.variantLabel)],
            ["Brand", v(p.brand), "INN", v(p.inn)],
            ["Category", v(p.category), "Regulatory class", v(p.regulatoryClass)],
            ["Strength", v(p.strength), "Dosage form", v(p.dosageForm)],
            ["Pack size", v(p.packSize), "GTIN", v(p.gtin)],
            ["HS code", v(p.hsCode), "UNSPSC", v(p.unspscCode)],
            ["Standard unit", v(p.standardUnit), "Lifecycle", v(p.lifecycleStatus)],
            ["Storage", v(p.storageClass), "Cold chain", p.coldChain ? "Yes" : "No"],
            ["Shelf life (months)", v(p.shelfLifeMonths), "Hazard class", v(p.hazardClass)],
            ["Controlled substance", p.controlledSubstance ? "Yes" : "No", "Intended use", v(p.intendedUse)],
            ["Contributed by", v(p.addedByOrganizationName), "Next review due", d(p.nextReviewDue)],
          ]}
        />
      </Section>

      <Section title="Regulatory registrations" count={dossier.registrations.length}>
        <Table
          head={["Authority", "Reference", "Country", "Holder", "Expires", "Status", "Your verification"]}
          empty="No registrations on record. An empty list is not evidence that the product is unregistered."
          rows={dossier.registrations.map((r) => [
            `${r.authority}${r.scheme ? ` (${r.scheme})` : ""}${r.inherited ? " · family" : ""}`, r.referenceNumber, v(r.countryCode), v(r.holderName), d(r.expiryDate), r.effectiveStatus,
            r.myVerification ? `${r.myVerification.outcome.replace(/_/g, " ").toLowerCase()} by ${r.myVerification.verifiedByName}, ${d(r.myVerification.verifiedAt)}` : "Not yet verified",
          ])}
        />
      </Section>

      <Section title="Controlled documents" count={dossier.documents.length}>
        <Table
          head={["Type", "Title", "Version", "Status", "Effective", "Expires", "Scan"]}
          empty="No documents on record for your organisation."
          rows={dossier.documents.map((x) => [x.docType.replace(/_/g, " "), `${x.title}${x.inherited ? " (family)" : ""}`, x.version, x.isExpired ? "EXPIRED" : x.status, d(x.effectiveDate), d(x.expiryDate), x.scanStatus.replace(/_/g, " ").toLowerCase()])}
        />
      </Section>

      <Section title="Safety notices and recalls" count={dossier.safetyNotices.length}>
        <Table
          head={["Issued", "Type", "Severity", "Authority", "Title", "Status", "Your review"]}
          empty="No safety notices recorded. This is not a clearance: see the Regulatory watch for what is monitored."
          rows={dossier.safetyNotices.map((n) => [d(n.issueDate), n.noticeType.replace(/_/g, " ").toLowerCase(), n.severity, n.authority, n.title, n.status === "CLOSED" ? `Closed ${d(n.closedDate)}` : "Open", n.myReview ? `${n.myReview.outcome.replace(/_/g, " ").toLowerCase()}, ${d(n.myReview.reviewedAt)}` : n.needsReview ? "Review needed" : "—"])}
        />
      </Section>

      <Section title="Export and hoarding restrictions" count={dossier.exportRestrictions.length}>
        <Table
          head={["Country", "Medicine", "Strength", "Form", "Since", "Match"]}
          empty="No active restriction matches this product. Advisory check only; see the Regulatory watch for the sources covered."
          rows={dossier.exportRestrictions.map((m) => [m.restriction.restrictingCountryCode, m.restriction.medicineName, v(m.restriction.strength), v(m.restriction.form), d(m.restriction.restrictionDate), m.certainty === "MATCH" ? "Match" : "Check: " + m.detail])}
        />
      </Section>

      <Section title="Change history" count={dossier.history.length}>
        <Table
          head={["When", "Field", "From", "To", "By"]}
          empty="No changes recorded."
          rows={dossier.history.slice(0, 100).map((h) => [d(h.changedAt), h.fieldName, v(h.oldValue), v(h.newValue), `${v(h.changedByName)}${h.changedByOrganizationName ? `, ${h.changedByOrganizationName}` : ""}`])}
        />
        {dossier.history.length > 100 && <p style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>Showing the latest 100 of {dossier.history.length}; the JSON download has them all.</p>}
      </Section>
    </div>
  );
}
