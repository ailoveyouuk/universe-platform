// ─────────────────────────────────────────────────────────────────────────────
// TurbineSizeComparison — RC Diagram Design Language v1.2 (process-flow variant)
//
// Chronological silhouette comparison of offshore wind turbine size, 1991→now:
//
//   1991        2002           2012            2022              2024+
// Vindeby   Horns Rev 1   London Array     Hornsea 2     Haliade-X / SG 14-236
//
// Same underlying shape as FloatingWindTimelineDiagram's milestone timeline —
// an ordered sequence of dated entries laid out left→right — adapted here for
// growing silhouettes above a shared ground/sea line instead of nodes on an
// axis. The interactive unit is a whole turbine (silhouette + dimension line
// + year/capacity/project labels); highlighting one dims its siblings and
// syncs with an HTML legend below. All original SVG geometry — silhouette
// construction, height grid, dimension lines, ground line — is unchanged;
// only the interactivity/styling/mobile layer is added.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.15),
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.80)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

// ── Shared animation / interaction styles ─────────────────────────────────────
function DiagramStyles() {
  return (
    <style>{`
      .rc-panel-enter { opacity: 1; }
      @media (prefers-reduced-motion: no-preference) {
        .rc-panel-enter {
          opacity: 0;
          animation: rc-panel-in 0.55s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: var(--rc-delay, 0s);
        }
      }
      @keyframes rc-panel-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rc-panel-hit { cursor: pointer; transition: opacity 0.18s ease; }
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other variants: below ~768px the diagram has
         shrunk enough that inline SVG label/detail text is no longer
         legible. Hide it and let the legend row (plain HTML, always full
         size) carry the reading. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
      }
    `}</style>
  )
}

// ── Blueprint frame: grid + corner brackets ───────────────────────────────────
function BlueprintFrame({ w, h }: { w: number; h: number }) {
  const b = 14
  return (
    <>
      <defs>
        <pattern id="rcGridTS" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowTS" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridTS)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowTS)" />
      {[
        { x: 10, y: 10, dx: 1, dy: 1 },
        { x: w - 10, y: 10, dx: -1, dy: 1 },
        { x: 10, y: h - 10, dx: 1, dy: -1 },
        { x: w - 10, y: h - 10, dx: -1, dy: -1 },
      ].map((c, i) => (
        <path key={i}
          d={`M${c.x} ${c.y + b * c.dy} L${c.x} ${c.y} L${c.x + b * c.dx} ${c.y}`}
          fill="none" stroke={RC.white18} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </>
  )
}

// ── Turbine data ─────────────────────────────────────────────────────────────
// hubHeight and bladeLength are in metres — we scale proportionally to SVG px.
const TURBINES = [
  {
    index:       1,
    year:        '1991',
    project:     'Vindeby, Denmark',
    capacity:    '450 kW',
    hubHeight:   38,
    bladeLength: 17,
    color:       'rgba(130,188,0,0.45)',
  },
  {
    index:       2,
    year:        '2002',
    project:     'Horns Rev 1, Denmark',
    capacity:    '2 MW',
    hubHeight:   70,
    bladeLength: 39,
    color:       'rgba(130,188,0,0.58)',
  },
  {
    index:       3,
    year:        '2012',
    project:     'London Array, UK',
    capacity:    '3.6 MW',
    hubHeight:   87,
    bladeLength: 52,
    color:       'rgba(130,188,0,0.70)',
  },
  {
    index:       4,
    year:        '2022',
    project:     'Hornsea 2, UK',
    capacity:    '8 MW',
    hubHeight:   102,
    bladeLength: 83,
    color:       'rgba(130,188,0,0.82)',
  },
  {
    index:       5,
    year:        '2024+',
    project:     'GE Haliade-X / SG 14–236',
    capacity:    '14–15 MW',
    hubHeight:   150,
    bladeLength: 108,
    color:       RC.green,
  },
] as const

// ── SVG layout constants ──────────────────────────────────────────────────────
const SVG_W      = 820
const SVG_H      = 490
const GROUND_Y   = 400  // y of ground / sea line
const PX_PER_M   = 1.88  // scale: metres → pixels  (200m = 376px — fits above ground)
const N          = TURBINES.length
const SLOT_W     = SVG_W / N  // width per turbine slot

function TurbineSilhouette({
  cx, groundY, hubHeightM, bladeLengthM, color,
}: {
  cx: number; groundY: number
  hubHeightM: number; bladeLengthM: number; color: string
}) {
  const hubY     = groundY - hubHeightM * PX_PER_M
  const bladeLen = bladeLengthM * PX_PER_M
  const towBot   = groundY
  // Tower width proportional to blade length
  const towW     = Math.max(3, bladeLen * 0.055)

  return (
    <g>
      {/* Tower */}
      <path
        d={`M${cx - towW / 2} ${hubY + 4}
            L${cx - towW / 2 - towW * 0.4} ${towBot}
            L${cx + towW / 2 + towW * 0.4} ${towBot}
            L${cx + towW / 2} ${hubY + 4} Z`}
        fill={color}
        opacity={0.85}
      />
      {/* Blades */}
      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          d={`M${cx} ${hubY}
              L${cx - Math.max(2.5, bladeLen * 0.04)} ${hubY - bladeLen}
              Q${cx} ${hubY - bladeLen - bladeLen * 0.1}
               ${cx + Math.max(2.5, bladeLen * 0.04)} ${hubY - bladeLen} Z`}
          fill={color}
          opacity={0.90}
          transform={`rotate(${deg}, ${cx}, ${hubY})`}
        />
      ))}
      {/* Hub */}
      <circle cx={cx} cy={hubY} r={Math.max(3, bladeLen * 0.04)}
        fill={color} opacity={1} />
    </g>
  )
}

// ── Reference height lines ────────────────────────────────────────────────────
function HeightLine({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <line x1={0} y1={y} x2={SVG_W} y2={y}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 6" />
      <text x={SVG_W - 6} y={y - 3} textAnchor="end"
        fontSize={7.5} fill="rgba(255,255,255,0.28)"
        fontFamily="Montserrat, sans-serif">
        {label}
      </text>
    </g>
  )
}

// ── Main diagram SVG ──────────────────────────────────────────────────────────
function SizeComparisonSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  // Reference heights for grid lines (in metres from ground)
  const gridLines = [50, 100, 150, 200]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      style={{ maxWidth: SVG_W, minWidth: 280 }}
      aria-label="Offshore wind turbine size evolution comparison"
    >
      <BlueprintFrame w={SVG_W} h={SVG_H} />

      {/* ── Reference height grid lines ── */}
      {gridLines.map((m) => (
        <HeightLine key={m} y={GROUND_Y - m * PX_PER_M} label={`${m} m`} />
      ))}

      {/* ── Ground / sea line ── */}
      <rect x={0} y={GROUND_Y} width={SVG_W} height={SVG_H - GROUND_Y}
        fill="rgba(20,50,90,0.40)" />
      <line x1={0} y1={GROUND_Y} x2={SVG_W} y2={GROUND_Y}
        stroke="rgba(100,160,220,0.30)" strokeWidth={1.5} />
      <text x={8} y={GROUND_Y + 14} fontSize={8} fill="rgba(100,160,220,0.45)"
        fontFamily="Montserrat, sans-serif" fontStyle="italic">
        Sea level
      </text>

      {/* ── Turbines: silhouette + dimension line + labels, one interactive unit each ── */}
      {TURBINES.map((t, i) => {
        const cx         = SLOT_W * i + SLOT_W / 2
        const isLast     = i === TURBINES.length - 1
        const tipY       = GROUND_Y - (t.hubHeight + t.bladeLength) * PX_PER_M
        const dimLineX   = cx + SLOT_W * 0.34
        const isActive   = active === t.index
        const isDimmed   = active !== null && !isActive

        return (
          <g
            key={t.index}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${t.year} — ${t.project}`}
            onMouseEnter={() => setActive(t.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(t.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === t.index ? null : t.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${i * 0.07}s` } as React.CSSProperties}>

              <TurbineSilhouette
                cx={cx}
                groundY={GROUND_Y}
                hubHeightM={t.hubHeight}
                bladeLengthM={t.bladeLength}
                color={isActive ? RC.green : t.color}
              />

              {/* Height dimension line (tip-to-ground) */}
              <line x1={dimLineX} y1={tipY} x2={dimLineX} y2={GROUND_Y}
                stroke="rgba(255,255,255,0.14)" strokeWidth={0.8} strokeDasharray="2 4" />
              <line x1={dimLineX - 4} y1={tipY} x2={dimLineX + 4} y2={tipY}
                stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
              <line x1={dimLineX - 4} y1={GROUND_Y} x2={dimLineX + 4} y2={GROUND_Y}
                stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
              <text
                className="rc-panel-label"
                x={dimLineX + 6} y={(tipY + GROUND_Y) / 2 + 3}
                fontSize={7} fill="rgba(255,255,255,0.30)"
                fontFamily="Montserrat, sans-serif">
                {`${t.hubHeight + t.bladeLength}m`}
              </text>

              {/* Year badge */}
              <rect x={cx - 24} y={GROUND_Y + 12} width={48} height={16} rx={8}
                fill={isLast ? RC.greenDim : 'rgba(255,255,255,0.05)'}
                stroke={isLast ? RC.green : 'rgba(255,255,255,0.12)'}
                strokeWidth={1}
              />
              <text
                className="rc-panel-label"
                x={cx} y={GROUND_Y + 23} textAnchor="middle"
                fontSize={8.5} fontWeight="700"
                fontFamily="Montserrat, sans-serif"
                fill={isLast ? RC.green : RC.white65}>
                {t.year}
              </text>

              {/* Capacity */}
              <text
                className="rc-panel-label"
                x={cx} y={GROUND_Y + 44} textAnchor="middle"
                fontSize={10} fontWeight="800"
                fontFamily="Montserrat, sans-serif"
                fill={isLast ? RC.green : RC.white90}>
                {t.capacity}
              </text>

              {/* Project name */}
              <text
                className="rc-panel-label"
                x={cx} y={GROUND_Y + 57} textAnchor="middle"
                fontSize={7} fontWeight="500"
                fontFamily="Montserrat, sans-serif"
                fill={RC.white45}>
                {t.project.split(',')[0]}
              </text>
              <text
                className="rc-panel-label"
                x={cx} y={GROUND_Y + 67} textAnchor="middle"
                fontSize={7} fontWeight="500"
                fontFamily="Montserrat, sans-serif"
                fill={RC.white30}>
                {t.project.split(',').slice(1).join(',').trim()}
              </text>
            </g>
          </g>
        )
      })}

      {/* ── Title annotation ── */}
      <text x={SVG_W / 2} y={18} textAnchor="middle"
        fontSize={8} fontWeight="700" letterSpacing="1.5"
        fontFamily="Montserrat, sans-serif"
        fill="rgba(255,255,255,0.25)">
        TURBINE TIP HEIGHT — APPROXIMATE SCALE
      </text>

      {/* ── Legend: "Today's turbines are now taller than the Eiffel Tower" ── */}
      <rect x={SVG_W / 2 - 130} y={SVG_H - 22} width={260} height={14} rx={7}
        fill="rgba(130,188,0,0.08)" stroke="rgba(130,188,0,0.20)" strokeWidth={1} />
      <text x={SVG_W / 2} y={SVG_H - 12} textAnchor="middle"
        fontSize={7.5} fontWeight="600"
        fontFamily="Montserrat, sans-serif"
        fill="rgba(130,188,0,0.70)">
        Modern 15 MW turbines stand taller than the Eiffel Tower (330 m to tip)
      </text>
    </svg>
  )
}

// ── Legend row ─────────────────────────────────────────────────────────────
function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      {TURBINES.map((t) => {
        const isActive = active === t.index
        return (
          <div
            key={t.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[170px] max-w-[220px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(t.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(t.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${t.year} — ${t.project}`}
            onMouseEnter={() => setActive(t.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(t.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === t.index ? null : t.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(t.color, isActive ? 0.28 : 0.16), border: `1px solid ${t.color}`, color: t.color, fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.index}
            </span>
            <span className="flex flex-col">
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {t.year} · {t.capacity}
              </span>
              <span className="block text-[11px] leading-snug mt-0.5" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                {t.project}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ─────────────────────────────────────────────────────────

export interface TurbineSizeComparisonProps {
  title: string
  caption?: string
}

export function TurbineSizeComparison({ title, caption }: TurbineSizeComparisonProps) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden"
      style={{
        background:     RC.cardBg,
        border:         `1px solid ${RC.cardBorder}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <DiagramStyles />

      {/* Card header */}
      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${RC.cardBorder}` }}
      >
        <h3
          className="font-heading font-bold text-base leading-snug flex-1"
          style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
        >
          {title}
        </h3>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Timeline
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <SizeComparisonSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
