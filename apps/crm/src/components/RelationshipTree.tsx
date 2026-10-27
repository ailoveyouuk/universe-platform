"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { categoryLabel, CRM_OPPORTUNITY_STAGE_LABELS, CRM_PARTICIPANT_ROLE_LABELS, type CrmOpportunityStage, type CrmParticipantRole, type CrmRelationshipTree, type CrmTreeNode } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { accentVar, primaryCategory } from "../lib/category";
import { fmtDate, humanise } from "../lib/ui";
import { SourceNote } from "./SourceNote";

type Branch = "project" | "opportunity" | "suggested";
interface Picked { branch: Branch; index: number }
const ROW = 54, NODE_W = 236, NODE_H = 42, W = 980, SHOW = 10;
const colour = (kinds: string[]) => { const k = primaryCategory(kinds); return k ? accentVar(k) : "var(--u-module-crm)"; };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "12px 14px", backgroundColor: "var(--u-surface-raised)" };
const muted: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };

/**
 * How a stakeholder came to be and who it is connected to (CRM stage C): its life as a timeline, the stakeholders it has worked with through projects (left), through
 * opportunities (right) and those it may also connect to (dashed, with reasons). Click a node for the detail, then centre the tree on it to follow the chain.
 * Own records only; nothing here carries money. A table view lists the same connections for keyboards and screen readers.
 */
export function RelationshipTree({ relId }: { relId: string }) {
  const [trail, setTrail] = useState<string[]>([relId]);
  const cur = trail[trail.length - 1];
  const [t, setT] = useState<CrmRelationshipTree | null>(null);
  const [err, setErr] = useState(false);
  const [pick, setPick] = useState<Picked | null>(null);
  const [table, setTable] = useState(false);
  const [more, setMore] = useState<Record<Branch, boolean>>({ project: false, opportunity: false, suggested: false });
  useEffect(() => { setTrail([relId]); }, [relId]);
  // On a phone the picture would need sideways scrolling, so the table is the starting view there (the picture is one tap away).
  useEffect(() => { if (window.innerWidth < 640) setTable(true); }, []);
  useEffect(() => { let live = true; setT(null); setErr(false); setPick(null); apiClient.crmRelationshipTree(cur).then((d) => { if (live) setT(d); }).catch(() => { if (live) setErr(true); }); return () => { live = false; }; }, [cur]);
  if (err) return <p role="status" style={muted}>The relationship tree is not available just now.</p>;
  if (!t) return <p role="status" style={muted}>Loading the relationship tree…</p>;

  const lists: Record<Branch, { node: CrmTreeNode; weight: number; sub: string }[]> = {
    project: t.projectConnections.map((c) => ({ node: c, weight: c.sharedProjects, sub: `${c.sharedProjects} project${c.sharedProjects === 1 ? "" : "s"} · ${c.roles.map(humanise).join(", ")}` })),
    opportunity: t.opportunityConnections.map((c) => ({ node: c, weight: c.via.length, sub: `${c.via.length} opportunit${c.via.length === 1 ? "y" : "ies"}` })),
    suggested: t.suggestions.map((c) => ({ node: c, weight: 1, sub: `${c.reasons.length} reason${c.reasons.length === 1 ? "" : "s"} · ${c.kinds.slice(0, 1).map(categoryLabel).join("")}` })),
  };
  const shown = (b: Branch) => (more[b] ? lists[b] : lists[b].slice(0, SHOW));
  const rightCount = shown("opportunity").length + shown("suggested").length + (shown("suggested").length ? 1 : 0);
  const rows = Math.max(shown("project").length, rightCount, 4);
  const H = rows * ROW + 40, cy = H / 2;
  const leftX = 8, rootX = (W - NODE_W) / 2, rightX = W - NODE_W - 8;
  const yOf = (i: number, n: number) => (H - n * ROW) / 2 + i * ROW + (ROW - NODE_H) / 2;
  const place: { branch: Branch; index: number; x: number; y: number }[] = [
    ...shown("project").map((_, i) => ({ branch: "project" as const, index: i, x: leftX, y: yOf(i, shown("project").length) })),
    ...shown("opportunity").map((_, i) => ({ branch: "opportunity" as const, index: i, x: rightX, y: yOf(i, rightCount) })),
    ...shown("suggested").map((_, i) => ({ branch: "suggested" as const, index: i, x: rightX, y: yOf(i + shown("opportunity").length + 1, rightCount) })),
  ];
  const sel = pick ? lists[pick.branch][pick.index] : null;
  const selNode = sel?.node ?? null;
  const selProject = pick?.branch === "project" ? t.projectConnections[pick.index] : null;
  const selOpp = pick?.branch === "opportunity" ? t.opportunityConnections[pick.index] : null;
  const selSug = pick?.branch === "suggested" ? t.suggestions[pick.index] : null;
  const total = lists.project.length + lists.opportunity.length + lists.suggested.length;
  const pickNode = (branch: Branch, index: number) => setPick({ branch, index });

  return (
    <section aria-labelledby="rt-h" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <h2 id="rt-h" style={{ margin: 0, fontSize: 18, fontFamily: "var(--u-font-display)" }}>Connections of {t.root.name}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {trail.length > 1 && <Button size="sm" variant="secondary" onClick={() => setTrail(trail.slice(0, -1))}>Back to {trail.length > 2 ? "previous" : "the first stakeholder"}</Button>}
          <Button size="sm" variant="secondary" aria-pressed={table} onClick={() => setTable(!table)}>{table ? "Show the picture" : "Show as a table"}</Button>
        </div>
      </div>
      <SourceNote keys={["tree"]} />

      <ol aria-label="How this record came to be" style={{ ...card, listStyle: "none", margin: 0, display: "flex", gap: 0, overflowX: "auto", padding: "14px 16px" }}>
        {t.provenance.map((p, i) => (
          <li key={i} style={{ flex: "1 0 170px", position: "relative", paddingTop: 18, paddingRight: 10 }}>
            <span aria-hidden="true" style={{ position: "absolute", top: 4, left: 0, right: 0, height: 2, backgroundColor: "var(--u-border)" }} />
            <span aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--u-module-crm)" }} />
            <div style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{fmtDate(p.date)}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.label}</div>
            {p.detail && <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{p.detail}</div>}
          </li>
        ))}
      </ol>

      {!t.projectsVisible && <p style={muted}>Project connections are hidden because your account cannot view projects. Opportunity connections and suggestions based on kind and country are still shown.</p>}
      {total === 0 && <p style={muted}>No connections are recorded yet. They appear as this stakeholder is added to projects and opportunities.</p>}

      {total > 0 && !table && (
        <div style={{ ...card, overflowX: "auto", padding: 8 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 760, display: "block" }} role="group" aria-label={`Relationship tree for ${t.root.name}: ${lists.project.length} through projects, ${lists.opportunity.length} through opportunities, ${lists.suggested.length} suggested`}>
            <text x={leftX} y={14} fill="var(--u-ink-secondary)" style={{ fontSize: 12, fontWeight: 600 }}>Worked together on projects</text>
            <text x={rightX + NODE_W} textAnchor="end" y={14} fill="var(--u-ink-secondary)" style={{ fontSize: 12, fontWeight: 600 }}>Through opportunities{shown("suggested").length ? " and suggested" : ""}</text>
            {place.map((p) => {
              const item = lists[p.branch][p.index]; const left = p.branch === "project";
              const x1 = left ? p.x + NODE_W : p.x, x2 = left ? rootX : rootX + NODE_W, y1 = p.y + NODE_H / 2, mid = (x1 + x2) / 2;
              const w = Math.min(5, 1.5 + item.weight * 0.6);
              return <path key={`${p.branch}${p.index}`} d={`M${x1},${y1} C${mid},${y1} ${mid},${cy} ${x2},${cy}`} fill="none" stroke={colour(item.node.kinds)} strokeWidth={w} strokeDasharray={p.branch === "suggested" ? "6 5" : undefined} opacity={pick && !(pick.branch === p.branch && pick.index === p.index) ? 0.3 : 0.85} />;
            })}
            <g transform={`translate(${rootX},${cy - 30})`}>
              <rect width={NODE_W} height={60} rx={12} fill="var(--u-brand-violet)" />
              <text x={NODE_W / 2} y={26} textAnchor="middle" fill="var(--u-brand-violet-on)" style={{ fontSize: 14.5, fontWeight: 700, fontFamily: "var(--u-font-display)" }}>{clip(t.root.name, 26)}</text>
              <text x={NODE_W / 2} y={45} textAnchor="middle" fill="var(--u-on-violet-secondary)" style={{ fontSize: 12 }}>{t.root.kinds.slice(0, 2).map(categoryLabel).join(" · ") || "Stakeholder"}{t.root.countryCode ? ` · ${t.root.countryCode}` : ""}</text>
            </g>
            {shown("suggested").length > 0 && <text x={rightX + NODE_W} textAnchor="end" y={yOf(shown("opportunity").length, rightCount) + 28} fill="var(--u-ink-secondary)" style={{ fontSize: 12, fontWeight: 600 }}>Might also connect (from your own records)</text>}
            {place.map((p) => {
              const item = lists[p.branch][p.index]; const on = pick?.branch === p.branch && pick.index === p.index;
              const col = colour(item.node.kinds);
              return (
                <g key={`n${p.branch}${p.index}`} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${item.node.name}, ${item.sub}. Show detail`} style={{ cursor: "pointer", outline: "none" }}
                  onClick={() => pickNode(p.branch, p.index)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickNode(p.branch, p.index); } }}>
                  <rect width={NODE_W} height={NODE_H} rx={9} fill="var(--u-surface-raised)" stroke={on ? "var(--u-brand-violet)" : "var(--u-border)"} strokeWidth={on ? 2.5 : 1} strokeDasharray={p.branch === "suggested" ? "5 4" : undefined} />
                  <rect width={6} height={NODE_H} rx={3} fill={col} />
                  <text x={16} y={18} fill="var(--u-ink)" style={{ fontSize: 13, fontWeight: 600 }}>{clip(item.node.name, 28)}</text>
                  <text x={16} y={34} fill="var(--u-ink-secondary)" style={{ fontSize: 11.5 }}>{clip(item.sub, 36)}</text>
                  <title>{`${item.node.name} — ${item.sub}`}</title>
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 8px" }}>
            {(["project", "opportunity", "suggested"] as const).filter((b) => lists[b].length > SHOW).map((b) => (
              <Button key={b} size="sm" variant="secondary" onClick={() => setMore({ ...more, [b]: !more[b] })}>{more[b] ? "Show fewer" : `Show all ${lists[b].length}`} {b === "project" ? "project connections" : b === "opportunity" ? "opportunity connections" : "suggestions"}</Button>
            ))}
          </div>
        </div>
      )}

      {total > 0 && table && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <caption style={{ textAlign: "left", fontSize: 12.5, color: "var(--u-ink-secondary)", padding: "0 0 6px" }}>Everything connected to {t.root.name}</caption>
            <thead><tr>{["Stakeholder", "Kind", "How connected", "Detail"].map((h) => <th key={h} scope="col" style={{ textAlign: "left", padding: "6px 10px", fontSize: 12.5, color: "var(--u-ink-secondary)", borderBottom: "1px solid var(--u-border)" }}>{h}</th>)}</tr></thead>
            <tbody>
              {(["project", "opportunity", "suggested"] as const).flatMap((b) => lists[b].map((it, i) => (
                <tr key={`${b}${i}`}>
                  <th scope="row" style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--u-border)" }}>{it.node.relationshipId ? <button type="button" onClick={() => { setTrail([...trail, it.node.relationshipId!]); }} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 600, color: "var(--u-link)", textDecoration: "underline", cursor: "pointer" }}>{it.node.name}</button> : it.node.name}</th>
                  <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--u-border)" }}>{it.node.kinds.map(categoryLabel).join(", ") || "—"}</td>
                  <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--u-border)" }}>{b === "project" ? "Projects" : b === "opportunity" ? "Opportunities" : "Suggested"}</td>
                  <td style={{ padding: "6px 10px", borderBottom: "1px solid var(--u-border)" }}>{it.sub}{b === "suggested" ? ` — ${t.suggestions[i].reasons.join("; ")}` : ""}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {selNode && (
        <section aria-label={`Detail for ${selNode.name}`} style={{ ...card, display: "grid", gap: 8, borderLeft: `5px solid ${colour(selNode.kinds)}` }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{selNode.name}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selNode.relationshipId && <Button size="sm" variant="primary" onClick={() => setTrail([...trail, selNode.relationshipId!])}>Centre the tree on this stakeholder</Button>}
              {selNode.relationshipId && <Link href={`/relationships?id=${selNode.relationshipId}`} style={{ alignSelf: "center", fontSize: 13 }}>Open the stakeholder</Link>}
            </div>
          </div>
          <p style={muted}>{selNode.kinds.map(categoryLabel).join(", ") || "Stakeholder"}{selNode.countryCode ? ` · ${selNode.countryCode}` : ""}{!selNode.relationshipId ? " · not in your CRM yet" : ""}</p>
          {selProject && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Projects together ({selProject.sharedProjects})</div>
              <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 13 }}>
                {selProject.via.map((v) => <li key={v.reference}><strong>{v.reference}</strong> · {v.title} · {humanise(v.status)} · as {v.role.toLowerCase()} · {fmtDate(v.date)}</li>)}
                {selProject.sharedProjects > selProject.via.length && <li style={{ color: "var(--u-ink-secondary)" }}>and {selProject.sharedProjects - selProject.via.length} more</li>}
              </ul>
            </div>
          )}
          {selOpp && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 13 }}>
              {selOpp.via.map((v) => <li key={`${v.id}${v.role}`}><strong>{v.title}</strong> · {CRM_OPPORTUNITY_STAGE_LABELS[v.stage as CrmOpportunityStage] ?? humanise(v.stage)} · {v.role === "OWNER_OF_OPPORTUNITY" ? "this stakeholder took part in their opportunity" : `took part as ${(CRM_PARTICIPANT_ROLE_LABELS[v.role as CrmParticipantRole] ?? humanise(v.role)).toLowerCase()}`}</li>)}
            </ul>
          )}
          {selSug && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Why this is suggested</div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>{selSug.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
        </section>
      )}
      <p style={{ ...muted, fontSize: 12 }}>Suggestions come from your own stakeholders and projects only. Matching against the wider Universe network is not shown here yet, and would only ever be anonymised counts.</p>
    </section>
  );
}
