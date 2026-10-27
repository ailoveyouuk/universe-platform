"use client";

import Link from "next/link";
import { CRM_OPPORTUNITY_KIND_LABELS, CRM_OPPORTUNITY_STAGE_LABELS, type CrmOpportunityKind, type CrmPipelineView } from "@universe/types";
import { SourceNote } from "./SourceNote";

const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "14px 16px", backgroundColor: "var(--u-surface-raised)", display: "grid", gap: 10, minWidth: 0, alignContent: "start" };
const h2: React.CSSProperties = { margin: 0, fontSize: 16, fontFamily: "var(--u-font-display)" };
const muted: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const list: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 };
const track: React.CSSProperties = { display: "block", height: 10, borderRadius: 5, backgroundColor: "var(--u-border)", overflow: "hidden" };
const SEGMENT = ["var(--u-module-crm)", "var(--u-brand-violet)", "var(--u-module-product-database)", "color-mix(in srgb, var(--u-module-crm) 55%, var(--u-surface))", "var(--u-ink-secondary)", "color-mix(in srgb, var(--u-brand-violet) 55%, var(--u-surface))"];

/**
 * The analysis beneath the pipeline chart (2026-10-27): why deals are lost, what needs attention, who owns the pipeline, which currencies it is exposed to,
 * how deals move between stages and how reliable the expected figures have been. Everything comes from the same view the chart uses, in the chosen currency.
 */
export function PipelineInsights({ v, money, relationshipId, onAttention }: { v: CrmPipelineView; money: (n: number) => string; relationshipId?: string; onAttention?: (a: "stale" | "overdue") => void }) {
  const maxReason = Math.max(1, ...v.lost.reasons.map((r) => r.count));
  const maxOwner = Math.max(1, ...v.owners.map((o) => o.openValue));
  const kindName = (k: string) => CRM_OPPORTUNITY_KIND_LABELS[k as CrmOpportunityKind] ?? k;
  const closed = v.lost.byKind.reduce((n, k) => n + k.won + k.lost, 0);
  const att = v.attention;
  const hasFlow = v.flow.some((f) => f.reached > 0);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 14 }}>
        <div style={card}>
          <h3 style={h2}>Needs attention</h3>
          <p style={muted}>Open opportunities with no stage movement for {att.staleDays} days or more, or past their expected date.</p>
          <SourceNote keys={["attention"]} />
          <p style={{ margin: 0, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 }}>
            {onAttention ? <button type="button" onClick={() => onAttention("stale")} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--u-link)" }}>{att.staleCount} with no movement</button> : <span>{att.staleCount} with no movement</span>}
            {onAttention ? <button type="button" onClick={() => onAttention("overdue")} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--u-link)" }}>{att.overdueCount} past their date</button> : <span>{att.overdueCount} past their date</span>}
          </p>
          {att.items.length === 0 ? <p style={muted}>Nothing needs a look just now.</p> : (
            <ul style={list}>
              {att.items.map((i) => (
                <li key={i.id} style={{ fontSize: 13.5 }}>
                  <Link href={`/relationships?id=${i.relationshipId}&tab=financials`} style={{ fontWeight: 600 }}>{i.title}</Link>
                  <span style={{ color: "var(--u-ink-secondary)" }}> · {i.relationshipName} · {CRM_OPPORTUNITY_STAGE_LABELS[i.stage]} · {i.reason === "OVERDUE" ? `past its date${i.expectedDate ? ` (${new Date(i.expectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})` : ""}` : `${i.daysInStage} days in this stage`}{i.value !== null && i.currency ? ` · ${new Intl.NumberFormat("en-GB", { style: "currency", currency: i.currency, notation: "compact", maximumFractionDigits: 1 }).format(i.value)}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={card}>
          <h3 style={h2}>Why we win and lose</h3>
          <SourceNote keys={["lost"]} />
          {closed === 0 && v.lost.withdrawn.count === 0 ? <p style={muted}>Nothing has been won or lost yet. This fills in as opportunities close.</p> : (
            <>
              {v.lost.reasons.length > 0 && (
                <>
                  <p style={muted}>Reasons given for lost opportunities.</p>
                  <ul style={list}>
                    {v.lost.reasons.map((r) => (
                      <li key={r.reason} style={{ display: "grid", gap: 3 }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}><span>{r.reason}</span><span style={{ color: "var(--u-ink-secondary)" }}>{r.count} · {money(r.value)}</span></span>
                        <span aria-hidden="true" style={track}><span style={{ display: "block", height: "100%", width: `${Math.max(4, (r.count / maxReason) * 100)}%`, backgroundColor: "var(--u-ink-secondary)" }} /></span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {v.lost.byKind.length > 0 && (
                <>
                  <p style={{ ...muted, marginTop: 4 }}>Won and lost by kind of work.</p>
                  <ul style={list}>
                    {v.lost.byKind.map((k) => (
                      <li key={k.key} style={{ display: "grid", gap: 3 }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}><span>{kindName(k.key)}</span><span style={{ color: "var(--u-ink-secondary)" }}>{k.won} won · {k.lost} lost{k.won + k.lost ? ` · ${Math.round((k.won / (k.won + k.lost)) * 100)}%` : ""}</span></span>
                        <span aria-hidden="true" style={{ ...track, display: "flex" }}><span style={{ width: `${(k.won / Math.max(1, k.won + k.lost)) * 100}%`, backgroundColor: "var(--u-module-product-database)" }} /></span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {v.lost.withdrawn.count > 0 && <p style={{ ...muted, fontSize: 12.5 }}>{v.lost.withdrawn.count} withdrawn ({money(v.lost.withdrawn.value)}) are kept apart: they say nothing about winning.</p>}
            </>
          )}
        </div>

        {!relationshipId && v.owners.length > 0 && (
          <div style={card}>
            <h3 style={h2}>By owner</h3>
            <p style={muted}>Open pipeline per person. Where an opportunity has no owner but is linked to a project, the project lead is used.</p>
            <SourceNote keys={["owners"]} />
            <ul style={list}>
              {v.owners.map((o) => (
                <li key={o.userId ?? "none"} style={{ display: "grid", gap: 3 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13.5 }}><span style={{ fontWeight: 600 }}>{o.name}</span><span style={{ color: "var(--u-ink-secondary)" }}>{money(o.openValue)} open ({o.openCount}) · likely {money(o.weightedValue)}{o.winRate !== null ? ` · ${o.winRate}% win rate` : ""}</span></span>
                  <span aria-hidden="true" style={track}><span style={{ display: "block", height: "100%", width: `${Math.max(o.openValue > 0 ? 3 : 0, (o.openValue / maxOwner) * 100)}%`, backgroundColor: "var(--u-module-crm)" }} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={card}>
          <h3 style={h2}>Currency exposure</h3>
          <p style={muted}>Open pipeline by the currency it was entered in. The bar shows each currency's share once converted to {v.currency}.</p>
          <SourceNote keys={["exposure"]} />
          {v.exposure.length === 0 ? <p style={muted}>No open opportunities have a value.</p> : (
            <>
              <span aria-hidden="true" style={{ ...track, display: "flex", height: 14 }}>{v.exposure.map((x, i) => <span key={x.currency} style={{ width: `${x.share}%`, backgroundColor: SEGMENT[i % SEGMENT.length], borderRight: "1px solid var(--u-surface-raised)" }} />)}</span>
              <ul style={list}>
                {v.exposure.map((x, i) => (
                  <li key={x.currency} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
                    <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SEGMENT[i % SEGMENT.length], flex: "0 0 auto" }} />
                    <span style={{ fontWeight: 600 }}>{x.currency}</span>
                    <span style={{ color: "var(--u-ink-secondary)" }}>{x.share}% · {new Intl.NumberFormat("en-GB", { style: "currency", currency: x.currency, notation: "compact", maximumFractionDigits: 1 }).format(x.original)} entered ({x.count}) · {money(x.converted)} converted</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div style={card}>
          <h3 style={h2}>How deals move</h3>
          <SourceNote keys={["flow"]} />
          {!hasFlow ? <p style={muted}>Stage history builds up as opportunities move.</p> : (
            <>
              <p style={muted}>Of the opportunities that reached each stage, how many went on, and how long they stayed.</p>
              <ul style={list}>
                {v.flow.filter((f) => f.reached > 0).map((f) => (
                  <li key={f.stage} style={{ display: "grid", gap: 3 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13.5 }}><span style={{ fontWeight: 600 }}>{CRM_OPPORTUNITY_STAGE_LABELS[f.stage]}</span><span style={{ color: "var(--u-ink-secondary)" }}>{f.reached} reached · {Math.round((f.advanced / f.reached) * 100)}% went on{f.avgDays !== null ? ` · ${f.avgDays} days on average` : ""}</span></span>
                    <span aria-hidden="true" style={track}><span style={{ display: "block", height: "100%", width: `${(f.advanced / f.reached) * 100}%`, backgroundColor: "var(--u-brand-violet)" }} /></span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p style={{ ...muted, fontSize: 12.5 }}>
            {v.accuracy.revisions === 0 ? "No expected values or dates have been revised yet." : `${v.accuracy.revisions} revisions to expected values or dates${v.accuracy.dateSlips ? `; ${v.accuracy.dateSlips} dates moved later by ${v.accuracy.avgSlipDays} days on average` : ""}${v.accuracy.valueRevisedPct !== null ? `; values changed by ${v.accuracy.valueRevisedPct}% on average` : ""}.`}
          </p>
        </div>

        <div style={card}>
          <h3 style={h2}>How the chance of winning is worked out</h3>
          <p style={muted}>Each open opportunity starts from a usual figure for its stage, then moves up or down using your own closed opportunities: how often work reaching that stage was won, how like-for-like work (same kind, same commodity or service group) has gone, and how this stakeholder has gone. Few past deals count for little, so a handful of results cannot swing a forecast.</p>
          <SourceNote keys={["probability"]} />
          <p style={{ margin: 0, fontSize: 13.5 }}>{v.model.closedCount === 0 ? "Nothing has closed yet, so the usual stage figures are used." : `Based on ${v.model.closedCount} won or lost opportunities (overall about ${Math.round((v.model.overallRate ?? 0) * 100)}% won). Confidence: ${v.model.confidence === "HIGH" ? "high" : v.model.confidence === "MEDIUM" ? "medium" : "low, still an early estimate"}.`}</p>
        </div>
      </div>
    </>
  );
}
