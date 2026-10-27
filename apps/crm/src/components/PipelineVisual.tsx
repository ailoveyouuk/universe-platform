"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CRM_OPEN_STAGES, CRM_OPPORTUNITY_STAGE_LABELS, categoryLabel, type CrmOpportunityStage, type CrmPipelineView } from "@universe/types";
import { Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { accentVar } from "../lib/category";
import { PipelineInsights } from "./PipelineInsights";
import { Card } from "./Collapsible";
import { SourceNote } from "./SourceNote";

const STAGE_COLOUR: Record<CrmOpportunityStage, string> = {
  IDENTIFIED: "color-mix(in srgb, var(--u-module-crm) 55%, var(--u-surface))", QUALIFYING: "color-mix(in srgb, var(--u-module-crm) 72%, var(--u-surface))", ENGAGED: "var(--u-module-crm)", SUBMITTED: "var(--u-brand-violet)",
  WON: "var(--u-module-product-database)", LOST: "var(--u-ink-secondary)", WITHDRAWN: "color-mix(in srgb, var(--u-ink-secondary) 55%, var(--u-surface))",
};
const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "14px 16px", backgroundColor: "var(--u-surface-raised)", display: "grid", gap: 10, minWidth: 0 };
const h2: React.CSSProperties = { margin: 0, fontSize: 16, fontFamily: "var(--u-font-display)" };
const muted: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };

/**
 * The pipeline as a picture (2026-10-27, Lewis: the figures read as an afterthought and connected to nothing). All values are converted into one currency chosen here, at
 * today's platform rate, so they can be compared and added. Choosing a stage filters the opportunity list below; kinds link to the stakeholder list for that kind.
 */
export function PipelineVisual({ stage, onStage, onAttention, version, relationshipId }: { stage: string; onStage?: (s: string) => void; onAttention?: (a: "stale" | "overdue") => void; version: number; relationshipId?: string }) {
  const [v, setV] = useState<CrmPipelineView | null>(null);
  const [cur, setCur] = useState<string>("");
  const [by, setBy] = useState<"value" | "count">("value");
  const [err, setErr] = useState(false);
  useEffect(() => { apiClient.crmPipelineView(cur || undefined, relationshipId).then((d) => { setV(d); setErr(false); }).catch(() => setErr(true)); }, [cur, version, relationshipId]);
  if (err) return <p role="status" style={muted}>The pipeline chart is not available just now.</p>;
  if (!v) return <p role="status" style={muted}>Loading the pipeline chart…</p>;
  const short = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: v.currency, currencyDisplay: "narrowSymbol", notation: "compact", maximumFractionDigits: 1 }).format(n);
  const money = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: v.currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
  const metric = (x: { count: number; value: number }) => (by === "value" ? x.value : x.count);
  const label = (x: { count: number; value: number }) => (by === "value" ? `${money(x.value)} · ${x.count}` : `${x.count} · ${money(x.value)}`);
  const maxStage = Math.max(1, ...v.stages.map(metric));
  const maxMonth = Math.max(1, ...v.months.map(metric), metric(v.overdue));
  const maxKind = Math.max(1, ...v.kinds.map(metric));
  const next30 = v.months[0];
  const pct = (n: number, max: number) => `${Math.max(n > 0 ? 3 : 0, Math.round((n / max) * 100))}%`;
  const missing = v.stages.reduce((n, s) => n + s.unconverted, 0);
  return (
    <section aria-labelledby="pv-h" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", justifyContent: "space-between" }}>
        <h2 id="pv-h" style={{ ...h2, fontSize: 18 }}>{relationshipId ? "Pipeline value with this stakeholder" : "Where the pipeline stands"}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ minWidth: 150 }}><Select value={v.currency} onChange={(x) => setCur(x)} options={v.currencies.map((c) => ({ value: c, label: c }))} ariaLabel="Show values in this currency" /></div>
          <div role="group" aria-label="Size bars by" style={{ display: "inline-flex", border: "1px solid var(--u-border)", borderRadius: 999, overflow: "hidden" }}>
            {(["value", "count"] as const).map((k) => <button key={k} type="button" className="u-touch" aria-pressed={by === k} onClick={() => setBy(k)} style={{ padding: "6px 14px", border: 0, font: "inherit", fontSize: 13, cursor: "pointer", backgroundColor: by === k ? "var(--u-brand-violet)" : "var(--u-surface-raised)", color: by === k ? "var(--u-on-accent)" : "var(--u-ink)" }}>{k === "value" ? "Value" : "Number"}</button>)}
          </div>
        </div>
      </div>
      <p style={muted}>Every value is shown in {v.currency}{v.rateDate ? ` at the platform rate for ${new Date(v.rateDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}, so the stages can be compared and added. Cost-side estimates only.{missing > 0 ? ` ${missing} valued ${missing === 1 ? "opportunity is" : "opportunities are"} left out because no rate was available.` : ""}</p>

      <SourceNote keys={["pipeline", "forecast"]} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))", gap: 12 }}>
        {[["Open pipeline", money(v.openValue), `${CRM_OPEN_STAGES.reduce((n, s) => n + (v.stages.find((x) => x.stage === s)?.count ?? 0), 0)} open`], ["Won", money(v.wonValue), `${v.stages.find((x) => x.stage === "WON")?.count ?? 0} won`], ["Win rate", v.winRate === null ? "None closed yet" : `${v.winRate}%`, "won out of won and lost"], ["Likely to land", money(v.weightedValue), v.model.closedCount ? `weighted by chance of winning · ${v.model.confidence === "HIGH" ? "well evidenced" : v.model.confidence === "MEDIUM" ? "some evidence" : "early estimate"}` : "weighted by stage; no history yet"], ["Due this month", next30 ? money(next30.value) : "—", `${next30?.count ?? 0} expected`]].map(([k, big, small]) => (
          <li key={k} style={{ ...card, gap: 2 }}><span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{k}</span><span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--u-font-display)", lineHeight: 1.15 }}>{big}</span><span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{small}</span></li>
        ))}
      </ul>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 14 }}>
        <Card title="By stage">
          {onStage && <p style={muted}>Choose a stage to filter the list below.</p>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {v.stages.map((s) => {
              const on = stage === s.stage || (stage === "open" && false);
              return (
                <li key={s.stage}>
                  <button type="button" disabled={!onStage} onClick={() => onStage?.(on ? "open" : s.stage)} aria-pressed={onStage ? on : undefined} aria-label={`${CRM_OPPORTUNITY_STAGE_LABELS[s.stage]}: ${s.count} opportunities, ${money(s.value)}${s.weighted > 0 ? `, likely ${money(s.weighted)}` : ""}. ${on ? "Showing in the list. Choose to show all open." : "Show in the list."}`}
                    style={{ all: "unset", display: "grid", gap: 3, width: "100%", cursor: onStage ? "pointer" : "default", boxSizing: "border-box", padding: "4px 6px", borderRadius: "var(--u-radius-md)", outline: on ? "2px solid var(--u-brand-violet)" : "none", outlineOffset: 1 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}><span style={{ fontWeight: 600 }}>{CRM_OPPORTUNITY_STAGE_LABELS[s.stage]}</span><span style={{ color: "var(--u-ink-secondary)" }}>{label(s)}{by === "value" && s.weighted > 0 ? ` · likely ${money(s.weighted)}` : ""}</span></span>
                    <span aria-hidden="true" style={{ position: "relative", display: "block", height: 14, borderRadius: 7, backgroundColor: "var(--u-border)" }}><span style={{ display: "block", height: "100%", borderRadius: 7, width: pct(metric(s), maxStage), backgroundColor: STAGE_COLOUR[s.stage], transition: "width .4s ease" }} />{by === "value" && s.weighted > 0 && <span style={{ position: "absolute", left: 0, top: 4, height: 6, borderRadius: 3, width: pct(s.weighted, maxStage), backgroundColor: "var(--u-surface-raised)", opacity: 0.85 }} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Expected over the next twelve months">
          <p style={muted}>Open opportunities by the month they are expected, in {v.currency}. {by === "value" ? "The darker part of each bar is the share likely to be won." : ""}</p>
          <div style={{ overflowX: "auto" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: "0 0 2px", display: "flex", alignItems: "flex-end", gap: 6, height: 170, minWidth: v.months.length * 54 }}>
              {v.months.map((m) => {
                const d = m.month === "later" ? null : new Date(`${m.month}-01T00:00:00Z`);
                const name = d ? d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) : "Later";
                return (
                  <li key={m.month} tabIndex={0} aria-label={`${d ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : "Later than twelve months"}: ${m.count} expected, ${money(m.value)}, likely ${money(m.weighted)}`} title={`${name}: ${m.count} expected, ${money(m.value)}, likely ${money(m.weighted)}`}
                    style={{ flex: "1 0 50px", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 11, whiteSpace: "nowrap", color: "var(--u-ink-secondary)" }}>{metric(m) > 0 ? (by === "value" ? short(m.value) : m.count) : ""}</span>
                    <span aria-hidden="true" style={{ position: "relative", width: "70%", minHeight: metric(m) > 0 ? 4 : 1, height: `${(metric(m) / maxMonth) * 100 * 0.72}%`, borderRadius: "4px 4px 0 0", backgroundColor: metric(m) > 0 ? "var(--u-module-crm)" : "var(--u-border)", transition: "height .4s ease", display: "flex", alignItems: "flex-end" }}>{by === "value" && m.value > 0 && <span style={{ display: "block", width: "100%", height: `${Math.min(100, (m.weighted / m.value) * 100)}%`, backgroundColor: "var(--u-brand-violet)", borderRadius: "0 0 0 0" }} />}</span>
                    <span style={{ fontSize: 11.5 }}>{name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <SourceNote keys={["pipeline"]} />
          <p style={{ ...muted, fontSize: 12.5 }}>{v.overdue.count > 0 ? `${v.overdue.count} open past their expected date (${money(v.overdue.value)}). ` : "None past their expected date. "}{v.noDate.count > 0 ? `${v.noDate.count} open with no date (${money(v.noDate.value)}).` : ""}</p>
        </Card>

        {!relationshipId && <Card title="Open pipeline by kind of stakeholder">
          <p style={muted}>Choose a kind to see those stakeholders.</p>
          <SourceNote keys={["kinds"]} />
          {v.kinds.length === 0 ? <p style={muted}>No open opportunities.</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {v.kinds.map((k) => (
                <li key={k.key}>
                  <Link href={k.key === "OTHER" ? "/relationships" : `/relationships?role=${k.key}`} style={{ display: "grid", gap: 3, textDecoration: "none", color: "var(--u-ink)", padding: "4px 6px" }} aria-label={`${k.key === "OTHER" ? "Other" : categoryLabel(k.key)}: ${k.count} open, ${money(k.value)}. Open the stakeholder list`}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}><span style={{ fontWeight: 600 }}>{k.key === "OTHER" ? "Other" : categoryLabel(k.key)}</span><span style={{ color: "var(--u-ink-secondary)" }}>{label(k)}</span></span>
                    <span aria-hidden="true" style={{ display: "block", height: 14, borderRadius: 7, backgroundColor: "var(--u-border)" }}><span style={{ display: "block", height: "100%", borderRadius: 7, width: pct(metric(k), maxKind), backgroundColor: k.key === "OTHER" ? "var(--u-ink-secondary)" : accentVar(k.key as never), transition: "width .4s ease" }} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>}
      </div>
      {!relationshipId && v.stakeholders.length > 0 && (
        <Card title="Biggest opportunities by stakeholder">
          <p style={muted}>Ranked by open pipeline value. Choose a stakeholder to open its pipeline.</p>
          <SourceNote keys={["pipeline"]} />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {v.stakeholders.map((x) => (
              <li key={x.relationshipId} style={{ display: "grid", gap: 3 }}>
                <Link href={`/relationships?id=${x.relationshipId}&tab=financials`} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", textDecoration: "none", color: "var(--u-ink)", padding: "4px 6px", borderLeft: `4px solid ${accentVar((x.kinds.find((k) => ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR", "CLIENT"].includes(k)) ?? "CLIENT") as never)}` }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{x.name}<span style={{ fontWeight: 400, color: "var(--u-ink-secondary)", fontSize: 13 }}> · {x.kinds.map(categoryLabel).join(", ")}</span></span>
                  <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{money(x.openValue)} open ({x.openCount}) · {money(x.wonValue)} won{x.winRate !== null ? ` · ${x.winRate}% win rate` : ""}</span>
                </Link>
                <span aria-hidden="true" style={{ display: "block", height: 8, borderRadius: 4, backgroundColor: "var(--u-border)", margin: "0 6px" }}><span style={{ display: "block", height: "100%", borderRadius: 4, width: pct(x.openValue, Math.max(1, v.stakeholders[0].openValue)), backgroundColor: "var(--u-module-crm)" }} /></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <PipelineInsights v={v} money={money} relationshipId={relationshipId} onAttention={onAttention} />
    </section>
  );
}
