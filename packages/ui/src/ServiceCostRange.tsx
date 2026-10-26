"use client";
import { useEffect, useState } from "react";
import { SERVICE_PRICING_BASES, type ServiceCostRange as Range } from "@universe/types";

const fmt = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: n >= 100 ? 0 : 2 });

/**
 * The anonymised cost range for a standard service (2026-10-26): what suppliers on Universe have charged, before any margin, for this kind of
 * service in its usual pricing basis. A guide for the person building a line or a tender, never a price list. Renders nothing until a range
 * exists (too few organisations, no Insights access, or no data yet).
 */
export function ServiceCostRange({ code, load }: { code: string | null | undefined; load: (code: string) => Promise<Range> }) {
  const [range, setRange] = useState<Range | null>(null);
  useEffect(() => {
    setRange(null);
    if (!code) return;
    let live = true;
    load(code).then((r) => { if (live) setRange(r); }).catch(() => undefined);
    return () => { live = false; };
  }, [code, load]);
  if (!range || range.ranges.length === 0) return null;
  const basis = SERVICE_PRICING_BASES.find((b) => b.code === range.basis)?.label.toLowerCase() ?? range.basis;
  return (
    <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
      Typical cost price, {basis}: {range.ranges.map((r) => `${r.currency} ${fmt(r.minPrice)} to ${fmt(r.maxPrice)} (average ${fmt(r.avgPrice)}, from ${r.sourceCount} organisations)`).join("; ")}. Anonymised, before any margin. Source: Universe Insights.
    </span>
  );
}
