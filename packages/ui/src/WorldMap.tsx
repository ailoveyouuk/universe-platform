"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";

/**
 * The reusable world-map component — product-database-and-map-roadmap.md
 * Stage 2, built 2026-10-09. One component in `@universe/ui`, not
 * duplicated per app, since three call sites need it (Stage 3a Logistics
 * & CO2's manufacture/delivery routes, Stage 3c Product Database's
 * per-category pulses, and whatever Stage 3 variant comes after those).
 *
 * Draws a faint graticule (a latitude/longitude grid) plus a rough,
 * hand-approximated continent silhouette underneath it — NOT a real
 * coastline/landmass dataset. Importing one would mean a new runtime
 * dependency, a licensing question, and real bundle size for every app
 * that pulls in `@universe/ui`, for a platform whose brand system is
 * otherwise flat colour/typography, never illustrative art — see
 * universe-brand-identity.md. The outlines below (`CONTINENT_PATHS`) are
 * a small set of hand-placed points per landmass (10-27 vertices each),
 * good enough to tell at a glance "that's Africa" / "that's Eurasia" —
 * not a precise coastline, and the underlying pulse data is itself only
 * a coarse, one-point-per-country centroid anyway (see
 * Country.latitude/longitude's doc comment in schema.prisma), so a
 * precise coastline would overstate a precision the data doesn't have.
 * Added 2026-10-09 after Lewis asked for at least a rough outline rather
 * than the bare grid — tried fetching a real simplified world-atlas
 * dataset first (same as Stage 2's original attempt), still blocked by
 * this environment's egress policy, so these are drawn by hand instead.
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
 *
 * Interactivity, added 2026-10-09 per Lewis's follow-up design request —
 * points are clickable (via the new `onPointClick` prop, entirely
 * optional — a caller that passes nothing gets the old, non-interactive
 * behaviour) so a caller can filter whatever list sits below the map to
 * just that pulse's country/series; hovering (or tapping, on touch) a
 * point or arc shows a small HTML callout — the country/series name for
 * a point, and whatever `tooltipLines` the caller supplies for an arc
 * (e.g. distance and a colour-coded efficiency rating — WorldMap doesn't
 * know what those mean, the caller formats and colours each line itself,
 * same presentation-only ethos as everything else here). The callout is
 * a real HTML overlay (not SVG `<text>`), specifically so its font size
 * is in actual CSS pixels and stays legible at any screen width — the
 * rest of this component's art scales down with the SVG's viewBox on a
 * narrow mobile/tablet container, which text would too if it were drawn
 * inside the SVG itself.
 */
export interface WorldMapTooltipLine {
  text: string;
  /** Any valid CSS colour — e.g. a score-band colour for a logistics
   * efficiency rating. Defaults to the tooltip's own ink colour. */
  color?: string;
}

export interface WorldMapPoint {
  /** Stable key — e.g. a country code, or `${category}:${countryCode}`
   * when more than one series can land on the same country. */
  id: string;
  latitude: number;
  longitude: number;
  /** The callout's title line on hover/tap — typically the country or
   * place name. Also used as the native SVG `<title>` fallback. */
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
  /** Extra callout lines below `label`/`value` — e.g. a caller that wants
   * to show more than just the raw count on hover. Optional; most
   * callers don't need this, since `label` + `value` already cover the
   * default "country + count" callout. */
  tooltipLines?: WorldMapTooltipLine[];
}

export interface WorldMapArc {
  id: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  color: string;
  /** Callout title on hover — e.g. "London → Lagos". Also used as the
   * native SVG `<title>` fallback. */
  label?: string;
  /** Extra callout lines below `label` — e.g. a distance and a
   * colour-coded efficiency/CO2e rating for a logistics route. Each line
   * can carry its own colour; WorldMap just renders what it's given. */
  tooltipLines?: WorldMapTooltipLine[];
}

export interface WorldMapLegendEntry {
  color: string;
  label: string;
}

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 500;
const MIN_RADIUS = 5;
const MAX_RADIUS = 16;
/** Minimum invisible hit-radius (in viewBox units) for a point's click/
 * hover target, independent of its drawn radius — a point's visual
 * radius can be as small as MIN_RADIUS, which on a narrow mobile
 * container (the SVG, and everything inside it, scales down with the
 * viewBox) would otherwise be a near-unusable touch target. */
const MIN_HIT_RADIUS = 20;
/** Invisible stroke width (viewBox units) used to widen an arc's hover
 * hit area beyond its thin 1.5px visual stroke — same reasoning as
 * MIN_HIT_RADIUS above. */
const ARC_HIT_STROKE_WIDTH = 16;

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
 * Rough, hand-approximated continent silhouettes — see the module doc
 * comment above for why these are hand-placed points rather than a real
 * geographic dataset. Coordinates are already projected (equirectangular,
 * same VIEW_WIDTH/VIEW_HEIGHT as the rest of this component) and rounded
 * to 1 decimal place; generated once from approximate longitude/latitude
 * control points per landmass and baked in as static path data, not
 * computed at render time. Deliberately excludes Antarctica (the
 * platform's data never plots a point there) and keeps Greenland folded
 * into the North America outline rather than drawn separately.
 */
const CONTINENT_PATHS = [
  "M33.3 66.7 L41.7 86.1 L138.9 97.2 L152.8 116.7 L155.6 138.9 L175.0 161.1 L208.3 194.4 L244.4 205.6 L230.6 177.8 L275.0 180.6 L291.7 152.8 L316.7 125.0 L352.8 119.4 L319.4 83.3 L277.8 55.6 L236.1 55.6 L138.9 55.6 L83.3 55.6 L33.3 66.7 Z", // North America
  "M286.1 227.8 L333.3 222.2 L361.1 250.0 L402.8 272.2 L388.9 313.9 L366.7 319.4 L341.7 347.2 L327.8 361.1 L311.1 394.4 L297.2 375.0 L302.8 300.0 L280.6 263.9 L286.1 227.8 Z", // South America
  "M452.8 191.7 L455.6 213.9 L472.2 236.1 L508.3 233.3 L525.0 238.9 L536.1 266.7 L533.3 297.2 L550.0 344.4 L572.2 341.7 L588.9 322.2 L611.1 291.7 L641.7 216.7 L619.4 216.7 L602.8 166.7 L569.4 161.1 L527.8 147.2 L483.3 152.8 L452.8 191.7 Z", // Africa
  "M475.0 130.6 L475.0 147.2 L500.0 144.4 L527.8 150.0 L555.6 138.9 L575.0 136.1 L583.3 122.2 L575.0 83.3 L513.9 77.8 L555.6 55.6 L611.1 55.6 L666.7 55.6 L777.8 41.7 L888.9 47.2 L972.2 63.9 L1000.0 69.4 L944.4 97.2 L888.9 125.0 L838.9 163.9 L800.0 188.9 L777.8 222.2 L722.2 227.8 L694.4 194.4 L666.7 180.6 L638.9 166.7 L597.2 152.8 L475.0 130.6 Z", // Eurasia
  "M813.9 311.1 L838.9 300.0 L861.1 283.3 L894.4 280.6 L925.0 327.8 L916.7 352.8 L888.9 355.6 L863.9 338.9 L813.9 311.1 Z", // Australia
];

function Continents() {
  return (
    <g fill="var(--u-border)" fillOpacity={0.5} stroke="none">
      {CONTINENT_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  lines: WorldMapTooltipLine[];
}

/**
 * The callout itself — a plain HTML overlay (absolutely positioned over
 * the SVG, inside the same relatively-positioned wrapper), not SVG
 * `<text>`. See the module doc comment's "Interactivity" section for why:
 * this is what keeps it legible at a real, fixed font size regardless of
 * how far the map's own viewBox has scaled down on a narrow container.
 * Anchored above-and-centred on the hovered/tapped point via a CSS
 * transform rather than measured JS layout, same lightweight approach as
 * ScoreLegend.tsx's popover.
 */
function MapTooltip({ tooltip }: { tooltip: TooltipState }) {
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(-50%, calc(-100% - 10px))",
        zIndex: 20,
        maxWidth: 220,
        padding: "8px 10px",
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--u-ink)", lineHeight: 1.3 }}>{tooltip.title}</div>
      {tooltip.lines.map((line, i) => (
        <div key={i} style={{ fontSize: 11.5, color: line.color ?? "var(--u-ink-secondary)", marginTop: 3, lineHeight: 1.3 }}>
          {line.text}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders `points` (pulsing, colour + size coded, with the raw `value`
 * printed right next to each one) and optional `arcs` (dashed flight-path
 * lines) on the abstract graticule map described above, with a `legend`
 * row underneath. See the module doc comment for the full design
 * reasoning, including the "Interactivity" section for hover/tap
 * callouts and `onPointClick`.
 *
 * Per-point value labels sit ON the map (added 2026-10-09, Lewis's design
 * feedback before Stage 3a) rather than only being available via the
 * hover callout: a small halo'd number beside each point, flipped to the
 * point's left near the map's right edge so it doesn't run off-canvas.
 * `legend` is deliberately NOT where per-point numbers live — it stays a
 * short, minimal colour key (what each colour/series means), sitting
 * below the map rather than competing with it for width, which is also
 * why it was kept out of the map's own viewBox entirely. Two labels
 * landing on top of each other when two points are very close together on
 * the map is a known, accepted limitation — not worth a label-collision
 * layout pass for this platform's actual point density.
 */
export function WorldMap({
  points,
  arcs = [],
  legend,
  maxHeight = 420,
  showValueLabels = true,
  emptyMessage = "No locations to show yet.",
  onPointClick,
}: {
  points: WorldMapPoint[];
  arcs?: WorldMapArc[];
  legend?: WorldMapLegendEntry[];
  /** Caps the SVG's rendered height in px on wide viewports — the map
   * always keeps the fixed VIEW_WIDTH:VIEW_HEIGHT (2:1) aspect ratio via
   * CSS `aspect-ratio` and fills its container's width, so on a narrow
   * (mobile/tablet) container it shrinks in height right along with the
   * width rather than staying a tall fixed box with mostly empty
   * graticule. Renamed from a plain `height` 2026-10-09 (no call site
   * existed yet to migrate — Stage 3 is what adds the first ones) once
   * it became clear a literal fixed height fought responsive width
   * rather than complementing it. */
  maxHeight?: number;
  /** Prints each point's raw `value` beside it on the map itself (see the
   * module doc comment) — set false if a caller's points are packed
   * tightly enough that the labels would mostly overlap, and the hover/
   * tap callout (always present regardless of this flag) is enough. */
  showValueLabels?: boolean;
  /** Shown centred on the map when `points` is empty, e.g. before the
   * first country-of-manufacture is recorded. */
  emptyMessage?: string;
  /** Called when a point is clicked/tapped — e.g. to filter whatever
   * list sits below the map down to that point's country/series. Purely
   * optional: a caller that omits this gets a map with hover/tap
   * callouts but no click behaviour, same as before this was added
   * (points still render exactly the same either way). WorldMap itself
   * has no idea what "filtering" means here — the caller owns that. */
  onPointClick?: (point: WorldMapPoint) => void;
}) {
  const scaleRadius = useMemo(() => buildRadiusScale(points), [points]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Half of MapTooltip's own maxWidth (220) below — kept as a named
  // constant here (not imported from MapTooltip, which doesn't export
  // anything) purely so the clamping logic and the width it's clamping
  // against are easy to eyeball as matching. On a narrow mobile
  // container the tooltip is centred (translate(-50%, ...)) on the
  // tapped point by default, which pushes it half off-screen for any
  // point within this margin of the container's left/right edge —
  // clamping x keeps the full callout on-screen (at the cost of no
  // longer being pixel-centred on very edge points, an acceptable
  // trade since there's no pointer/arrow tying it to the point visually
  // anyway).
  const TOOLTIP_HALF_WIDTH = 110;

  function positionFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const rawX = e.clientX - rect.left;
    const minX = Math.min(TOOLTIP_HALF_WIDTH, rect.width / 2);
    const maxX = Math.max(rect.width - TOOLTIP_HALF_WIDTH, rect.width / 2);
    const x = Math.min(Math.max(rawX, minX), maxX);
    return { x, y: e.clientY - rect.top };
  }

  function showPointTooltip(e: MouseEvent, point: WorldMapPoint) {
    const { x, y } = positionFromEvent(e);
    setTooltip({
      x,
      y,
      title: point.label,
      lines: point.tooltipLines ?? [{ text: String(point.value) }],
    });
  }

  function showArcTooltip(e: MouseEvent, arc: WorldMapArc) {
    if (!arc.label && !arc.tooltipLines?.length) return;
    const { x, y } = positionFromEvent(e);
    setTooltip({
      x,
      y,
      title: arc.label ?? "",
      lines: arc.tooltipLines ?? [],
    });
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        style={{
          width: "100%",
          aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}`,
          maxHeight,
          display: "block",
          borderRadius: "var(--u-radius-lg)",
          border: "1px solid var(--u-border)",
          backgroundColor: "var(--u-surface-alt)",
        }}
        role="img"
        aria-label="World map"
        onClick={(e) => {
          // Only clears the callout when the click landed on empty map
          // background (not bubbled up from a point/arc, which call
          // stopPropagation in their own handlers below) — lets a tap
          // elsewhere on the map dismiss a pinned mobile callout.
          if (e.target === e.currentTarget) setTooltip(null);
        }}
      >
        <Graticule />
        <Continents />

        {arcs.map((arc) => {
          const from = project(arc.from.latitude, arc.from.longitude);
          const to = project(arc.to.latitude, arc.to.longitude);
          if (!isFinitePoint(from) || !isFinitePoint(to)) return null;
          const d = arcPath(from, to);
          const hasTooltip = Boolean(arc.label || arc.tooltipLines?.length);
          return (
            <g key={arc.id}>
              <path d={d} fill="none" stroke={arc.color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} pointerEvents="none">
                {arc.label && <title>{arc.label}</title>}
              </path>
              {hasTooltip && (
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={ARC_HIT_STROKE_WIDTH}
                  onMouseEnter={(e) => showArcTooltip(e, arc)}
                  onMouseMove={(e) => showArcTooltip(e, arc)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    showArcTooltip(e, arc);
                  }}
                />
              )}
            </g>
          );
        })}

        {points.map((point, i) => {
          const { x, y } = project(point.latitude, point.longitude);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const r = scaleRadius(point.value);
          const hitRadius = Math.max(r * 1.6, MIN_HIT_RADIUS);
          // Flip the value label to the point's left once it's past 85%
          // of the map's width, so it doesn't run off the right edge of
          // the viewBox for a point near the antimeridian.
          const labelOnRight = x < VIEW_WIDTH * 0.85;
          const labelX = labelOnRight ? x + r + 5 : x - r - 5;
          const interactive = Boolean(onPointClick);
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
              <circle cx={x} cy={y} r={r} fill={point.color} opacity={0.9} pointerEvents="none">
                <title>{`${point.label} — ${point.value}`}</title>
              </circle>
              {/* Invisible, generously-sized hit target — see
                  MIN_HIT_RADIUS's doc comment above for why this is
                  bigger than the visible pulse. Carries all the actual
                  interaction handlers. */}
              <circle
                cx={x}
                cy={y}
                r={hitRadius}
                fill="transparent"
                style={{ cursor: interactive ? "pointer" : "default" }}
                onMouseEnter={(e) => showPointTooltip(e, point)}
                onMouseMove={(e) => showPointTooltip(e, point)}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  showPointTooltip(e, point);
                  onPointClick?.(point);
                }}
              />
              {showValueLabels && (
                <text
                  x={labelX}
                  y={y}
                  dy={4}
                  textAnchor={labelOnRight ? "start" : "end"}
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--u-ink)"
                  stroke="var(--u-surface-alt)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {point.value}
                </text>
              )}
            </g>
          );
        })}

        {points.length === 0 && (
          <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2} textAnchor="middle" fontSize={16} fill="var(--u-ink-secondary)">
            {emptyMessage}
          </text>
        )}
      </svg>

      {tooltip && <MapTooltip tooltip={tooltip} />}

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
