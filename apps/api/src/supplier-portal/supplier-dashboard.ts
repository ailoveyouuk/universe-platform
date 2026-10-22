/** Pure rules for the Supplier Portal home list (2026-10-22): what is waiting on the supplier, ordered by urgency. */
export type WaitingKind =
  | "INVITATION" | "BID_DRAFT" | "CALL_OFF" | "MINI_COMPETITION" | "VARIATION" | "PRICE_REVIEW" | "EVIDENCE" | "MILESTONE" | "PAYMENT_OVERDUE" | "PAYMENT_DUE";

export interface WaitingItem {
  kind: WaitingKind;
  title: string;
  detail: string;
  dueAt: Date | null;
  overdue: boolean;
  /** Path inside the Tenders app. */
  path: string;
}

const URGENT_DAYS = 7;
export const KIND_LABEL: Record<WaitingKind, string> = {
  INVITATION: "Invitation to tender", BID_DRAFT: "Bid in progress", CALL_OFF: "Call-off to answer", MINI_COMPETITION: "Invitation to quote", VARIATION: "Variation to answer",
  PRICE_REVIEW: "Price review to answer", EVIDENCE: "Evidence to acknowledge", MILESTONE: "Milestone", PAYMENT_OVERDUE: "Payment overdue", PAYMENT_DUE: "Payment due soon",
};

/** Overdue first (oldest first), then dated items soonest first, then undated. */
export function sortWaiting(items: WaitingItem[]): WaitingItem[] {
  return [...items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const at = a.dueAt?.getTime() ?? Infinity, bt = b.dueAt?.getTime() ?? Infinity;
    return at - bt;
  });
}

export function isUrgent(item: WaitingItem, now: Date): boolean {
  if (item.overdue) return true;
  return !!item.dueAt && item.dueAt.getTime() - now.getTime() <= URGENT_DAYS * 86_400_000;
}

export function countByKind(items: WaitingItem[]): Record<WaitingKind, number> {
  const out = Object.fromEntries(Object.keys(KIND_LABEL).map((k) => [k, 0])) as Record<WaitingKind, number>;
  for (const i of items) out[i.kind]++;
  return out;
}
