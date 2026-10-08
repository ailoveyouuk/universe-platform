"use client";

import { useState } from "react";
import { InfoIcon } from "./icons";

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
 * A small, discrete key explaining the logistics efficiency/CO2-impact
 * score and its colour bands — added 2026-10-08 per Lewis's request for a
 * legend wherever that score/colour appears, since neither the number
 * scale nor what each colour means was explained anywhere in the UI.
 *
 * Follows the same understated idiom as StandardsReference.tsx (small
 * icon + caption-scale ink-secondary label, never brand-violet/accent-
 * magenta) so it reads as the same kind of "reference material, not a
 * call to action" — but opens a small popover instead of relying on a
 * native `title`, since this needs to show four colour swatches, not just
 * a sentence of text. Closes on blur so it never lingers over the page.
 */
export function ScoreLegend({ label = "Score & colour key" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label} — what the efficiency/CO2-impact score and its colours mean`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "var(--u-ink-secondary)",
          opacity: 0.85,
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          cursor: "help",
        }}
      >
        <InfoIcon size={11} style={{ flexShrink: 0 }} />
        {label}
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            width: 230,
            padding: "12px 14px",
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-border)",
            backgroundColor: "var(--u-surface-raised)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--u-ink)" }}>
            Efficiency / CO2-impact score
          </p>
          <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "var(--u-ink-secondary)", lineHeight: 1.4 }}>
            1–10, driven mainly by the CO2 intensity of the transport mode used — sea freight
            scores highest, air freight lowest — with a small adjustment for unusually short or
            long routes.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SCORE_BANDS.map(({ band, range }) => (
              <div key={band} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: SCORE_BAND_COLORS[band],
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11.5, color: "var(--u-ink)" }}>
                  {range} <span style={{ color: "var(--u-ink-secondary)" }}>· {band}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
