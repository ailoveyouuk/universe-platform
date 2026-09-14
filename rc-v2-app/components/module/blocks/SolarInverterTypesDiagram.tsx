// ─────────────────────────────────────────────────────────────────────────────
// SolarInverterTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// 2×2 card grid comparing the four main solar inverter architectures:
//   String Inverter | Micro Inverters
//   Hybrid Inverter | Off-Grid Inverter
//
// Each card shows an architecture schematic (panels → inverter → grid/battery)
// plus the type's name and key stat. Following the SolarPanelTypesDiagram
// precedent (same solar family, already on v1.2), the dense specs — use
// case, advantage, limitation — have moved to real HTML `.rc-detail-card`s
// below the diagram: always legible at any viewport, synced to the same
// hover/tap highlight as the SVG card. The small in-schematic captions
// ("String (series)", "AC bus", "Storage", "No grid required") stay in the
// SVG as `.rc-panel-label`s and are hidden on mobile along with them, since
// the card name already carries the identity at that size.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.40),
  greenBright: rcRgba(brand.green, 0.70),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  amberBright: rcRgba(brand.amber, 0.70),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.12),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white65:     'rgba(255,255,255,0.65)',
  white50:     'rgba(255,255,255,0.50)',
  white45:     'rgba(255,255,255,0.45)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white18:     'rgba(255,255,255,0.18)',
  white10:     'rgba(255,255,255,0.10)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.80)',
  cardBorder:  'rgba(255,255,255,0.08)',
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
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Below ~768px the diagram has shrunk enough that the small in-schematic
         captions are no longer legible. Hide them; the card name/key stat
         stay, and the detail cards below (plain HTML, always full-size)
         carry the use-case / advantage / limitation reading. */
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
        <pattern id="rcGridSI" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowSI" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridSI)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowSI)" />
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

// ── Canvas constants ──────────────────────────────────────────────────────────
const W       = 920
const H       = 348
const CARD_W  = 416
const CARD_H  = 132
const CARD_RX = 10
const H_GAP   = 16
const V_GAP   = 16
const START_X = (W - (2 * CARD_W + H_GAP)) / 2 // 36
const START_Y = 44

function cardPos(col: number, row: number): [number, number] {
  return [
    START_X + col * (CARD_W + H_GAP),
    START_Y + row * (CARD_H + V_GAP),
  ]
}

// ── Shared drawing helpers ────────────────────────────────────────────────────

function SolarPanel({ x, y, w = 18, h = 22, color }: {
  x: number; y: number; w?: number; h?: number; color: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1}
        fill={color} fillOpacity={0.25} stroke={color} strokeOpacity={0.6} strokeWidth={0.8}/>
      {/* Cell lines */}
      <line x1={x+w/2} y1={y} x2={x+w/2} y2={y+h} stroke={color} strokeOpacity={0.3} strokeWidth={0.5}/>
      <line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke={color} strokeOpacity={0.3} strokeWidth={0.5}/>
    </g>
  )
}

function InverterBox({ x, y, w = 28, h = 22, label, color }: {
  x: number; y: number; w?: number; h?: number; label: string; color: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={color} fillOpacity={0.20} stroke={color} strokeOpacity={0.7} strokeWidth={1.2}/>
      <text x={x+w/2} y={y+h/2+4}
        textAnchor="middle" fontSize={7} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}>
        {label}
      </text>
    </g>
  )
}

function BatteryBox({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={26} height={18} rx={3}
        fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.6} strokeWidth={1}/>
      {/* Battery cap */}
      <rect x={x+10} y={y-3} width={6} height={3} rx={1}
        fill={color} fillOpacity={0.40}/>
      <text x={x+13} y={y+12}
        textAnchor="middle" fontSize={7} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}>
        BAT
      </text>
    </g>
  )
}

function GridSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={26} height={18} rx={3}
        fill={color} fillOpacity={0.12} stroke={color} strokeOpacity={0.5} strokeWidth={1}/>
      {/* Grid hash */}
      <line x1={x+5} y1={y+4} x2={x+21} y2={y+4} stroke={color} strokeOpacity={0.5} strokeWidth={0.8}/>
      <line x1={x+5} y1={y+9} x2={x+21} y2={y+9} stroke={color} strokeOpacity={0.5} strokeWidth={0.8}/>
      <line x1={x+5} y1={y+14} x2={x+21} y2={y+14} stroke={color} strokeOpacity={0.5} strokeWidth={0.8}/>
      <line x1={x+9} y1={y+2} x2={x+9} y2={y+16} stroke={color} strokeOpacity={0.5} strokeWidth={0.8}/>
      <line x1={x+17} y1={y+2} x2={x+17} y2={y+16} stroke={color} strokeOpacity={0.5} strokeWidth={0.8}/>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color }: {
  x1: number; y1: number; x2: number; y2: number; color: string
}) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx*dx + dy*dy)
  const ux = dx/len, uy = dy/len
  const ax = x2 - ux*7, ay = y2 - uy*7
  return (
    <g>
      <line x1={x1} y1={y1} x2={ax} y2={ay}
        stroke={color} strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round"/>
      <polygon
        points={`${x2},${y2} ${ax-uy*3},${ay+ux*3} ${ax+uy*3},${ay-ux*3}`}
        fill={color} fillOpacity={0.55}/>
    </g>
  )
}

// ── Architecture Schematics ───────────────────────────────────────────────────

// 1. String Inverter: 3 panels in series → 1 central inverter → grid
function StringSchematic({ x, y, color }: { x: number; y: number; color: string }) {
  const panelY = y + 8
  const invY   = y + 2
  const gridY  = y + 4

  return (
    <g>
      {/* 3 panels in series */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <SolarPanel x={x + i * 28} y={panelY} color={color}/>
          {i < 2 && (
            <line x1={x + i*28 + 18} y1={panelY + 11}
                  x2={x + (i+1)*28}   y2={panelY + 11}
              stroke={color} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="3 2"/>
          )}
        </g>
      ))}
      {/* Series label */}
      <text className="rc-panel-label" x={x+27} y={panelY+30}
        textAnchor="middle" fontSize={6.5}
        fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.35)">
        String (series)
      </text>
      {/* Arrow to inverter */}
      <Arrow x1={x+88} y1={panelY+11} x2={x+104} y2={invY+11} color={color}/>
      {/* Central inverter */}
      <InverterBox x={x+104} y={invY} label="INV" color={color}/>
      {/* Arrow to grid */}
      <Arrow x1={x+132} y1={invY+11} x2={x+148} y2={gridY+9} color={color}/>
      {/* Grid */}
      <GridSymbol x={x+148} y={gridY} color={color}/>
    </g>
  )
}

// 2. Micro Inverters: each panel has its own micro-inverter → AC bus → grid
function MicroSchematic({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      {[0, 1, 2].map(i => (
        <g key={i}>
          <SolarPanel x={x + i*36} y={y} color={color}/>
          {/* Micro-inverter under each panel */}
          <rect x={x + i*36 + 2} y={y+24} width={14} height={9} rx={2}
            fill={color} fillOpacity={0.28} stroke={color} strokeOpacity={0.6} strokeWidth={0.8}/>
          <text x={x + i*36 + 9} y={y+31}
            textAnchor="middle" fontSize={5.5} fontWeight="700"
            fontFamily="Montserrat, sans-serif" fill={color}>μINV</text>
          {/* Down arrow panel → micro-inv */}
          <Arrow x1={x+i*36+9} y1={y+22} x2={x+i*36+9} y2={y+24} color={color}/>
          {/* Right arrow micro-inv → AC bus */}
          {i < 2 && (
            <line x1={x+i*36+16} y1={y+28} x2={x+(i+1)*36} y2={y+28}
              stroke={color} strokeOpacity={0.35} strokeWidth={1}/>
          )}
        </g>
      ))}
      {/* AC bus label */}
      <text className="rc-panel-label" x={x+54} y={y+42}
        textAnchor="middle" fontSize={6.5}
        fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.35)">
        AC bus
      </text>
      {/* Arrow AC bus → grid */}
      <Arrow x1={x+108} y1={y+28} x2={x+124} y2={y+12} color={color}/>
      <GridSymbol x={x+124} y={y} color={color}/>
    </g>
  )
}

// 3. Hybrid Inverter: panels → hybrid inv ↔ battery + grid
function HybridSchematic({ x, y, color }: { x: number; y: number; color: string }) {
  const midY = y + 12
  return (
    <g>
      {/* 2 panels */}
      {[0, 1].map(i => (
        <SolarPanel key={i} x={x + i*28} y={y} color={color}/>
      ))}
      <line x1={x+18} y1={y+11} x2={x+28} y2={y+11}
        stroke={color} strokeOpacity={0.40} strokeWidth={1} strokeDasharray="3 2"/>
      {/* Arrow → hybrid inverter */}
      <Arrow x1={x+64} y1={y+11} x2={x+80} y2={midY} color={color}/>
      {/* Hybrid inverter */}
      <InverterBox x={x+80} y={midY-5} w={34} h={24} label="HYBRID" color={color}/>
      {/* Arrow to battery (down) */}
      <Arrow x1={x+97} y1={midY+19} x2={x+97} y2={midY+34} color={color}/>
      <BatteryBox x={x+84} y={midY+34} color={color}/>
      {/* Arrow to grid (right) */}
      <Arrow x1={x+114} y1={midY+7} x2={x+138} y2={y+4} color={color}/>
      <GridSymbol x={x+138} y={y} color={color}/>
    </g>
  )
}

// 4. Off-Grid: panels → charge controller → battery → off-grid inv → loads
function OffGridSchematic({ x, y, color }: { x: number; y: number; color: string }) {
  const midY = y + 10
  return (
    <g>
      {/* 2 panels */}
      {[0, 1].map(i => (
        <SolarPanel key={i} x={x + i*26} y={y} color={color}/>
      ))}
      <line x1={x+18} y1={y+11} x2={x+26} y2={y+11}
        stroke={color} strokeOpacity={0.40} strokeWidth={1} strokeDasharray="3 2"/>
      {/* Arrow → charge controller */}
      <Arrow x1={x+60} y1={y+11} x2={x+74} y2={midY+2} color={color}/>
      <InverterBox x={x+74} y={midY-3} w={28} h={18} label="CTRL" color={color}/>
      {/* Arrow → battery */}
      <Arrow x1={x+102} y1={midY+6} x2={x+116} y2={midY+6} color={color}/>
      <BatteryBox x={x+116} y={midY-3} color={color}/>
      {/* Arrow → off-grid inverter */}
      <Arrow x1={x+142} y1={midY+6} x2={x+156} y2={midY+6} color={color}/>
      <InverterBox x={x+156} y={midY-3} w={26} h={18} label="INV" color={color}/>
      {/* House loads arrow */}
      <Arrow x1={x+182} y1={midY+6} x2={x+196} y2={midY+6} color={color}/>
      {/* House icon */}
      <g stroke={color} strokeOpacity={0.6} fill="none">
        <rect x={x+196} y={midY+1} width={18} height={14} rx={1}
          fill={color} fillOpacity={0.15} strokeWidth={1}/>
        <polygon points={`${x+196},${midY+1} ${x+205},${midY-6} ${x+214},${midY+1}`}
          fill={color} fillOpacity={0.20} strokeWidth={1}/>
      </g>
      {/* No grid label */}
      <text className="rc-panel-label" x={x+205} y={y+50}
        textAnchor="middle" fontSize={6.5}
        fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.35)">
        No grid required
      </text>
    </g>
  )
}

// ── Inverter type data ────────────────────────────────────────────────────────
interface InverterType {
  name:       string
  keyStat:    string
  use:        string
  advantage:  string
  limitation: string
  color:      string
  dimColor:   string
  Schematic:  React.ComponentType<{ x: number; y: number; color: string }>
}

const INVERTERS: InverterType[] = [
  {
    name:       'String Inverter',
    keyStat:    'Most cost-effective',
    use:        'Residential & commercial — unshaded, uniform arrays',
    advantage:  'Low upfront cost, simple design, proven reliability',
    limitation: 'Whole string limited by worst-performing panel',
    color:      RC.green,
    dimColor:   RC.greenDim,
    Schematic:  StringSchematic,
  },
  {
    name:       'Micro Inverters',
    keyStat:    'Panel-level optimisation',
    use:        'Complex rooftops — shading, mixed orientations',
    advantage:  'Panel-level monitoring, best yield in shaded conditions',
    limitation: 'Higher upfront cost per watt',
    color:      RC.blue,
    dimColor:   RC.blueDim,
    Schematic:  MicroSchematic,
  },
  {
    name:       'Hybrid Inverter',
    keyStat:    'Solar + storage + grid',
    use:        'Homes & businesses with battery storage',
    advantage:  'Manages solar, battery and grid in one unit',
    limitation: 'Higher cost; battery adds complexity',
    color:      RC.amber,
    dimColor:   RC.amberDim,
    Schematic:  HybridSchematic,
  },
  {
    name:       'Off-Grid Inverter',
    keyStat:    'Grid-independent',
    use:        'Remote locations, island systems, mini-grids',
    advantage:  'Complete energy independence from national grid',
    limitation: 'Requires correctly sized battery bank',
    color:      RC.teal,
    dimColor:   RC.tealDim,
    Schematic:  OffGridSchematic,
  },
]

// ── Card ──────────────────────────────────────────────────────────────────────
function InverterCard({ inv, col, row, index, active, setActive }: {
  inv: InverterType; col: number; row: number; index: number
  active: number | null; setActive: (n: number | null) => void
}) {
  const [cx, cy] = cardPos(col, row)
  const { color, dimColor, Schematic } = inv
  const isActive = active === index
  const isDimmed = active !== null && !isActive

  const schemX = cx + 20
  const schemY = cy + 50

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${inv.name}`}
      onMouseEnter={() => setActive(index)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(index)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === index ? null : index)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${index * 0.10}s` } as React.CSSProperties}>
        {/* Card background */}
        <rect x={cx} y={cy} width={CARD_W} height={CARD_H} rx={CARD_RX}
          fill={dimColor} stroke={isActive ? color : `${color}35`} strokeWidth={isActive ? 1.8 : 1}/>

        {/* Top colour accent */}
        <rect x={cx} y={cy} width={CARD_W} height={4} rx={CARD_RX/2}
          fill={color} fillOpacity={0.70}/>

        {/* Type name */}
        <text x={cx+18} y={cy+26}
          fontSize={12} fontWeight="800"
          fontFamily="Montserrat, sans-serif" fill={color}>
          {inv.name}
        </text>

        {/* Key stat pill */}
        <rect x={cx+CARD_W-18-inv.keyStat.length*5.5} y={cy+14}
          width={inv.keyStat.length*5.5+12} height={16} rx={8}
          fill={color} fillOpacity={0.18}/>
        <text x={cx+CARD_W-12} y={cy+25}
          textAnchor="end" fontSize={7.5} fontWeight="700"
          fontFamily="Montserrat, sans-serif" fill={color}>
          {inv.keyStat}
        </text>

        {/* Divider */}
        <line x1={cx+18} y1={cy+36} x2={cx+CARD_W-18} y2={cy+36}
          stroke={`${color}20`} strokeWidth={1}/>

        {/* Architecture schematic */}
        <Schematic x={schemX} y={schemY} color={color}/>
      </g>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function InverterTypesSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="Solar inverter types comparison: string, micro, hybrid, and off-grid"
    >
      <BlueprintFrame w={W} h={H} />

      <text x={W/2} y={28} textAnchor="middle" fontSize={9} fontWeight="800" letterSpacing="1.5"
        fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.35)">
        SOLAR INVERTER ARCHITECTURE TYPES
      </text>

      {INVERTERS.map((inv, i) => (
        <InverterCard
          key={inv.name}
          inv={inv}
          col={i % 2}
          row={Math.floor(i / 2)}
          index={i}
          active={active}
          setActive={setActive}
        />
      ))}
    </svg>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface SolarInverterTypesDiagramProps {
  title:    string
  caption?: string
}

export function SolarInverterTypesDiagram({ title, caption }: SolarInverterTypesDiagramProps) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden w-full"
      style={{
        background:     RC.cardBg,
        border:         `1px solid ${RC.cardBorder}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <DiagramStyles />

      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${RC.cardBorder}` }}
      >
        <div>
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Four inverter architectures compared — tap a type to see full specs
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <InverterTypesSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards — use case, advantage and limitation per type, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {INVERTERS.map((inv, i) => {
          const isActive = active === i
          return (
            <div
              key={inv.name}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(inv.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(inv.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${inv.name}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: rcRgba(inv.color, isActive ? 0.28 : 0.16), border: `1px solid ${inv.color}`, color: inv.color, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {inv.name}
                </span>
              </div>

              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: inv.color, opacity: 0.85 }}>Use case</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>{inv.use}</dd>
                </div>
              </dl>

              <div className="mt-2.5">
                <p className="text-[9px] font-extrabold tracking-wide" style={{ color: inv.color, fontFamily: "'Montserrat', sans-serif" }}>
                  ✓ ADVANTAGE
                </p>
                <p className="text-[11px] leading-snug mt-1" style={{ color: RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                  {inv.advantage}
                </p>
              </div>

              <div className="mt-2.5">
                <p className="text-[9px] font-extrabold tracking-wide" style={{ color: 'rgba(255,100,100,0.70)', fontFamily: "'Montserrat', sans-serif" }}>
                  ✕ LIMITATION
                </p>
                <p className="text-[11px] leading-snug mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                  {inv.limitation}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35 }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
