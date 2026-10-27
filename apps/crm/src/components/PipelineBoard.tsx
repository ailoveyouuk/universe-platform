"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CRM_OPEN_STAGES, CRM_OPPORTUNITY_STAGE_LABELS, CRM_OPPORTUNITY_STAGES, commodityGroupLabel, type CrmOpportunity, type CrmOpportunityStage } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, inputStyle } from "../lib/ui";
import { money } from "./Opportunities";

const MAX = 100;

/**
 * The pipeline as a board (2026-10-27): one column per open stage. Move a card by dragging it to another column, or with the "Move to" menu on the card, which also works by keyboard
 * and on a touch screen. Moving to Lost asks why first. Shows the first 100 matching open opportunities.
 */
export function PipelineBoard({ kind, owner, group, attention, canManage, onChanged, onError }: { kind: string; owner: string; group: string; attention: string; canManage: boolean; onChanged: () => void; onError: (m: string | null) => void }) {
  const [items, setItems] = useState<CrmOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [lost, setLost] = useState<CrmOpportunity | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const load = useCallback(() => { apiClient.crmOpportunities({ open: "true", kind, owner, group, attention, pageSize: MAX }).then((d) => { setItems(d.items); setTotal(d.total); }).catch((e) => onError(e instanceof Error ? e.message : "Could not load the board.")); }, [kind, owner, group, attention, onError]);
  useEffect(() => { load(); }, [load]);
  const move = async (o: CrmOpportunity, to: CrmOpportunityStage, lostReason?: string) => {
    if (to === o.stage) return;
    if (to === "LOST" && !lostReason) { setLost(o); setReason(""); return; }
    setBusy(true); onError(null);
    try { await apiClient.updateCrmOpportunity(o.id, { stage: to, ...(lostReason ? { lostReason } : {}) }); setLost(null); setNote(`Moved "${o.title}" to ${CRM_OPPORTUNITY_STAGE_LABELS[to]}.`); load(); onChanged(); } catch (e) { onError(e instanceof Error ? e.message : "Could not move it."); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>{note || (canManage ? "Drag a card to another column, or use Move to on the card." : "You can view the board; moving cards needs permission to manage the CRM.")}{total > MAX ? ` Showing the first ${MAX} of ${total}; narrow the filters to see the rest.` : ""}</p>
      {lost && (
        <form onSubmit={(e) => { e.preventDefault(); void move(lost, "LOST", reason); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 10 }}>
          <div style={{ flex: "1 1 260px" }}><Field label={`Why was "${lost.title}" lost?`}><input style={inputStyle} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus /></Field></div>
          <Button size="sm" variant="primary" type="submit" disabled={busy || !reason.trim()}>Mark as lost</Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => setLost(null)}>Cancel</Button>
        </form>
      )}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${CRM_OPEN_STAGES.length}, minmax(230px, 1fr))`, gap: 10, minWidth: CRM_OPEN_STAGES.length * 240 }}>
          {CRM_OPEN_STAGES.map((st) => {
            const col = items.filter((o) => o.stage === st);
            return (
              <section key={st} aria-label={`${CRM_OPPORTUNITY_STAGE_LABELS[st]}, ${col.length} opportunities`}
                onDragOver={(e) => { if (canManage) { e.preventDefault(); setOver(st); } }} onDragLeave={() => setOver((x) => (x === st ? null : x))}
                onDrop={(e) => { e.preventDefault(); setOver(null); const o = items.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (o && canManage) void move(o, st); }}
                style={{ border: `1px ${over === st ? "solid" : "dashed"} ${over === st ? "var(--u-brand-violet)" : "var(--u-border)"}`, borderRadius: "var(--u-radius-md)", padding: 8, display: "grid", gap: 8, alignContent: "start", minHeight: 120, backgroundColor: "var(--u-surface)" }}>
                <h3 style={{ margin: 0, fontSize: 14, fontFamily: "var(--u-font-display)" }}>{CRM_OPPORTUNITY_STAGE_LABELS[st]} <span style={{ fontWeight: 400, color: "var(--u-ink-secondary)" }}>· {col.length}</span></h3>
                {col.map((o) => (
                  <article key={o.id} draggable={canManage} onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                    style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 10px", display: "grid", gap: 4, fontSize: 13, backgroundColor: "var(--u-surface-raised)", cursor: canManage ? "grab" : "default" }}>
                    <strong style={{ fontSize: 13.5 }}>{o.title}</strong>
                    <Link href={`/relationships?id=${o.relationshipId}&tab=financials`} style={{ fontSize: 12.5 }}>{o.relationshipName}</Link>
                    <span style={{ color: "var(--u-ink-secondary)" }}>{money(o.expectedValue, o.currency)}{o.probability !== null ? ` · ${Math.round(o.probability * 100)}% likely` : ""}</span>
                    <span style={{ color: "var(--u-ink-secondary)", fontSize: 12.5 }}>{[o.commodityGroup ? commodityGroupLabel(o.commodityGroup) : null, o.ownerName ? `Owner ${o.ownerName}` : null, o.overdue ? "Past its date" : null].filter(Boolean).join(" · ")}</span>
                    {canManage && (
                      <label style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>Move to
                        <select className="u-native-select" style={{ ...inputStyle, width: "auto" }} value={o.stage} disabled={busy} onChange={(e) => void move(o, e.target.value as CrmOpportunityStage)}>
                          {CRM_OPPORTUNITY_STAGES.map((s) => <option key={s} value={s}>{CRM_OPPORTUNITY_STAGE_LABELS[s]}</option>)}
                        </select>
                      </label>
                    )}
                  </article>
                ))}
                {col.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Nothing here.</p>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
