"use client";

import { useMemo } from "react";

/**
 * The reusable world-map component — product-database-and-map-roadmap.md
 * Stage 2, built 2026-10-09. One component in `@universe/ui`, not
 * duplicated per app, since three call sites need it (Stage 3a Logistics
 * & CO2's manufacture/delivery routes, Stage 3c Product Database's
 * per-category pulses, and whatever Stage 3 variant comes after those).
 *
 * Deliberately NOT a real coastline/landmass map. Rendering actual
 * country borders would mean importing a geographic dataset (a new
 * runtime dependency, a licensing question, meaningful bundle size for
 * every app that pulls in `@universe/ui`) for a platform whose brand
 * system is otherwise flat colour/typography, never illustrative art —
 * see universe-brand-identity.md. Instead this draws a faint graticule
 * (a latitude/longitude grid) as an abstract stand-in for "the world",
 * which is also a more honest visual given the data behind every pulse is
 * itself only a coarse, one-point-per-country centroid approximation
 * (see Country.latitude/longitude's doc comment in schema.prisma) — a
 * precise coastline would imply a precision the underlying data doesn't
 * have.
 *
 * Projection is a plain equirectangular mapping (longitude -180..180 ->
 * x 0..1000, latitude 90..-90 -> y 0..500) — not cartographically
 * accurate at the poles, fine for the kind of country-level, non-polar
 * points this platform actually plots. Arcs are simple quadratic-bezier
 * "flight paths" bowed toward the pole, not true great-circle paths, and
 * don't special-case the antimeridian (longitude ±180) — an acceptable
 * simplification for this platform's actual routes (manufacture/delivery
 * pairs within Europe/Asia/Africa, not literally antipodal shipments).
 *
 * Presentation-only, same ethos as StatTile.tsx: colour, size, arcs, and
 * legend entries are entirely caller-supplied — this component has no
 * baked-in palette and knows nothing about countries, categories, or
 * logistics. Each call site (Stage 3a/3b/3c) picks its own colours from
 * the existing design tokens (e.g. the module accent tokens, or its own
 * small per-category palette) and passes them straight through.
 *
 * Point radius is driven by `value` on a sqrt scale (so AREA, not radius,
 * is proportional to the value — the correct perceptual encoding for a
 * magnitude shown as a circle), clamped into a fixed [MIN_RADIUS,
 * MAX_RADIUS] range computed once across all points in a given render —
 * so one outlier count doesn't shrink every other point to invisibility.
 *
 * The slow pulse itself is a shared tokens.css keyframe/utility class
 * (`u-map-pulse-ring`), the same convention as the existing
 * `u-fade-in`/`u-card-hover` utilities there, rather than a one-off
 * <style> tag inside this file.
 */
export interface WorldMapPoint {
  /** Stable key — e.g. a country code, or `${category}:${countryCode}`
   * when more than one series can land on the same country. */
  id: string;
  latitude: number;
  longitude: number;
  /** Shown in the native SVG tooltip on hover, alongside `value`. */
  label: string;
  /** Any valid CSS colour — a design token (`var(--u-...)`) or a literal
   * hex value the caller has already picked for its own legend. */
  color: string;
  /** Drives this point's radius, relative to every other point passed in
   * the same render (see the sqrt-scale note above). Must be > 0 to
   * render at a meaningful size; a 0 or negative value still renders at
   * the minimum radius rather than being dropped, so a real zero-count
   * series doesn't just vanish from the map. */
  value: number;
}

export interface WorldMapArc {
  id: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  color: string;
  /** Shown in the native SVG tooltip on hover — e.g. "London → Lagos". */
  label?: string;
}

export interface WorldMapLegendEntry {
  color: string;
  label: string;
}

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 500;
const MIN_RADIUS = 5;
const MAX_RADIUS = 16;

function project(latitude: number, longitude: number): { x: number; y: number } {
  return {
    x: ((longitude + 180) / 360) * VIEW_WIDTH,
    y: ((90 - latitude) / 180) * VIEW_HEIGHT,
  };
}

function isFinitePoint(p: { x: number; y: number }): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

/** One quadratic-bezier "flight path" between two projected points, bowed
 * toward the pole (lower y) by a fraction of the straight-line distance,
 * capped so a very long route doesn't bow absurdly far off-map. */
function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const bow = Math.min(distance * 0.22, 70);
  return `M ${from.x} ${from.y} Q ${midX} ${midY - bow} ${to.x} ${to.y}`;
}

/** Returns a function mapping a raw `value` to a render radius, on a
 * sqrt scale across the full set of points passed to one WorldMap render
 * (see the module doc comment for why sqrt, not linear). Falls back to
 * the midpoint radius when every value is equal (including the
 * single-point and all-zero cases) since there's nothing to scale
 * against. */
function buildRadiusScale(points: WorldMapPoint[]): (value: number) => number {
  const values = points.map((p) => Math.max(p.value, 0));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  if (max <= min) {
    const mid = (MIN_RADIUS + MAX_RADIUS) / 2;
    return () => mid;
  }
  const sqrtMin = Math.sqrt(min);
  const sqrtMax = Math.sqrt(max);
  return (value: number) => {
    const t = (Math.sqrt(Math.max(value, 0)) - sqrtMin) / (sqrtMax - sqrtMin);
    return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
  };
}

function Graticule() {
  const meridians = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * VIEW_WIDTH;
    meridians.push(<line key={`lon${lon}`} x1={x} y1={0} x2={x} y2={VIEW_HEIGHT} />);
  }
  const parallels = [];
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * VIEW_HEIGHT;
    parallels.push(<line key={`lat${lat}`} x1={0} y1={y} x2={VIEW_WIDTH} y2={y} />);
  }
  return (
    <g stroke="var(--u-border)" strokeWidth={1}>
      {meridians}
      {parallels}
    </g>
  );
}

/**
 * Renders `points` (pulsing, colour + size coded) and optional `arcs`
 * (dashed flight-path lines) on the abstract graticule map described
 * above, with a `legend` row underneath. See the module doc comment for
 * the full design reasoning.
 */
export function WorldMap({
  points,
  arcs = [],
  legend,
  height = 360,
  emptyMessage = "No locations to show yet.",
}: {
  points: WorldMapPoint[];
  arcs?: WorldMapArc[];
  legend?: WorldMapLegendEntry[];
  /** SVG render height in px — the map always fills its container's
   * width at a fixed VIEW_WIDTH:VIEW_HEIGHT (2:1) aspect ratio. */
  height?: number;
  /** Shown centred on the map when `points` is empty, e.g. before the
   * first country-of-manufacture is recorded. */
  emptyMessage?: string;
}) {
  const scaleRadius = useMemo(() => buildRadiusScale(points), [points]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        style={{
          width: "100%",
          height,
          display: "block",
          borderRadius: "var(--u-radius-lg)",
          border: "1px solid var(--u-border)",
          backgroundColor: "var(--u-surface-alt)",
        }}
        role="img"
        aria-label="World map"
      >
        <Graticule />

        {arcs.map((arc) => {
          const from = project(arc.from.latitude, arc.from.longitude);
          const to = project(arc.to.latitude, arc.to.longitude);
          if (!isFinitePoint(from) || !isFinitePoint(to)) return null;
          return (
            <path key={arc.id} d={arcPath(from, to)} fill="none" stroke={arc.color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7}>
              {arc.label && <title>{arc.label}</title>}
            </path>
          );
        })}

        {points.map((point, i) => {
          const { x, y } = project(point.latitude, point.longitude);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const r = scaleRadius(point.value);
          return (
            <g key={point.id}>
              <circle
                cx={x}
                cy={y}
                r={r}
                fill="none"
                stroke={point.color}
                strokeWidth={2}
                className="u-map-pulse-ring"
                style={{
                  transformBox: "fill-box" as never,
                  transformOrigin: "center",
                  animationDelay: `${(i % 8) * 0.3}s`,
                }}
              />
              <circle cx={x} cy={y} r={r} fill={point.color} opacity={0.9}>
                <title>{`${point.label} — ${point.value}`}</title>
              </circle>
            </g>
          );
        })}

        {points.length === 0 && (
          <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2} textAnchor="middle" fontSize={16} fill="var(--u-ink-secondary)">
            {emptyMessage}
          </text>
        )}
      </svg>

      {legend && legend.length > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          {legend.map((entry) => (
            <span key={entry.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--u-ink-secondary)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
              {entry.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
