/**
 * Second authoriser for awards (2026-10-26). Pure rules, so they can be tested without a database.
 *
 * Once an organisation has confirmed its approval limits, an award worth more than the proposer's own limit is not refused: it is held as a
 * proposal until a different person, whose own limit covers the value, approves it. Awards within the proposer's own limit are made at once.
 */
export type AwardRoute = "AWARD_NOW" | "NEEDS_SECOND_AUTHORISER";

/** `withinOwnLimit` is false when the limit cannot be read (no exchange rate), which is treated as not within, never guessed. */
export function awardRoute(o: { limitsConfirmed: boolean; withinOwnLimit: boolean }): AwardRoute {
  return o.limitsConfirmed && !o.withinOwnLimit ? "NEEDS_SECOND_AUTHORISER" : "AWARD_NOW";
}

export interface ApproverCheck { ok: boolean; reason: string | null }

/** The approver must be someone other than the proposer, and (when limits are confirmed) their own limit must cover the value. */
export function checkApprover(o: { userId: string; proposerId: string | null; limitsConfirmed: boolean; withinOwnLimit: boolean }): ApproverCheck {
  if (o.proposerId && o.userId === o.proposerId) return { ok: false, reason: "The second authoriser must be someone other than the person who proposed the award." };
  if (o.limitsConfirmed && !o.withinOwnLimit) return { ok: false, reason: "The value is above your own approval limit. Ask someone with a higher limit to approve it." };
  return { ok: true, reason: null };
}

/** The person who proposed an award may withdraw it; anyone else must reject it with a reason. */
export const isProposer = (userId: string, proposerId: string | null) => !!proposerId && userId === proposerId;
