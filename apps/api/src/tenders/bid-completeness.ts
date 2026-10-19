/** What a bid must contain before it can be submitted (step 3, 2026-10-19). Pure so it can be tested without a database. */
export interface BidCheckInput {
  allowTextSubmission: boolean;
  bidValidityDays: number | null;
  bidCurrency: string | null;
  validityConfirmed: boolean;
  lines: { noBid: boolean; unitPrice: number | null; leadTimeDays: number | null; countryOfOrigin: string | null }[];
  criteria: { title: string; isMandatory: boolean; responseFormat: string; text: string | null; fileCount: number }[];
  addenda: { requiresAcknowledgement: boolean; acknowledged: boolean }[];
}
export interface ChecklistItem { ok: boolean; label: string }

export function checkBid(i: BidCheckInput): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  out.push({ ok: !!i.bidCurrency, label: "Choose the currency of your prices" });

  const priced = i.lines.filter((l) => !l.noBid);
  const unpriced = priced.filter((l) => !(l.unitPrice !== null && l.unitPrice > 0)).length;
  out.push({ ok: i.lines.length > 0 && priced.length > 0 && unpriced === 0, label: unpriced > 0 ? `Price every item you are bidding for (${unpriced} still need a price), or mark it "not bidding"` : priced.length === 0 ? "Bid for at least one item" : "Every item priced" });

  const incomplete = priced.filter((l) => l.unitPrice !== null && l.unitPrice > 0 && (l.leadTimeDays === null || !l.countryOfOrigin)).length;
  out.push({ ok: incomplete === 0, label: incomplete > 0 ? `Give a lead time and country of origin for each priced item (${incomplete} missing)` : "Lead time and country of origin given" });

  const mandatory = i.criteria.filter((c) => c.isMandatory);
  const answered = (c: BidCheckInput["criteria"][number]) => {
    const hasText = !!c.text?.trim() && i.allowTextSubmission;
    if (c.responseFormat === "UPLOAD") return c.fileCount > 0;
    if (c.responseFormat === "TEXT") return !!c.text?.trim();
    return hasText || c.fileCount > 0;
  };
  const missing = mandatory.filter((c) => !answered(c));
  out.push({ ok: missing.length === 0, label: missing.length > 0 ? `Answer every required criterion (${mandatory.length - missing.length} of ${mandatory.length} done; missing: ${missing.map((m) => m.title).slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""})` : mandatory.length ? `All ${mandatory.length} required criteria answered` : "No required criteria" });

  const needAck = i.addenda.filter((a) => a.requiresAcknowledgement);
  const unacked = needAck.filter((a) => !a.acknowledged).length;
  if (needAck.length > 0) out.push({ ok: unacked === 0, label: unacked > 0 ? `Acknowledge ${unacked} addend${unacked === 1 ? "um" : "a"} issued by the tender owner` : "All addenda acknowledged" });

  out.push({ ok: i.validityConfirmed, label: i.bidValidityDays ? `Confirm your bid stays valid for ${i.bidValidityDays} days` : "Confirm your bid validity" });
  return out;
}

/** Cross rate from the USD-based daily table: how many units of `to` one unit of `from` buys. Null when either currency is not in the table. */
export function crossRate(rates: Record<string, number>, from: string, to: string): number | null {
  if (from === to) return 1;
  const f = from === "USD" ? 1 : rates[from]; const t = to === "USD" ? 1 : rates[to];
  if (!f || !t) return null;
  return t / f;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
