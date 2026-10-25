/**
 * Pure helpers for the daily exchange-rate history shown in Insights (2026-10-25). Rates are stored per day with USD as the base
 * (units of each currency per 1 USD, the shape Frankfurter and ExchangeRateSnapshot use), so any pair is a cross rate.
 */
export interface FxDay { date: string; rates: Record<string, number> }
export interface FxPoint { date: string; rate: number }

/** Units of `to` per 1 unit of `from` on one day, or null when either currency has no rate that day. USD is always 1. */
export function crossRate(rates: Record<string, number>, from: string, to: string): number | null {
  const f = from === "USD" ? 1 : rates[from];
  const t = to === "USD" ? 1 : rates[to];
  if (!f || !t) return null;
  return t / f;
}

/** The daily rate series for one pair, oldest first; days where the pair cannot be worked out are left out. */
export function buildSeries(days: FxDay[], from: string, to: string): FxPoint[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((d) => { const r = crossRate(d.rates, from, to); return r === null ? [] : [{ date: d.date, rate: Math.round(r * 1e6) / 1e6 }]; });
}

/** Whether stored days are thin enough that the range should be fetched again: no day near either end, or far fewer than a business-day calendar would give. */
export function needsFetch(storedDates: string[], start: string, end: string): boolean {
  if (!storedDates.length) return true;
  const sorted = [...storedDates].sort();
  const day = 86_400_000;
  const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
  if (t(sorted[0]!) - t(start) > 6 * day) return true;
  if (t(end) - t(sorted[sorted.length - 1]!) > 6 * day) return true;
  const spanDays = (t(end) - t(start)) / day;
  return sorted.length < spanDays * (5 / 7) * 0.85;
}
