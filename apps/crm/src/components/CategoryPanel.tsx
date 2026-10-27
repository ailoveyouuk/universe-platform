"use client";
import { useEffect, useState } from "react";
import { CRM_CATEGORY_LABELS, type CrmCategoryProfile, type CrmCertState, type CrmCategoryKey } from "@universe/types";
import { Pill, UNIVERSE_APPS } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { accentVar, CATEGORY_ORDER } from "../lib/category";
import { fmtDate, humanise } from "../lib/ui";

const lab: React.CSSProperties = { color: "var(--u-ink-secondary)", fontSize: 12.5 };
const STATE_TONE: Record<CrmCertState, "good" | "warning" | "critical" | "neutral"> = { valid: "good", expiring: "warning", expired: "critical", no_date: "neutral" };
const STATE_LABEL: Record<CrmCertState, string> = { valid: "Valid", expiring: "Expiring soon", expired: "Expired", no_date: "No expiry date" };

function Tile({ title, main, sub }: { title: string; main: React.ReactNode; sub?: React.ReactNode }) {
  return <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px", display: "grid", gap: 2, background: "var(--u-surface)" }}><span style={lab}>{title}</span><span style={{ fontWeight: 600 }}>{main}</span>{sub && <span style={lab}>{sub}</span>}</div>;
}
const CERT_LABEL: Record<string, string> = { ISO_13485: "ISO 13485", ISO_9001: "ISO 9001", ISO_14001: "ISO 14001", GMP: "GMP", GDP: "GDP", MIA: "MIA", WDA: "WDA", FDA_REGISTRATION: "FDA registration", WHO_PREQUALIFICATION: "WHO prequalification", OTHER_ISO: "Other ISO" };
const certName = (t: string) => CERT_LABEL[t] ?? humanise(t);
const yn = (b: boolean) => (b ? "Yes" : "No");
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 };

function Section({ cat, children }: { cat: CrmCategoryKey; children: React.ReactNode }) {
  return (
    <section aria-label={CRM_CATEGORY_LABELS[cat]} style={{ borderLeft: `4px solid ${accentVar(cat)}`, paddingLeft: 12, display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 14 }}>{CRM_CATEGORY_LABELS[cat]}</h2>
      {children}
    </section>
  );
}

/** What is particular to this stakeholder's kind: a manufacturer's sites, quality certificates and batches; a supplier's scope; a forwarder's capabilities; a Universe organisation's published tenders. */
export function CategoryPanel({ relId }: { relId: string }) {
  const [p, setP] = useState<CrmCategoryProfile | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { let live = true; setP(null); apiClient.crmCategory(relId).then((x) => { if (live) setP(x); }).catch(() => { if (live) setErr(true); }); return () => { live = false; }; }, [relId]);
  if (err) return null;
  if (!p) return <p style={{ margin: 0, ...lab }}>Loading what is particular to this stakeholder…</p>;
  const cats = CATEGORY_ORDER.filter((k) => p.categories.includes(k));
  const tendersHref = UNIVERSE_APPS.find((a) => a.key === "tender-issuance")?.href;
  const certs = (
    <div style={{ overflowX: "auto" }}>
      <table aria-label="Quality and regulatory certificates" style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead><tr>{["Certificate", "Issued by", "Issued", "Expires", "Evidence", "State"].map((h) => <th key={h} scope="col" style={{ textAlign: "left", padding: "6px 10px", ...lab, fontWeight: 600, borderBottom: "1px solid var(--u-border)" }}>{h}</th>)}</tr></thead>
        <tbody>{p.certificates.map((c) => (
          <tr key={c.id}>
            <td style={cell}>{certName(c.type)}{c.referenceNumber ? <span style={lab}> · {c.referenceNumber}</span> : null}</td>
            <td style={cell}>{c.issuingBody ?? "Not recorded"}</td>
            <td style={cell}>{c.issuedDate ? fmtDate(c.issuedDate) : "Not dated"}</td>
            <td style={cell}>{c.expiryDate ? fmtDate(c.expiryDate) : "Not dated"}</td>
            <td style={cell}>{c.hasDocument ? (c.verifiedAt ? "Document, verified" : "Document, not verified") : "No document"}</td>
            <td style={cell}><Pill tone={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Pill></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {cats.includes("MANUFACTURER") && (
        <Section cat="MANUFACTURER">
          <div style={grid}>
            {p.manufacturer?.countryOfManufacture && <Tile title="Country of manufacture" main={p.manufacturer.countryOfManufacture} />}
            <Tile title="Manufacturing sites" main={p.sites.length} sub={p.sites.slice(0, 3).map((s) => `${s.name}${s.countryCode ? ` (${s.countryCode})` : ""}`).join(", ") || undefined} />
            {p.batches && <Tile title="Batches on record" main={p.batches.total} sub={`${p.batches.active} active · ${p.batches.expiringSoon} expiring in 90 days · ${p.batches.expired} past expiry`} />}
            {p.batches && p.batches.covered !== null && <Tile title="Batches made under a valid quality certificate" main={`${p.batches.covered} of ${p.batches.covered + (p.batches.notCovered ?? 0)}`} sub={p.batches.notCovered ? `${p.batches.notCovered} made with no ISO 13485 or GMP certificate in date` : "ISO 13485 or GMP in date on every batch date"} />}
          </div>
          {p.manufacturer?.scopeOfSupply && <p style={{ margin: 0, ...lab }}>Scope: {p.manufacturer.scopeOfSupply}</p>}
        </Section>
      )}
      {cats.includes("SUPPLIER") && (
        <Section cat="SUPPLIER">
          <div style={grid}>
            <Tile title="Product category" main={p.supplier?.productCategory ? humanise(p.supplier.productCategory) : "Not recorded"} />
            <Tile title="Scope of supply" main={p.supplier?.scopeOfSupply ? p.supplier.scopeOfSupply.split(",").map((x) => humanise(x.trim())).join(", ") : "Not recorded"} />
            <Tile title="Code of conduct" main={p.supplier ? (p.supplier.codeOfConductAcknowledged ? "Acknowledged" : "Not acknowledged") : "Not recorded"} />
          </div>
        </Section>
      )}
      {(cats.includes("FREIGHT_FORWARDER") || cats.includes("LOGISTICS")) && (
        <Section cat={cats.includes("FREIGHT_FORWARDER") ? "FREIGHT_FORWARDER" : "LOGISTICS"}>
          <div style={grid}>
            <Tile title="Modes of transport" main={p.logistics?.modes ? p.logistics.modes.split(",").map((x) => humanise(x.trim())).join(", ") : "Not recorded"} />
            <Tile title="IATA dangerous goods" main={p.logistics ? yn(p.logistics.iataDgr) : "Not recorded"} />
            <Tile title="AEO accredited" main={p.logistics ? yn(p.logistics.aeo) : "Not recorded"} />
            <Tile title="GDP transport capable" main={p.logistics ? yn(p.logistics.gdpTransport) : "Not recorded"} />
          </div>
        </Section>
      )}
      {cats.includes("WAREHOUSING") && (
        <Section cat="WAREHOUSING">
          <div style={grid}>
            <Tile title="Wholesale licence (WDA)" main={p.warehousing?.wdaNumber ?? "Not recorded"} />
            <Tile title="Last GDP audit" main={p.warehousing?.lastGdpAudit ? fmtDate(p.warehousing.lastGdpAudit) : "Not recorded"} />
            <Tile title="Next GDP audit due" main={p.warehousing?.nextGdpAuditDue ? fmtDate(p.warehousing.nextGdpAuditDue) : "Not scheduled"} />
          </div>
        </Section>
      )}
      {cats.includes("CLIENT") && (
        <Section cat="CLIENT">
          <div style={grid}>
            <Tile title="Delivers to" main={p.client?.deliveryCity ?? "Not recorded"} />
            <Tile title="Billing country" main={p.client?.billingCountry ?? "Not recorded"} />
          </div>
        </Section>
      )}
      {(["TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR"] as CrmCategoryKey[]).filter((k) => cats.includes(k)).map((k) => (
        <Section key={k} cat={k}><p style={{ margin: 0, ...lab }}>A Universe organisation that has published its profile.</p></Section>
      ))}
      {p.tenders && (
        <section aria-label="Tenders they have published" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14 }}>Tenders they have published ({p.tenders.total})</h2>
          {p.tenders.items.length === 0
            ? <p style={{ margin: 0, ...lab }}>No published tenders that you can see.</p>
            : <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>{p.tenders.items.map((t) => (
                <li key={t.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {tendersHref ? <a href={`${tendersHref}/discover/view?id=${t.id}`}>{t.reference} {t.title}</a> : <span>{t.reference} {t.title}</span>}
                  <Pill tone="neutral">{humanise(t.status)}</Pill>
                  {t.closingAt && <span style={lab}>closes {fmtDate(t.closingAt)}</span>}
                </li>))}</ul>}
        </section>
      )}
      {p.certificates.length > 0 && (
        <section aria-label="Quality documents" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14 }}>Quality documents and certificates</h2>
          {certs}
        </section>
      )}
    </div>
  );
}
const cell: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" };
