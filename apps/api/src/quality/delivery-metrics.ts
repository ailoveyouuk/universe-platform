import { onTimeWithin } from "./scorecard-scoring";

export interface TimelinessLine {
  projectedDeliveryDate: Date | null; actualDeliveryDate: Date | null; goodsCollectedDate: Date | null; supplierGad: Date | null;
  internalOnTime: boolean | null; supplierOnTime: boolean | null;
}
export interface WindowSettings { earlyDays: number; lateDays: number }

/**
 * The one definition of "on time" used by every scorecard view. Suppliers are measured against the date they committed to
 * (collected vs their GAD); manufacturers and forwarders against the date promised to the client (delivered vs projected).
 * When both dates exist the organisation's working-day window decides; when they don't, the stored flag is used as it stands.
 */
export function lineTimeliness(l: TimelinessLine, role: "SUPPLIER" | "OTHER", w: WindowSettings): boolean | null {
  if (role === "SUPPLIER") {
    return l.goodsCollectedDate && l.supplierGad ? onTimeWithin(l.goodsCollectedDate, l.supplierGad, w.earlyDays, w.lateDays) : l.supplierOnTime;
  }
  return l.actualDeliveryDate && l.projectedDeliveryDate ? onTimeWithin(l.actualDeliveryDate, l.projectedDeliveryDate, w.earlyDays, w.lateDays) : l.internalOnTime;
}
