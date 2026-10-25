"use client";

/** Every row is drawn on the same scale, so a small move looks small. */
export function Spark({ points, lo, hi }: { points: { index: number }[]; lo: number; hi: number }) {
  const W = 96, H = 26; const span = hi - lo || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * (W - 4)) / Math.max(1, points.length - 1) + 2},${H - 3 - ((p.index - lo) / span) * (H - 6)}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ display: "block" }}><path d={d} fill="none" stroke="var(--u-brand-violet)" strokeWidth={2} strokeLinejoin="round" /></svg>;
}
