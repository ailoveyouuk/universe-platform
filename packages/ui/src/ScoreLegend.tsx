"use client";

/**
 * Colour bands for the 1–10 logistics efficiency/CO2-impact score — the
 * single source of truth for the UI side of what
 * `packages/db/src/logistics-metrics.ts`'s `scoreLine()` computes (RED
 * 1–3, AMBER 4–5, YELLOW 6–7, GREEN 8–10; see
 * supply-chain-co2-efficiency.md). Exported so every place that colours a
 * score badge (logistics/page.tsx, logistics/global/page.tsx,
 * ProjectDetailView.tsx's LogisticsMetricBadge) uses the same values
 * instead of three separately hand-copied Records.
 */
export const SCORE_BAND_COLORS: Record<string, string> = {
  RED: "#c0392b",
  AMBER: "#d68910",
  YELLOW: "#b7950b",
  GREEN: "#1e8449",
};

const SCORE_BANDS: { band: keyof typeof SCORE_BAND_COLORS; range: string }[] = [
  { band: "GREEN", range: "8–10" },
  { band: "YELLOW", range: "6–7" },
  { band: "AMBER", range: "4–5" },
  { band: "RED", range: "1–3" },
];

/**
 * The one other place that needed to turn a raw 1–10 efficiency score
 * into a band — WorldMap callouts on the Global Logistics & CO2 page
 * (added 2026-10-09, per Lewis's request for a colour-coded CO2e rating
 * in the map's route-arc hover callout) needed the band for an
 * aggregated route's avgEfficiencyScore, which (unlike
 * ProjectLineLogisticsMetric) carries no scoreBand field of its own.
 * Mirrors packages/db/src/logistics-metrics.ts's scoreLine() thresholds
 * exactly (<=3 RED, <=5 AMBER, <=7 YELLOW, else GREEN) — kept here next
 * to SCORE_BAND_COLORS as this module's own single source of truth for
 * the frontend side of those same thresholds, rather than hand-copying
 * them a fourth time.
 */
export function bandForScore(score: number): keyof typeof SCORE_BAND_COLORS {
  if (score <= 3) return "RED";
  if (score <= 5) return "AMBER";
  if (score <= 7) return "YELLOW";
  return "GREEN";
}

/**
 * A small, discrete key explaining the logistics efficiency/CO2-impact
 * score and its colour bands — added 2026-10-08 per Lewis's request for a
 * legend wherever that score/colour appears, since neither the number
 * scale nor what each colour means was explained anywhere in the UI.
 *
 * Rebuilt 2026-10-14 (mobile pass) from a click-to-open popover into a
 * permanently-visible, single-line strip of colour dot + range + band,
 * wrapping onto a second line on its own rather than floating a panel
 * over the page. The popover version anchored itself with `right: 0`
 * relative to its trigger button, which on a narrow phone could still
 * overflow or land on top of the stat tiles/map directly below it (the
 * "click callout covering content" issue Lewis flagged from a live
 * screenshot) — there's no viewport-aware repositioning worth building
 * for four colour swatches when simply never covering anything is
 * strictly simpler and reads as calmer on every screen size. Still the
 * same understated idiom as StandardsReference.tsx (caption-scale
 * ink-secondary text, never brand-violet/accent-magenta) so it reads as
 * reference material, not a call to action.
 */
export function ScoreLegend({ label = "Score & colour key" }: { label?: string }) {
  return (
    <div
      role="note"
      aria-label={`${label} — what the efficiency/CO2-impact score and its colours mean`}
      title="1\u201310, driven mainly by the CO2 intensity of the transport mode used \u2014 sea freight scores highest, air freight lowest \u2014 with a small adjustment for unusually short or long routes."
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 12px",
        fontSize: 11,
        color: "var(--u-ink-secondary)",
      }}
    >
      <span style={{ opacity: 0.85 }}>{label}:</span>
      {SCORE_BANDS.map(({ band, range }) => (
        <span key={band} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: SCORE_BAND_COLORS[band],
              flexShrink: 0,
            }}
          />
          <span>
            {range} <span style={{ opacity: 0.85 }}>· {band}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
