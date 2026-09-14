'use client'

// ─────────────────────────────────────────────────────────────────────────────
// HydrogenVsEVDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// FCEV vs BEV comparison infographic: 8 attribute rows scored across two
// columns (hydrogen fuel cell vehicles vs battery electric vehicles).
//
// Ported from the earlier "Mauna Loa Design Language" pass (card shell +
// RC tokens only) onto the standard v1.2 comparison-panel treatment:
// BlueprintFrame, staggered entrance, whole-column hover/tap/focus
// highlight with sibling dimming. The per-row value + note text used to be
// hand-set SVG text as small as 8px in an 860-unit canvas — illegible once
// the diagram shrinks to fit a phone screen. As with GeothermalPlantTypesDiagram
// and OffshoreVsOnshoreComparisonDiagram, that text has moved to real HTML
// detail cards below the diagram — always legible at any viewport — while
// the SVG keeps the table shell, car silhouettes and rating-dot row as a
// glanceable summary. All original geometry (table layout, car silhouettes,
// rating dots) is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

const RC = {
  green:      brand.green,
  blue:       brand.blue,
  amber:      brand.amber,
  bgDark:     '#0f172a',
  bgMid:      '#1e293b',
  bgPanel:    '#162032',
  text:       '#e2e8f0',
  textMuted:  '#94a3b8',
  fcev:       brand.blue,   // hydrogen = blue
  bev:        brand.green,  // BEV = green
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white20:    'rgba(255,255,255,0.20)',
  white10:    'rgba(255,255,255,0.10)',
  white08:    'rgba(255,255,255,0.08)',
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
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the inline SVG per-row value/note text shrinks past legibility.
         Hide it and let the HTML detail cards below carry the reading. */
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
        <pattern id="rcGridHE" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowHE" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridHE)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowHE)" />
      {[
        { x: 10, y: 10, dx: 1, dy: 1 },
        { x: w - 10, y: 10, dx: -1, dy: 1 },
        { x: 10, y: h - 10, dx: 1, dy: -1 },
        { x: w - 10, y: h - 10, dx: -1, dy: -1 },
      ].map((c, i) => (
        <path key={i}
          d={`M${c.x} ${c.y + b * c.dy} L${c.x} ${c.y} L${c.x + b * c.dx} ${c.y}`}
          fill="none" stroke={RC.white20} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </>
  )
}

// ── Comparison data ───────────────────────────────────────────────────────────

interface CompItem {
  category: string
  fcev: { value: string; note?: string; rating: 1 | 2 | 3 }  // 1=poor, 2=mid, 3=good
  bev:  { value: string; note?: string; rating: 1 | 2 | 3 }
  icon: string
}

const COMPARISONS: CompItem[] = [
  {
    category: 'Refuel / Recharge Time',
    icon: '⚡',
    fcev: { value: '3–5 min', note: 'at H₂ pump', rating: 3 },
    bev:  { value: '20–60 min', note: 'fast charge (80%)', rating: 2 },
  },
  {
    category: 'Range',
    icon: '🗺️',
    fcev: { value: '500–700 km', note: 'typical FCEV', rating: 3 },
    bev:  { value: '300–600 km', note: 'typical BEV', rating: 2 },
  },
  {
    category: 'Energy Efficiency',
    icon: '📊',
    fcev: { value: '~25–35%', note: 'well-to-wheel', rating: 1 },
    bev:  { value: '~70–85%', note: 'well-to-wheel', rating: 3 },
  },
  {
    category: 'Fuel Infrastructure',
    icon: '🏗️',
    fcev: { value: 'Very limited', note: '< 1,000 stations globally', rating: 1 },
    bev:  { value: 'Growing rapidly', note: '2M+ charge points globally', rating: 3 },
  },
  {
    category: 'Cold Weather Performance',
    icon: '❄️',
    fcev: { value: 'Good', note: 'less range loss in cold', rating: 3 },
    bev:  { value: 'Reduced', note: '10–30% range loss', rating: 2 },
  },
  {
    category: 'Heavy Transport Suitability',
    icon: '🚛',
    fcev: { value: 'Excellent', note: 'trucks, buses, ships', rating: 3 },
    bev:  { value: 'Moderate', note: 'limited by battery weight', rating: 2 },
  },
  {
    category: 'Fuel Cost',
    icon: '💰',
    fcev: { value: 'High today', note: 'dropping with scale', rating: 1 },
    bev:  { value: 'Low–moderate', note: 'depends on electricity price', rating: 3 },
  },
  {
    category: 'Carbon Emissions (green fuel)',
    icon: '🌱',
    fcev: { value: 'Zero tailpipe', note: 'requires green H₂', rating: 2 },
    bev:  { value: 'Zero tailpipe', note: 'depends on grid mix', rating: 2 },
  },
]

// ── Rating bar ────────────────────────────────────────────────────────────────

function RatingDots({ rating, color }: { rating: 1 | 2 | 3; color: string }) {
  return (
    <g>
      {[1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={(i - 1) * 10}
          cy={0}
          r={4}
          fill={i <= rating ? color : '#2a3a4a'}
          stroke={color}
          strokeWidth={1}
          opacity={0.9}
        />
      ))}
    </g>
  )
}

// Standalone small copy of the rating dots, sized for the HTML detail cards.
function RatingDotsHTML({ rating, color }: { rating: 1 | 2 | 3; color: string }) {
  return (
    <svg width={34} height={12} viewBox="-12 -6 34 12" aria-hidden="true">
      <RatingDots rating={rating} color={color} />
    </svg>
  )
}

// ── Vehicle silhouette (simple) ───────────────────────────────────────────────

function CarSilhouette({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Body */}
      <rect x={0} y={14} width={70} height={24} rx={4} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      {/* Roof */}
      <path d="M 12 14 Q 16 4 25 2 L 46 2 Q 55 2 60 14 Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />
      {/* Windows */}
      <path d="M 15 14 Q 18 7 25 5 L 44 5 Q 52 5 56 14 Z" fill={color} fillOpacity={0.15} />
      {/* Wheels */}
      <circle cx={16} cy={38} r={8} fill={RC.bgMid} stroke={color} strokeWidth={2} />
      <circle cx={54} cy={38} r={8} fill={RC.bgMid} stroke={color} strokeWidth={2} />
      <circle cx={16} cy={38} r={3} fill={color} opacity={0.5} />
      <circle cx={54} cy={38} r={3} fill={color} opacity={0.5} />
      {/* Label */}
      <text x={35} y={60} textAnchor="middle" fill={color} fontSize={11} fontWeight="700" fontFamily="sans-serif">{label}</text>
    </g>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

interface RowProps {
  item: CompItem
  y: number
  rowH: number
  colW: number
  labelW: number
  pad: number
  hovered: boolean
  onHover: () => void
  onLeave: () => void
  fcevDimmed: boolean
  bevDimmed: boolean
}

function CompRow({ item, y, rowH, colW, labelW, pad, hovered, onHover, onLeave, fcevDimmed, bevDimmed }: RowProps) {
  const midX = pad + labelW + colW
  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ cursor: 'default' }}
    >
      {/* Row background */}
      <rect x={pad - 4} y={y + 2} width={labelW + colW * 2 + 8} height={rowH - 4} rx={3}
        fill={hovered ? RC.bgMid : 'transparent'}
        style={{ transition: 'fill 0.1s' }}
      />

      {/* Category icon + label */}
      <text x={pad} y={y + rowH / 2 + 4} fill={hovered ? RC.text : RC.textMuted}
        fontSize={11} fontFamily="sans-serif">
        {item.icon}
      </text>
      <text x={pad + 22} y={y + rowH / 2 + 4} fill={hovered ? RC.text : RC.textMuted}
        fontSize={10} fontFamily="sans-serif" className="rc-panel-label">
        {item.category}
      </text>

      {/* FCEV cell */}
      <g style={{ opacity: fcevDimmed ? 0.32 : 1, transition: 'opacity 0.18s ease' }}>
        <text x={pad + labelW + colW * 0.5} y={y + rowH / 2 - 3} textAnchor="middle"
          className="rc-panel-label"
          fill={RC.fcev} fontSize={11} fontWeight="600" fontFamily="sans-serif">
          {item.fcev.value}
        </text>
        {item.fcev.note && (
          <text x={pad + labelW + colW * 0.5} y={y + rowH / 2 + 10} textAnchor="middle"
            className="rc-panel-label"
            fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic">
            {item.fcev.note}
          </text>
        )}
        {/* FCEV rating dots */}
        <g transform={`translate(${pad + labelW + colW * 0.5 - 10}, ${y + rowH - 16})`}>
          <RatingDots rating={item.fcev.rating} color={RC.fcev} />
        </g>
      </g>

      {/* Divider */}
      <line x1={midX} y1={y + 6} x2={midX} y2={y + rowH - 6} stroke="#2a3a4a" strokeWidth={1} />

      {/* BEV cell */}
      <g style={{ opacity: bevDimmed ? 0.32 : 1, transition: 'opacity 0.18s ease' }}>
        <text x={pad + labelW + colW * 1.5} y={y + rowH / 2 - 3} textAnchor="middle"
          className="rc-panel-label"
          fill={RC.bev} fontSize={11} fontWeight="600" fontFamily="sans-serif">
          {item.bev.value}
        </text>
        {item.bev.note && (
          <text x={pad + labelW + colW * 1.5} y={y + rowH / 2 + 10} textAnchor="middle"
            className="rc-panel-label"
            fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic">
            {item.bev.note}
          </text>
        )}
        {/* BEV rating dots */}
        <g transform={`translate(${pad + labelW + colW * 1.5 - 10}, ${y + rowH - 16})`}>
          <RatingDots rating={item.bev.rating} color={RC.bev} />
        </g>
      </g>

      {/* Separator line */}
      <line x1={pad - 4} y1={y + rowH} x2={pad + labelW + colW * 2 + 4} y2={y + rowH}
        stroke="#1e2a3a" strokeWidth={1} />
    </g>
  )
}

// ── Detail cards — full value + note text, always legible ─────────────────────

interface SideMeta {
  key:   'fcev' | 'bev'
  index: number
  title: string
  color: string
}

const SIDES: SideMeta[] = [
  { key: 'fcev', index: 1, title: 'Fuel Cell Electric Vehicle', color: RC.fcev },
  { key: 'bev',  index: 2, title: 'Battery Electric Vehicle',   color: RC.bev },
]

function DetailCards({ active, setActive }: { active: SideMeta['key'] | null; setActive: (k: SideMeta['key'] | null) => void }) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
    >
      {SIDES.map((side) => {
        const isActive = active === side.key
        return (
          <div
            key={side.key}
            className="rc-detail-card rounded-lg p-3"
            style={{
              background: isActive ? rcRgba(side.color, 0.10) : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? rcRgba(side.color, 0.45) : RC.cardBorder}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${side.title}`}
            onMouseEnter={() => setActive(side.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(side.key)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(isActive ? null : side.key)}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: rcRgba(side.color, isActive ? 0.28 : 0.16), border: `1px solid ${side.color}`, color: side.color, fontFamily: "'Montserrat', sans-serif" }}
              >
                {String(side.index).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold tracking-wide" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {side.title}
              </span>
            </div>

            <div className="space-y-2">
              {COMPARISONS.map((item) => {
                const cell = side.key === 'fcev' ? item.fcev : item.bev
                return (
                  <div key={item.category} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[10px] font-bold tracking-wide" style={{ color: RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                        {item.icon} {item.category}
                      </span>
                      <span className="block text-[10px]" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                        {cell.value}{cell.note ? ` · ${cell.note}` : ''}
                      </span>
                    </span>
                    <span className="flex-shrink-0">
                      <RatingDotsHTML rating={cell.rating} color={side.color} />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function HydrogenVsEVDiagram() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [active, setActive] = useState<SideMeta['key'] | null>(null)

  const fcevDimmed = active === 'bev'
  const bevDimmed = active === 'fcev'

  const W = 860
  const H = 560
  const pad = 24
  const labelW = 200
  const colW = 195
  const headerH = 130
  const rowH = 52
  const tableY = headerH + pad

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

      {/* Card header */}
      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${RC.cardBorder}` }}
      >
        <div>
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            Hydrogen Fuel Cell Vehicles vs Battery Electric Vehicles
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a column below to highlight FCEV or BEV across all eight categories
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: rcRgba(RC.fcev, 0.16), color: RC.fcev, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', maxWidth: W, minWidth: 320, background: RC.bgDark, borderRadius: 8 }}
          aria-label="FCEV vs BEV comparison diagram"
        >
          <rect width={W} height={H} fill={RC.bgDark} rx={8} />
          <BlueprintFrame w={W} h={H} />

          {/* Title */}
          <g className="rc-panel-enter" style={{ '--rc-delay': '0s' } as React.CSSProperties}>
            <text x={W / 2} y={30} textAnchor="middle" fill={RC.text} fontSize={15} fontWeight="700" fontFamily="sans-serif">
              Hydrogen Fuel Cell Vehicles vs Battery Electric Vehicles
            </text>
          </g>

          {/* FCEV header (car silhouette + subtitle) — whole-column hit target */}
          <g
            className="rc-panel-hit rc-panel-enter"
            style={{ opacity: fcevDimmed ? 0.32 : 1, '--rc-delay': '0.08s' } as React.CSSProperties}
            tabIndex={0}
            role="button"
            aria-label="Highlight Fuel Cell Electric Vehicle column"
            onMouseEnter={() => setActive('fcev')}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive('fcev')}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === 'fcev' ? null : 'fcev')}
          >
            <CarSilhouette x={pad + labelW + colW / 2 - 35} y={44} color={RC.fcev} label="FCEV" />
            <text className="rc-panel-label" x={pad + labelW + colW * 0.5} y={38} textAnchor="middle"
              fill={RC.fcev} fontSize={11} fontWeight="600" fontFamily="sans-serif">
              Fuel Cell Electric Vehicle
            </text>
          </g>

          {/* BEV header (car silhouette + subtitle) — whole-column hit target */}
          <g
            className="rc-panel-hit rc-panel-enter"
            style={{ opacity: bevDimmed ? 0.32 : 1, '--rc-delay': '0.16s' } as React.CSSProperties}
            tabIndex={0}
            role="button"
            aria-label="Highlight Battery Electric Vehicle column"
            onMouseEnter={() => setActive('bev')}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive('bev')}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === 'bev' ? null : 'bev')}
          >
            <CarSilhouette x={pad + labelW + colW * 1.5 - 35} y={44} color={RC.bev} label="BEV" />
            <text className="rc-panel-label" x={pad + labelW + colW * 1.5} y={38} textAnchor="middle"
              fill={RC.bev} fontSize={11} fontWeight="600" fontFamily="sans-serif">
              Battery Electric Vehicle
            </text>
          </g>

          {/* Column header divider */}
          <line x1={pad - 4} y1={tableY - 6} x2={pad + labelW + colW * 2 + 4} y2={tableY - 6}
            stroke="#2a3a4a" strokeWidth={1.5} />

          {/* Comparison rows */}
          <g className="rc-panel-enter" style={{ '--rc-delay': '0.24s' } as React.CSSProperties}>
            {COMPARISONS.map((item, i) => (
              <CompRow
                key={item.category}
                item={item}
                y={tableY + i * rowH}
                rowH={rowH}
                colW={colW}
                labelW={labelW}
                pad={pad}
                hovered={hoveredRow === i}
                onHover={() => setHoveredRow(i)}
                onLeave={() => setHoveredRow(null)}
                fcevDimmed={fcevDimmed}
                bevDimmed={bevDimmed}
              />
            ))}
          </g>

          {/* Rating legend */}
          <g
            className="rc-panel-label rc-panel-enter"
            style={{ '--rc-delay': '0.32s' } as React.CSSProperties}
            transform={`translate(${pad}, ${tableY + COMPARISONS.length * rowH + 14})`}
          >
            <text x={0} y={10} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif">Rating: </text>
            {[{ r: 1 as const, l: 'Disadvantage' }, { r: 2 as const, l: 'Moderate' }, { r: 3 as const, l: 'Advantage' }].map(({ r, l }, i) => (
              <g key={r} transform={`translate(${58 + i * 120}, 2)`}>
                <RatingDots rating={r} color={RC.textMuted} />
                <text x={36} y={8} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif">{l}</text>
              </g>
            ))}
            <text x={W - pad * 2 - 4} y={10} textAnchor="end" fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic">
              Hover rows to highlight
            </text>
          </g>

          {/* Bottom note */}
          <text x={W / 2} y={H - 8} textAnchor="middle" fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic" className="rc-panel-label">
            Ratings are relative and context-dependent. Both technologies have important roles in the clean energy transition.
          </text>
        </svg>
      </div>

      {/* Detail cards — full value + note text, always legible */}
      <DetailCards active={active} setActive={setActive} />
    </figure>
  )
}
