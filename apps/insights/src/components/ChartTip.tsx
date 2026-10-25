"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared point-by-point interaction for every Insights chart (2026-10-25). A mark shows its exact values on hover or keyboard focus, and a click or
 * tap keeps them open (so a finger can read them) until another mark is chosen, the background is clicked, or Escape is pressed. The marks
 * keep their own aria-labels (which already carry the same values), so the tooltip itself is hidden from screen readers to avoid reading twice.
 */
export interface TipRow { label: string; value: string; swatch?: string }
export interface TipState { x: number; y: number; vw: number; vh: number; title: string; rows: TipRow[]; pinned: boolean; key: string }
export type TipInput = Omit<TipState, "pinned">;

export function useChartTip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((t: TipInput) => setTip((cur) => (cur?.pinned ? cur : { ...t, pinned: false })), []);
  const hide = useCallback(() => setTip((cur) => (cur?.pinned ? cur : null)), []);
  const pin = useCallback((t: TipInput) => setTip((cur) => (cur?.pinned && cur.key === t.key ? null : { ...t, pinned: true })), []);
  const close = useCallback(() => setTip(null), []);
  const activeKey = tip?.key ?? null;
  /** Handlers to spread onto one mark (or one hit area). */
  const bind = useCallback((t: TipInput) => ({
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType !== "touch") show(t); },
    onPointerLeave: () => hide(),
    onFocus: () => show(t),
    onBlur: () => hide(),
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); pin(t); },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pin(t); } if (e.key === "Escape") close(); },
  }), [show, hide, pin, close]);
  return { tip, bind, close, activeKey, pinned: !!tip?.pinned };
}

/** Put inside the chart's `position: relative` wrapper. */
export function ChartTooltip({ tip, onClose }: { tip: TipState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  // Keep the card inside the chart's box on the left and right.
  useEffect(() => {
    const el = ref.current; const parent = el?.parentElement; if (!el || !parent) { setShift(0); return; }
    const pr = parent.getBoundingClientRect(); const r = el.getBoundingClientRect();
    const over = r.left - 4 - pr.left < 0 ? 4 - (r.left - pr.left) : r.right + 4 > pr.right ? pr.right - 4 - r.right : 0;
    setShift((s) => s + over);
  }, [tip?.key, tip?.x, tip?.y]);
  useEffect(() => { setShift(0); }, [tip?.key]);
  useEffect(() => {
    if (!tip?.pinned) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [tip?.pinned, onClose]);
  if (!tip) return null;
  const below = tip.y / tip.vh < 0.28;
  return (
    <div ref={ref} aria-hidden="true" data-chart-tip style={{
      position: "absolute", left: `${(tip.x / tip.vw) * 100}%`, top: `${(tip.y / tip.vh) * 100}%`, transform: `translate(calc(-50% + ${shift}px), ${below ? "14px" : "calc(-100% - 14px)"})`,
      pointerEvents: "none", zIndex: 5, minWidth: 150, maxWidth: 260, padding: "8px 10px", borderRadius: "var(--u-radius-md)", border: `1px solid ${tip.pinned ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-border)"}`,
      background: "var(--u-surface-raised)", color: "var(--u-ink)", boxShadow: "0 4px 16px rgba(0,0,0,0.16)", fontSize: 12.5, lineHeight: 1.4,
    }}>
      <div style={{ fontWeight: 700, marginBottom: tip.rows.length ? 4 : 0 }}>{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: "var(--u-ink-secondary)" }}>{r.swatch && <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: r.swatch, marginRight: 6 }} />}{r.label}</span>
          <span style={{ fontWeight: 600, textAlign: "right" }}>{r.value}</span>
        </div>
      ))}
      {tip.pinned && <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--u-ink-secondary)" }}>Press Escape or tap the chart to close</div>}
    </div>
  );
}
