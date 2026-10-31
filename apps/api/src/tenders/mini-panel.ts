import type { MiniPanelProgress } from "@universe/types";

/** Pure rules for the mini-competition evaluation panel (2026-10-31). */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Progress on one criterion for one quote. Scores are revealed only once every eligible evaluator has scored (or the result is moderated). */
export function panelProgress(scores: { evaluator: string; score: number; reason: string }[], eligible: number, moderated: boolean): MiniPanelProgress {
  const all = eligible >= 2 && scores.length >= eligible;
  const values = scores.map((s) => s.score);
  return {
    scored: scores.length, of: eligible, moderated,
    scores: all || moderated ? scores : null,
    spread: all || moderated ? (values.length ? Math.max(...values) - Math.min(...values) : null) : null,
    average: all || moderated ? (values.length ? r2(values.reduce((a, b) => a + b, 0) / values.length) : null) : null,
  };
}

export interface ModerationInput { score?: number; reason?: string }
export interface ModerationResult { score: number; reason: string; basis: "AVERAGE" | "MODERATED" }

/**
 * The agreed score for a criterion. Scores within 1 point are averaged automatically. A wider spread (or a moderator choosing a different score) needs an
 * agreed whole-number score and a written reason of at least 20 characters. Throws a plain-language message when the input is not enough.
 */
export function moderate(scores: number[], input: ModerationInput): ModerationResult {
  if (scores.length < 2) throw new Error("At least two independent scores are needed before moderating.");
  const spread = Math.max(...scores) - Math.min(...scores);
  const average = r2(scores.reduce((a, b) => a + b, 0) / scores.length);
  const chosen = input.score;
  const reason = (input.reason ?? "").trim();
  if (chosen === undefined || chosen === null) {
    if (spread > 1) throw new Error("The scores differ by more than 1 point. Agree a score with the evaluators and record why.");
    return { score: average, reason: reason || `Average of ${scores.length} independent scores (${scores.join(", ")}).`, basis: "AVERAGE" };
  }
  if (!Number.isInteger(chosen) || chosen < 0 || chosen > 5) throw new Error("An agreed score is a whole number from 0 to 5.");
  if (reason.length < 20) throw new Error("Record why this score was agreed (at least a sentence).");
  return { score: chosen, reason, basis: "MODERATED" };
}
