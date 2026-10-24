/**
 * One colour rule for every score, rating or "n of m" measure (2026-10-24): a smooth spectrum from red (0) through amber to green (1),
 * so 80% reads as mostly green and 20% as mostly red wherever it appears. Pass a fraction from 0 to 1 (use value / total for "16 of 18").
 * Returns null when there is nothing to score, so callers can fall back to a neutral colour.
 */
export function scoreColor(fraction: number | null | undefined): string | null {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return null;
  const f = Math.max(0, Math.min(1, fraction));
  const hue = Math.round(f * 120);
  // A touch darker through the yellow range so the colour stays readable as text on a white surface.
  const light = hue > 40 && hue < 85 ? 37 : 40;
  return `hsl(${hue} 70% ${light}%)`;
}

/** A score out of 100 (or a percentage). */
export const scoreColor100 = (score: number | null | undefined) => scoreColor(score === null || score === undefined ? null : score / 100);
