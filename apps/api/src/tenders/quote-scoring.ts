import { QUOTE_WEIGHT_KEYS, type QuoteManualKey, type QuoteRanking, type QuoteResponses, type QuoteScheme, type QuoteScores } from "@universe/types";
import { calculatedScores } from "./evaluation";

/** Pure scoring for framework mini-competitions (2026-10-26). The issuer fixes the scheme before the competition opens; nothing here changes it afterwards. */

export const MANUAL_KEYS: QuoteManualKey[] = ["quality", "examples", "references"];
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Problems with a scheme the issuer is about to set; empty when it is usable. */
export function schemeProblems(s: QuoteScheme): string[] {
  const out: string[] = [];
  const w = QUOTE_WEIGHT_KEYS.map((k) => s.weights[k]);
  if (w.some((x) => !Number.isFinite(x) || x < 0 || x > 100)) out.push("Each weight must be between 0 and 100.");
  if (Math.abs(w.reduce((a, b) => a + b, 0) - 100) > 0.01) out.push("The weights must total 100.");
  const keys = s.requirements.map((r) => r.key);
  if (new Set(keys).size !== keys.length) out.push("Each requirement needs its own key.");
  if (s.requirements.some((r) => !r.title.trim())) out.push("Every requirement needs a title.");
  if (s.weights.desirable > 0 && !s.requirements.some((r) => !r.mandatory)) out.push("A weight for desirable requirements needs at least one desirable requirement.");
  if (s.weights.examples > 0 && s.minExamples < 1) out.push("A weight for similar contracts needs at least one example to be required.");
  if (s.weights.references > 0 && s.minReferences < 1) out.push("A weight for references needs at least one reference to be required.");
  if (s.minExamples > 0 && (s.exampleYears < 1 || s.exampleYears > 10)) out.push("Examples must fall within 1 to 10 years.");
  return out;
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Pass/fail checks on what a supplier answered: mandatory requirements, and the number and completeness of examples and references. */
export function gateProblems(scheme: QuoteScheme, r: QuoteResponses | null, now: Date): string[] {
  const out: string[] = [];
  const resp = r ?? { requirements: {}, examples: [], references: [] };
  for (const q of scheme.requirements.filter((x) => x.mandatory)) if (!resp.requirements[q.key]?.met) out.push(`Mandatory requirement not met: ${q.title}`);
  if (scheme.minExamples > 0) {
    const from = new Date(now.getTime()); from.setUTCFullYear(from.getUTCFullYear() - scheme.exampleYears);
    const valid = resp.examples.filter((e) => e.title.trim() && e.client.trim() && e.scope.trim() && !isNaN(Date.parse(e.completedOn)) && !isNaN(Date.parse(e.startedOn)) && Date.parse(e.startedOn) <= Date.parse(e.completedOn) && Date.parse(e.completedOn) <= now.getTime() && Date.parse(e.completedOn) >= from.getTime());
    if (valid.length < scheme.minExamples) out.push(`Needs ${scheme.minExamples} similar contract${scheme.minExamples === 1 ? "" : "s"} completed in the last ${scheme.exampleYears} years; ${valid.length} given`);
  }
  if (scheme.minReferences > 0) {
    const valid = resp.references.filter((x) => x.forename.trim() && x.surname.trim() && x.organisation.trim() && emailOk(x.email) && x.phone.trim() && x.relationship.trim() && x.contactable);
    if (valid.length < scheme.minReferences) out.push(`Needs ${scheme.minReferences} complete reference${scheme.minReferences === 1 ? "" : "s"} the buyer may contact; ${valid.length} given`);
  }
  return out;
}

/** Share of desirable requirements met, 0 to 100; null when there are none. */
export function desirableScore(scheme: QuoteScheme, r: QuoteResponses | null): number | null {
  const des = scheme.requirements.filter((x) => !x.mandatory);
  if (!des.length) return null;
  return r2((100 * des.filter((x) => r?.requirements[x.key]?.met).length) / des.length);
}

export interface QuoteInput { id: string; total: number | null; avgLeadDays: number | null; responses: QuoteResponses | null; scores: QuoteScores | null }

/**
 * Ranks submitted quotes. A quote that fails a pass/fail check is shown with the reasons and is not ranked or used as the benchmark for price and lead time
 * (the best eligible quote scores 100, the others in proportion). Manual scores are 0 to 5 and count as 0 to 100. The total is null until every
 * weighted manual criterion has a score and a reason. A tie goes to the lower price.
 */
export function rankQuotes(scheme: QuoteScheme, quotes: QuoteInput[], now: Date): Map<string, QuoteRanking> {
  const gate = new Map(quotes.map((q) => [q.id, gateProblems(scheme, q.responses, now)]));
  const eligible = quotes.filter((q) => gate.get(q.id)!.length === 0);
  const calc = calculatedScores(eligible.map((q) => ({ bidId: q.id, totalTenderCurrency: q.total, avgLeadDays: q.avgLeadDays })));
  const out = new Map<string, QuoteRanking>();
  const w = scheme.weights;
  for (const q of quotes) {
    const problems = gate.get(q.id)!;
    const ok = problems.length === 0;
    const c = calc.get(q.id);
    const des = desirableScore(scheme, q.responses);
    const manualMissing = ok ? MANUAL_KEYS.filter((k) => w[k] > 0 && !(q.scores?.[k] && q.scores[k]!.reason.trim())) : [];
    let total: number | null = null;
    if (ok && manualMissing.length === 0 && (w.price === 0 || c?.price != null) && (w.leadTime === 0 || c?.leadTime != null)) {
      total = r2(
        (w.price / 100) * (c?.price ?? 0) + (w.leadTime / 100) * (c?.leadTime ?? 0) + (w.desirable / 100) * (des ?? 0)
        + MANUAL_KEYS.reduce((a, k) => a + (w[k] / 100) * (w[k] > 0 ? q.scores![k]!.score * 20 : 0), 0),
      );
    }
    out.set(q.id, { eligible: ok, problems, price: c?.price ?? null, leadTime: c?.leadTime ?? null, desirable: des, manualMissing, total, rank: null });
  }
  const ranked = quotes.filter((q) => out.get(q.id)!.total !== null).sort((a, b) => (out.get(b.id)!.total! - out.get(a.id)!.total!) || ((a.total ?? Infinity) - (b.total ?? Infinity)));
  ranked.forEach((q, i) => { out.get(q.id)!.rank = i + 1; });
  return out;
}

/** Why a quote cannot be awarded yet under the scheme; null when it can. */
export function awardBlock(scheme: QuoteScheme | null, ranking: QuoteRanking | undefined): string | null {
  if (!scheme) return null;
  if (!ranking) return "This quote has not been assessed.";
  if (!ranking.eligible) return "This quote does not meet the pass/fail requirements.";
  if (ranking.manualMissing.length) return "Score every weighted criterion, with a reason, before awarding.";
  return null;
}

// ---------------------------------------------------------------- cleaning untrusted input

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown) => v === true;
const intIn = (v: unknown, lo: number, hi: number, d: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

/** Builds a scheme from request input, dropping anything unexpected. Requirement keys are assigned by position, so suppliers cannot collide with each other. */
export function cleanScheme(raw: unknown): QuoteScheme {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const w = (o.weights && typeof o.weights === "object" ? o.weights : {}) as Record<string, unknown>;
  const weights = Object.fromEntries(QUOTE_WEIGHT_KEYS.map((k) => [k, Math.round(Number(w[k] ?? 0) * 100) / 100])) as QuoteScheme["weights"];
  const reqs = (Array.isArray(o.requirements) ? o.requirements : []).slice(0, 30).map((r, i) => { const x = (r ?? {}) as Record<string, unknown>; return { key: `r${i + 1}`, title: str(x.title, 300), mandatory: bool(x.mandatory) }; });
  return { weights, requirements: reqs, minExamples: intIn(o.minExamples, 0, 5, 0), exampleYears: intIn(o.exampleYears, 1, 10, 3), minReferences: intIn(o.minReferences, 0, 5, 0), qualityBrief: str(o.qualityBrief, 1500) || null };
}

/** Builds a supplier's answers from request input. Every requirement in the scheme gets an answer (unanswered counts as not met). */
export function cleanResponses(raw: unknown, scheme: QuoteScheme): QuoteResponses {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rq = (o.requirements && typeof o.requirements === "object" ? o.requirements : {}) as Record<string, { met?: unknown; note?: unknown }>;
  const requirements = Object.fromEntries(scheme.requirements.map((r) => [r.key, { met: bool(rq[r.key]?.met), note: str(rq[r.key]?.note, 500) || null }]));
  const examples = (Array.isArray(o.examples) ? o.examples : []).slice(0, 5).map((e) => { const x = (e ?? {}) as Record<string, unknown>; return { title: str(x.title, 200), client: str(x.client, 200), valueText: str(x.valueText, 100) || null, startedOn: str(x.startedOn, 10), completedOn: str(x.completedOn, 10), scope: str(x.scope, 1500) }; });
  const references = (Array.isArray(o.references) ? o.references : []).slice(0, 5).map((e) => { const x = (e ?? {}) as Record<string, unknown>; return { forename: str(x.forename, 100), surname: str(x.surname, 100), organisation: str(x.organisation, 200), role: str(x.role, 100) || null, email: str(x.email, 200), phone: str(x.phone, 40), relationship: str(x.relationship, 300), contactable: bool(x.contactable) }; });
  return { requirements, examples, references };
}
