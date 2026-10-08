import { InfoIcon } from "./icons";

/**
 * A small, deliberately understated citation for wherever Universe computes
 * an APPROXIMATE metric against a named national/international standard or
 * benchmark — added 2026-10-08, per Lewis's request to show "real
 * referenced and engagement with international benchmarking" across the
 * platform, without it ever being front-and-centre. First use: the supply-
 * chain CO2/distance/efficiency feature (GLEC Framework/ISO 14083) — see
 * supply-chain-co2-efficiency.md — and the OTIF performance metric (see
 * procurement-lifecycle-benchmarking.md rec. #3).
 *
 * Deliberately just an icon + a short label, in caption-scale `ink-
 * secondary` type (never brand-violet/accent-magenta — this is reference
 * material, not a call to action) — full detail lives in the native title
 * tooltip rather than inline text, so it never competes for attention with
 * the metric itself. Same "never colour alone" discipline the brand system
 * already uses for status colour: this is an icon+text pairing, not a
 * colour swatch.
 *
 * Usage: <StandardsReference label="GLEC Framework (ISO 14083-aligned)"
 *   detail="CO2 estimate uses GLEC-Framework-aligned emission factors by
 *   transport mode; distance is a great-circle approximation between
 *   country centroids, not an actual shipping route. See
 *   supply-chain-co2-efficiency.md for the full methodology." />
 */
export function StandardsReference({ label, detail }: { label: string; detail?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "var(--u-ink-secondary)",
        opacity: 0.85,
        cursor: detail ? "help" : undefined,
      }}
      title={detail ?? label}
    >
      <InfoIcon size={11} style={{ flexShrink: 0 }} />
      {label}
    </span>
  );
}
