import type { ProductBatchSummary } from "@universe/types";

const DAY = 86_400_000;
const MONTH_DAYS = 30.44;

export type LifeFlag = "EXPIRED" | "SHORT_DATED" | "LOW_REMAINING" | null;
export interface BatchLife {
  batch: ProductBatchSummary;
  /** Whole days to expiry (negative once expired); null without an expiry date. */
  daysToExpiry: number | null;
  /** Share of the batch's own life still ahead (0–1); null without both dates. */
  remainingShare: number | null;
  /** The batch's total life in months (manufacture to expiry); null without both dates. */
  lifeMonths: number | null;
  flag: LifeFlag;
}

/**
 * Checks each batch against the product's standard shelf life (2026-10-19). EXPIRED: past its expiry date. SHORT_DATED: its total
 * life is more than a month shorter than the standard. LOW_REMAINING: under 25% of its life is left. Withdrawn batches are
 * not assessed. Batches without dates are listed with no flag.
 */
export function assessBatches(batches: ProductBatchSummary[], standardMonths: number | null | undefined, now = new Date()): BatchLife[] {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return batches.map((b) => {
    const exp = b.expiryDate ? new Date(b.expiryDate).getTime() : null;
    const man = b.manufacturedDate ? new Date(b.manufacturedDate).getTime() : null;
    const daysToExpiry = exp === null ? null : Math.round((exp - today) / DAY);
    const total = exp !== null && man !== null && exp > man ? exp - man : null;
    const lifeMonths = total === null ? null : total / DAY / MONTH_DAYS;
    const remainingShare = total === null || exp === null ? null : Math.max(0, Math.min(1, (exp - today) / total));
    let flag: LifeFlag = null;
    if (b.status !== "WITHDRAWN") {
      if (daysToExpiry !== null && daysToExpiry < 0) flag = "EXPIRED";
      else if (standardMonths && lifeMonths !== null && lifeMonths < standardMonths - 1) flag = "SHORT_DATED";
      else if (remainingShare !== null && remainingShare < 0.25) flag = "LOW_REMAINING";
    }
    return { batch: b, daysToExpiry, remainingShare, lifeMonths, flag };
  });
}

export const FLAG_TEXT: Record<Exclude<LifeFlag, null>, string> = {
  EXPIRED: "Expired",
  SHORT_DATED: "Shorter than standard",
  LOW_REMAINING: "Under 25% of life left",
};

/** The tile summary: next expiry among usable batches, and how many batches need attention. */
export function summariseBatches(life: BatchLife[]) {
  const usable = life.filter((l) => l.batch.status === "ACTIVE" && l.daysToExpiry !== null && l.daysToExpiry >= 0).sort((a, b) => (a.daysToExpiry as number) - (b.daysToExpiry as number));
  return { next: usable[0] ?? null, total: life.length, flagged: life.filter((l) => l.flag !== null).length, expired: life.filter((l) => l.flag === "EXPIRED").length };
}
