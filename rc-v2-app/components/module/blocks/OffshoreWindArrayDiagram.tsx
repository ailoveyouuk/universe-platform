// ─────────────────────────────────────────────────────────────────────────────
// OffshoreWindArrayDiagram — RC Diagram Design Language v1.2 (process-flow variant)
// Shows the full offshore wind array system:
//   Turbines → Array Cables → Offshore Substation → Export Cable →
//   Onshore Substation → Transmission Pylon → National Grid
//
// Adapts the "process-flow" shape (see GridIntegrationDiagram for the
// horizontal reference build) to a geographic offshore/onshore cross-section
// rather than a row of evenly-spaced stage boxes: the original illustration
// geometry (sea/seabed bands, cable routing, substation and pylon shapes) is
// preserved unchanged, and six sequential stages become the interactive
// units — Wind Turbines, Array Cables, Offshore Substation, Export Cable,
// Onshore Substation, and Transmission/Grid — each dimming its siblings on
// hover/focus/tap, with a synced HTML legend and the same mobile-legibility
// fix (inline SVG labels hidden ≤767px; the legend carries the reading).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  amber:      brand.amber,
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
      /* Same mobile fix as the other process-flow diagrams: below ~768px the
         inline SVG labels are no longer legible. Hide them and let the
         legend row (plain HTML, always full size) carry the reading. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
      }
    `}</style>
  )
}

// ── Blueprint frame: dot-grid + glow + corner brackets ─────────────────────────
function BlueprintFrame({ w, h }: { w: number; h: number }) {
  const b = 14
  return (
    <>
      <defs>
        <pattern id="rcGridOA" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowOA" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridOA)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowOA)" />
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

// ── Turbine sub-component (draws one turbine at a given position) ─────────────
function Turbine({
  cx, hubY, towerBottom,
  bladeLen = 72,
}: {
  cx: number
  hubY: number
  towerBottom: number
  bladeLen?: number
}) {
  const towW = 5
  return (
    <g>
      {/* Tower */}
      <line
        x1={cx} y1={hubY + 6} x2={cx} y2={towerBottom}
        stroke="rgba(180,200,220,0.75)" strokeWidth={towW} strokeLinecap="round"
      />
      {/* Blades — 3 × rotated around hub */}
      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          d={`M${cx} ${hubY} L${cx - 4} ${hubY - bladeLen} Q${cx} ${hubY - bladeLen - 10} ${cx + 4} ${hubY - bladeLen} Z`}
          fill={RC.green}
          opacity={0.9}
          transform={`rotate(${deg}, ${cx}, ${hubY})`}
        />
      ))}
      {/* Hub */}
      <circle cx={cx} cy={hubY} r={7} fill={RC.green} />
    </g>
  )
}

// ── Substation box ─────────────────────────────────────────────────────────────
function SubstationBox({
  x, y, w, h, label1, label2, color,
}: {
  x: number; y: number; w: number; h: number
  label1: string; label2: string; color: string
}) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={4}
        fill={`${color}22`} stroke={color} strokeWidth={1.5}
      />
      {/* Substation symbol: transformer circles */}
      <circle cx={x + w / 2 - 7} cy={y + h / 2 - 4} r={8}
        fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
      <circle cx={x + w / 2 + 7} cy={y + h / 2 - 4} r={8}
        fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
      <text
        className="rc-panel-label"
        x={x + w / 2} y={y + h - 12}
        textAnchor="middle" fontSize={7.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}
      >
        {label1}
      </text>
      <text
        className="rc-panel-label"
        x={x + w / 2} y={y + h - 3}
        textAnchor="middle" fontSize={7.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}
      >
        {label2}
      </text>
    </g>
  )
}

// ── Transmission Pylon ─────────────────────────────────────────────────────────
function Pylon({ x, topY, baseY }: { x: number; topY: number; baseY: number }) {
  const h = baseY - topY
  const c = RC.white45
  return (
    <g>
      {/* Central mast */}
      <line x1={x} y1={topY} x2={x} y2={baseY} stroke={c} strokeWidth={2} />
      {/* Cross-arm top */}
      <line x1={x - 22} y1={topY + h * 0.15} x2={x + 22} y2={topY + h * 0.15}
        stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      {/* Cross-arm mid */}
      <line x1={x - 16} y1={topY + h * 0.35} x2={x + 16} y2={topY + h * 0.35}
        stroke={c} strokeWidth={2} strokeLinecap="round" />
      {/* Diagonal struts */}
      <line x1={x} y1={topY} x2={x - 22} y2={topY + h * 0.15} stroke={c} strokeWidth={1.2} opacity={0.7} />
      <line x1={x} y1={topY} x2={x + 22} y2={topY + h * 0.15} stroke={c} strokeWidth={1.2} opacity={0.7} />
      <line x1={x - 22} y1={topY + h * 0.15} x2={x - 10} y2={baseY}
        stroke={c} strokeWidth={1.5} />
      <line x1={x + 22} y1={topY + h * 0.15} x2={x + 10} y2={baseY}
        stroke={c} strokeWidth={1.5} />
      {/* Base */}
      <line x1={x - 10} y1={baseY} x2={x + 10} y2={baseY}
        stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      {/* Catenary wires from pylon to "grid" edge */}
      <path
        d={`M${x - 22} ${topY + h * 0.15} Q${x - 22 + 30} ${topY + h * 0.22} ${x + 22 + 50} ${topY + h * 0.15}`}
        stroke={c} strokeWidth={1} fill="none" strokeDasharray="3 3" opacity={0.6}
      />
    </g>
  )
}

// ── Label with leader line ─────────────────────────────────────────────────────
function Label({
  x, y, text, align = 'middle', color,
}: {
  x: number; y: number; text: string; align?: 'start' | 'middle' | 'end'; color?: string
}) {
  return (
    <text
      className="rc-panel-label"
      x={x} y={y}
      textAnchor={align}
      fontSize={9} fontWeight="600"
      fontFamily="Montserrat, sans-serif"
      fill={color ?? RC.white65}
    >
      {text}
    </text>
  )
}

// ── Single source of truth for every stage ─────────────────────────────────────
interface StageData {
  index: number
  label: string
  detail: string
  color: string
}

const STAGE_DATA: StageData[] = [
  { index: 1, label: 'Wind Turbines',       detail: 'Generate AC at medium voltage',              color: RC.green },
  { index: 2, label: 'Array Cables',        detail: 'Subsea, link turbines to the OSS',           color: RC.amber },
  { index: 3, label: 'Offshore Substation', detail: 'Steps voltage up for export',                color: RC.amber },
  { index: 4, label: 'Export Cable',        detail: 'HVAC/HVDC, subsea to shore',                 color: RC.green },
  { index: 5, label: 'Onshore Substation',  detail: 'Steps voltage down to grid level',           color: RC.green },
  { index: 6, label: 'Transmission & Grid', detail: 'Pylons carry power to the national grid',    color: RC.white45 },
]

// ── Main diagram SVG ───────────────────────────────────────────────────────────
function ArrayDiagramSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  // Layout constants
  const SHORE_X   = 548
  const WATER_Y   = 290
  const SEABED_Y  = 332
  const OSS_X     = 435   // offshore substation left edge
  const OSS_Y     = 215
  const OSS_W     = 68
  const OSS_H     = 70
  const ONS_X     = 594   // onshore substation left edge
  const ONS_Y     = 220
  const ONS_W     = 68
  const ONS_H     = 65
  const PYLON_X   = 760

  // Turbine positions
  const turbines = [
    { cx: 78,  hubY: 130, bladeLen: 68 },
    { cx: 215, hubY: 118, bladeLen: 75 },
    { cx: 360, hubY: 125, bladeLen: 70 },
  ]

  const opacityFor = (i: number) => (active !== null && active !== i ? 0.32 : 1)
  const delayFor = (i: number) => `${i * 0.08}s`

  const hitProps = (i: number, label: string) => ({
    className: 'rc-panel-hit',
    style: { opacity: opacityFor(i) },
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': `Highlight ${label}`,
    onMouseEnter: () => setActive(i),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(i),
    onBlur: () => setActive(null),
    onClick: () => setActive(active === i ? null : i),
  })

  return (
    <svg
      viewBox="0 0 860 390"
      width="100%"
      style={{ maxWidth: 860, minWidth: 280 }}
      aria-label="Offshore wind array schematic"
    >
      <BlueprintFrame w={860} h={390} />

      {/* ── Backgrounds ── */}
      <rect x={0}       y={0} width={SHORE_X}       height={390} fill="rgba(12,40,80,0.55)" />
      <rect x={SHORE_X} y={0} width={860 - SHORE_X} height={390} fill="rgba(25,55,20,0.45)" />

      {/* Sea surface (translucent overlay) */}
      <rect x={0} y={WATER_Y} width={SHORE_X} height={390 - WATER_Y}
        fill="rgba(10,35,75,0.50)" />

      {/* Seabed */}
      <rect x={0} y={SEABED_Y} width={SHORE_X} height={390 - SEABED_Y}
        fill="rgba(90,75,45,0.60)" />

      {/* Shore divider */}
      <line x1={SHORE_X} y1={0} x2={SHORE_X} y2={390}
        stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} strokeDasharray="5 4" />

      {/* Water surface line */}
      <line x1={0} y1={WATER_Y} x2={SHORE_X} y2={WATER_Y}
        stroke="rgba(100,160,220,0.35)" strokeWidth={1} strokeDasharray="4 6" />

      {/* ── Section Labels ── */}
      <text className="rc-panel-label" x={14} y={22} fontSize={8} fontWeight="700" fill="rgba(100,160,220,0.75)"
        fontFamily="Montserrat, sans-serif" letterSpacing="1">OFFSHORE</text>
      <text className="rc-panel-label" x={SHORE_X + 10} y={22} fontSize={8} fontWeight="700" fill="rgba(130,188,0,0.75)"
        fontFamily="Montserrat, sans-serif" letterSpacing="1">ONSHORE</text>

      {/* ── Stage 1: Wind Turbines ── */}
      <g {...hitProps(1, 'Wind Turbines')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(1) } as React.CSSProperties}>
          {turbines.map((t, i) => (
            <Turbine key={i} cx={t.cx} hubY={t.hubY} towerBottom={SEABED_Y} bladeLen={t.bladeLen} />
          ))}
          <Label x={turbines[1].cx} y={58} text="Wind Turbines" align="middle" color={RC.white65} />
          <line x1={turbines[0].cx} y1={64} x2={turbines[0].cx} y2={70}
            stroke={RC.white30} strokeWidth={0.8} />
          <line x1={turbines[2].cx} y1={64} x2={turbines[2].cx} y2={73}
            stroke={RC.white30} strokeWidth={0.8} />
        </g>
      </g>

      {/* ── Stage 2: Array cables (along seabed, dashed amber) ── */}
      <g {...hitProps(2, 'Array Cables')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(2) } as React.CSSProperties}>
          {turbines.map((t, i) => (
            <path
              key={i}
              d={`M${t.cx} ${SEABED_Y + 4} Q${(t.cx + OSS_X + OSS_W / 2) / 2} ${SEABED_Y + 10} ${OSS_X + OSS_W / 2} ${SEABED_Y + 4}`}
              stroke={RC.amber} strokeWidth={2.5} strokeDasharray="6 4"
              fill="none" opacity={0.75}
            />
          ))}
          <text className="rc-panel-label" x={245} y={SEABED_Y + 22} textAnchor="middle"
            fontSize={8} fontWeight="600" fill={`${RC.amber}bb`}
            fontFamily="Montserrat, sans-serif">
            Array cable (subsea)
          </text>
        </g>
      </g>

      {/* ── Stage 3: Offshore Substation ── */}
      <g {...hitProps(3, 'Offshore Substation')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(3) } as React.CSSProperties}>
          {/* OSS legs to seabed */}
          <line x1={OSS_X + 10} y1={OSS_Y + OSS_H} x2={OSS_X + 10} y2={SEABED_Y}
            stroke={RC.amber} strokeWidth={2.5} opacity={0.55} />
          <line x1={OSS_X + OSS_W - 10} y1={OSS_Y + OSS_H} x2={OSS_X + OSS_W - 10} y2={SEABED_Y}
            stroke={RC.amber} strokeWidth={2.5} opacity={0.55} />
          <SubstationBox
            x={OSS_X} y={OSS_Y} w={OSS_W} h={OSS_H}
            label1="OFFSHORE" label2="SUBSTATION"
            color={RC.amber}
          />
        </g>
      </g>

      {/* ── Stage 4: Export cable — OSS → shore → onshore sub ── */}
      <g {...hitProps(4, 'Export Cable')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(4) } as React.CSSProperties}>
          {/* Subsea section */}
          <path
            d={`M${OSS_X + OSS_W / 2} ${SEABED_Y + 4} L${SHORE_X} ${SEABED_Y + 4}`}
            stroke={RC.green} strokeWidth={3} strokeDasharray="8 5"
            fill="none" opacity={0.85}
          />
          {/* Shore-to-onshore section (above ground) */}
          <path
            d={`M${SHORE_X} ${SEABED_Y + 4} L${SHORE_X} ${ONS_Y + ONS_H / 2} L${ONS_X} ${ONS_Y + ONS_H / 2}`}
            stroke={RC.green} strokeWidth={3} strokeDasharray="8 5"
            fill="none" opacity={0.85}
          />
          <text className="rc-panel-label" x={(OSS_X + OSS_W / 2 + SHORE_X) / 2} y={SEABED_Y + 18}
            textAnchor="middle" fontSize={7.5} fontWeight="600" fill={`${RC.green}bb`}
            fontFamily="Montserrat, sans-serif">
            Export cable (HVAC/HVDC)
          </text>
        </g>
      </g>

      {/* ── Stage 5: Onshore Substation ── */}
      <g {...hitProps(5, 'Onshore Substation')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(5) } as React.CSSProperties}>
          <SubstationBox
            x={ONS_X} y={ONS_Y} w={ONS_W} h={ONS_H}
            label1="ONSHORE" label2="SUBSTATION"
            color={RC.green}
          />
        </g>
      </g>

      {/* ── Stage 6: Transmission line, pylon & National Grid ── */}
      <g {...hitProps(6, 'Transmission & Grid')}>
        <g className="rc-panel-enter" style={{ '--rc-delay': delayFor(6) } as React.CSSProperties}>
          <line
            x1={ONS_X + ONS_W} y1={ONS_Y + ONS_H / 2}
            x2={PYLON_X - 12} y2={230}
            stroke={RC.white45} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.7}
          />
          <Pylon x={PYLON_X} topY={180} baseY={310} />
          <rect x={796} y={195} width={56} height={30} rx={5}
            fill={RC.greenDim} stroke={`${RC.green}55`} strokeWidth={1} />
          <text className="rc-panel-label" x={824} y={208} textAnchor="middle"
            fontSize={7} fontWeight="700" fill={RC.green}
            fontFamily="Montserrat, sans-serif">
            NATIONAL
          </text>
          <text className="rc-panel-label" x={824} y={220} textAnchor="middle"
            fontSize={7} fontWeight="700" fill={RC.green}
            fontFamily="Montserrat, sans-serif">
            GRID
          </text>
          {/* Wire to grid box */}
          <line x1={PYLON_X + 22} y1={210} x2={796} y2={210}
            stroke={RC.white45} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
          <text className="rc-panel-label" x={PYLON_X} y={325} textAnchor="middle" fontSize={8} fontWeight="600"
            fill={RC.white45} fontFamily="Montserrat, sans-serif">Transmission</text>
        </g>
      </g>

      {/* Water depth labels (non-interactive, static annotations) */}
      <text className="rc-panel-label" x={14} y={WATER_Y + 18} fontSize={8} fill="rgba(120,160,200,0.65)"
        fontFamily="Montserrat, sans-serif" fontStyle="italic">Sea level</text>
      <text className="rc-panel-label" x={14} y={SEABED_Y - 4} fontSize={8} fill="rgba(160,130,80,0.65)"
        fontFamily="Montserrat, sans-serif" fontStyle="italic">Seabed</text>
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
      {STAGE_DATA.map((s) => {
        const isActive = active === s.index
        return (
          <div
            key={s.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[170px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(s.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(s.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${s.label}`}
            onMouseEnter={() => setActive(s.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === s.index ? null : s.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(s.color, isActive ? 0.28 : 0.16), border: `1px solid ${s.color}`, color: s.color, fontFamily: "'Montserrat', sans-serif" }}
            >
              {s.index}
            </span>
            <span className="flex flex-col">
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {s.label}
              </span>
              <span className="block text-[11px]" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                {s.detail}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ─────────────────────────────────────────────────────────

export interface OffshoreWindArrayDiagramProps {
  title: string
  caption?: string
}

export function OffshoreWindArrayDiagram({ title, caption }: OffshoreWindArrayDiagramProps) {
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
          RC Diagram · 01–06
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <ArrayDiagramSVG active={active} setActive={setActive} />
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
