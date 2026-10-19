import type { TenderDetailForIssuer } from "@universe/types";
import { daysUntil } from "./ui";

export interface Tile { key: string; label: string; value: string | number; tone: "brand" | "warning" | "good" | "neutral" | "critical"; note?: string; indicator?: { color: string; label: string; fraction?: number } }

const GREEN = "var(--u-status-good)", AMBER = "var(--u-status-warning)", RED = "var(--u-status-critical)";

/**
 * The tiles on an issuer's tender page (design rule: at most four, the most relevant for the stage, none for a draft).
 * An open tender is about time left and response; a closed one about the evaluation and award clock; cancelled just says why.
 */
export function tenderTiles(d: TenderDetailForIssuer, effectiveStatus: string, now = new Date()): Tile[] {
  const t = d.tender;
  const interested = d.participants.length;
  const invited = d.invitations.length;
  const left = daysUntil(t.closingAt, now);
  const clar = daysUntil(t.clarificationDeadline, now);
  const evalDays = daysUntil(t.evaluationDueAt, now);
  const awardDays = daysUntil(t.awardDueAt, now);
  const urgency = (days: number | null) => days === null ? undefined : days < 0 ? { color: RED, label: "Overdue", fraction: 1 } : days <= 3 ? { color: RED, label: "Due very soon", fraction: 0.9 } : days <= 7 ? { color: AMBER, label: "Due soon", fraction: 0.6 } : { color: GREEN, label: "On track", fraction: 0.25 };
  const tiles: Tile[] = [];
  if (effectiveStatus === "PUBLISHED") {
    tiles.push({ key: "closes", label: "Time left to bid", value: left === null ? "No date" : left <= 0 ? "Closing today" : `${left} day${left === 1 ? "" : "s"}`, tone: left !== null && left <= 3 ? "critical" : left !== null && left <= 7 ? "warning" : "brand", indicator: urgency(left) });
    tiles.push({ key: "interest", label: "Organisations interested", value: interested, tone: interested === 0 ? "warning" : "good", note: interested === 0 ? "None yet" : undefined });
    tiles.push({ key: "invited", label: "Invited", value: invited, tone: "neutral" });
    if (clar !== null && clar >= 0) tiles.push({ key: "clar", label: "Questions close in", value: `${clar} day${clar === 1 ? "" : "s"}`, tone: clar <= 2 ? "warning" : "neutral" });
    else tiles.push({ key: "lines", label: "Line items", value: d.lines.length, tone: "neutral" });
  } else if (effectiveStatus === "CLOSED" || effectiveStatus === "EVALUATING") {
    tiles.push({ key: "interest", label: "Organisations interested", value: interested, tone: "brand" });
    tiles.push({ key: "eval", label: "Evaluation due", value: evalDays === null ? "No date" : evalDays < 0 ? `${-evalDays} days late` : `${evalDays} day${evalDays === 1 ? "" : "s"}`, tone: evalDays !== null && evalDays < 0 ? "critical" : "brand", indicator: urgency(evalDays) });
    tiles.push({ key: "award", label: "Award due", value: awardDays === null ? "No date" : awardDays < 0 ? `${-awardDays} days late` : `${awardDays} day${awardDays === 1 ? "" : "s"}`, tone: awardDays !== null && awardDays < 0 ? "critical" : "neutral", indicator: urgency(awardDays) });
    tiles.push({ key: "criteria", label: "Scored criteria", value: d.criteria.filter((c) => c.kind === "SCORED").length, tone: "neutral" });
  } else if (effectiveStatus === "CANCELLED") {
    tiles.push({ key: "interest", label: "Organisations told", value: interested, tone: "neutral" });
  }
  return tiles.slice(0, 4);
}

/** What still blocks publication, in plain words (mirrors the server's checks so the issuer sees it before pressing Publish). */
export function readiness(d: TenderDetailForIssuer, now = new Date()): { ok: boolean; label: string }[] {
  const t = d.tender;
  const scored = d.criteria.filter((c) => c.kind === "SCORED");
  const total = scored.reduce((s, c) => s + Number(c.weight ?? 0), 0);
  const closing = t.closingAt ? new Date(t.closingAt).getTime() : 0;
  return [
    { ok: !!t.title.trim(), label: "Title" },
    { ok: !!t.currency, label: "Currency (bids are compared in it)" },
    { ok: d.lines.length > 0, label: "At least one line item" },
    { ok: closing > now.getTime() + 43_200_000, label: "Closing date at least 12 hours ahead" },
    { ok: !t.clarificationDeadline || !t.closingAt || new Date(t.clarificationDeadline) <= new Date(t.closingAt), label: "Question deadline before closing date" },
    { ok: d.criteria.length > 0, label: "At least one evaluation criterion" },
    { ok: scored.length === 0 || Math.abs(total - 100) < 0.01, label: scored.length ? `Scored weights total 100 (now ${total})` : "Scored weights total 100" },
    { ok: t.visibility !== "INVITED_ONLY" || d.invitations.length > 0, label: "Invited organisations (invited-only tenders)" },
  ];
}
