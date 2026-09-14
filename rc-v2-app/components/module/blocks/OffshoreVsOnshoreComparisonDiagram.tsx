// ─────────────────────────────────────────────────────────────────────────────
// OffshoreVsOnshoreComparisonDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Two-panel comparison matrix: Offshore Wind (left) vs Onshore Wind (right)
// Four attributes rated with icon indicators:
//   · Wind Availability   · Locations   · Size   · Community Impact
//
// Green panel = Offshore · Amber panel = Onshore
// Filled icons = higher rating on that attribute
//
// Ported from the earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only) onto the standard v1.2 comparison-panel treatment:
// BlueprintFrame, staggered entrance, whole-panel hover/tap highlight with
// sibling dimming. The four attribute rows used to carry their label,
// sublabel AND icon-rating row as small hand-set SVG text (7–8px in a
// 920-unit canvas) — illegible once the diagram shrinks to fit a phone
// screen, per the live bug report. As with GeothermalPlantTypesDiagram and
// HydropowerTypesDiagram, that text has moved to real HTML detail cards
// below the diagram — always legible at any viewport — while the SVG keeps
// the panel shell and the icon-rating visual (unchanged icon geometry) as a
// glanceable summary. The same icon-rating row is reproduced at readable
// size inside each HTML detail card, reusing the exact same icon components
// rather than redrawing them.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.55),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.55),
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
         the inline SVG panel headers/annotations shrink past legibility.
         Hide them and let the HTML detail cards below carry the reading. */
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
        <pattern id="rcGridOVO" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowOVO" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridOVO)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowOVO)" />
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

// ── Canvas constants (unchanged geometry) ──────────────────────────────────────
const W = 920
const H = 330

const PANEL_W   = 430     // width of each panel
const PANEL_GAP = 60      // gap between panels (divider zone)
const L_X       = 0       // left panel starts here
const R_X       = PANEL_W + PANEL_GAP  // right panel starts here (490)
const ROW_H     = 62      // height of each attribute row
const HEADER_H  = 56      // panel header height
const ROW_Y0    = HEADER_H + 8   // y of first attribute row top

// Icon slot positions within each panel (5 icons, 38px apart, right-aligned)
const ICON_SLOT_SPACING = 38
const ICON_COUNT = 5
const ICON_RIGHT_PAD = 30
function iconSlotX(panelX: number, slotIdx: number): number {
  // Slots go right-to-left from the panel's right edge
  // slot 0 = leftmost icon, slot 4 = rightmost icon
  return panelX + PANEL_W - ICON_RIGHT_PAD - (ICON_COUNT - 1 - slotIdx) * ICON_SLOT_SPACING
}

// ── Icon components (all centered at cx, cy, drawn in 20×20 area) ─────────────
// Geometry unchanged from the original — reused as-is both in the SVG panel
// (small, glanceable) and inside the HTML detail cards below (larger, the
// legible copy of the same rating visualisation).

interface IconProps {
  cx: number
  cy: number
  filled: boolean
  color: string
}

// Wind availability — three sinusoidal wave curves
function WindIcon({ cx, cy, filled, color }: IconProps) {
  const opacity = filled ? 1 : 0.18
  return (
    <g opacity={opacity}>
      <path d={`M ${cx-9},${cy-5} C ${cx-5},${cy-9} ${cx+2},${cy-1} ${cx+9},${cy-5}`}
        stroke={color} fill="none" strokeWidth={1.9} strokeLinecap="round"/>
      <path d={`M ${cx-9},${cy+1} C ${cx-4},${cy-3} ${cx+3},${cy+5} ${cx+9},${cy+1}`}
        stroke={color} fill="none" strokeWidth={1.9} strokeLinecap="round"/>
      <path d={`M ${cx-6},${cy+7} C ${cx-2},${cy+3} ${cx+3},${cy+11} ${cx+8},${cy+7}`}
        stroke={color} fill="none" strokeWidth={1.6} strokeLinecap="round"/>
    </g>
  )
}

// Location — teardrop pin with inner dot
function PinIcon({ cx, cy, filled, color }: IconProps) {
  const opacity = filled ? 1 : 0.18
  return (
    <g opacity={opacity}>
      <path d={`M ${cx},${cy+10} C ${cx},${cy+10} ${cx-8},${cy+3} ${cx-8},${cy-2} A 8,8 0 0,1 ${cx+8},${cy-2} C ${cx+8},${cy+3} ${cx},${cy+10} ${cx},${cy+10} Z`}
        fill={color}/>
      <circle cx={cx} cy={cy-2} r={3} fill="rgba(0,0,0,0.35)"/>
    </g>
  )
}

// Scale — diagonal expand arrows (top-right & bottom-left)
function ScaleIcon({ cx, cy, filled, color }: IconProps) {
  const opacity = filled ? 1 : 0.18
  return (
    <g opacity={opacity} stroke={color} fill="none"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* Bottom-left arrow */}
      <polyline points={`${cx-4},${cy+9} ${cx-9},${cy+9} ${cx-9},${cy+4}`}/>
      <line x1={cx-9} y1={cy+9} x2={cx-2} y2={cy+2}/>
      {/* Top-right arrow */}
      <polyline points={`${cx+4},${cy-9} ${cx+9},${cy-9} ${cx+9},${cy-4}`}/>
      <line x1={cx+9} y1={cy-9} x2={cx+2} y2={cy-2}/>
    </g>
  )
}

// Community — simple house silhouette
function HouseIcon({ cx, cy, filled, color }: IconProps) {
  const opacity = filled ? 1 : 0.18
  return (
    <g opacity={opacity}>
      {/* Walls */}
      <rect x={cx-8} y={cy-2} width={16} height={12} rx={1} fill={color}/>
      {/* Roof */}
      <polygon points={`${cx},${cy-12} ${cx-11},${cy-1} ${cx+11},${cy-1}`} fill={color}/>
      {/* Door */}
      <rect x={cx-3} y={cy+3} width={6} height={7} fill="rgba(0,0,0,0.35)"/>
    </g>
  )
}

// ── Attribute data ────────────────────────────────────────────────────────────
type IconType = 'wind' | 'pin' | 'scale' | 'house'

interface Attribute {
  label:    string
  sublabel: string
  icon:     IconType
  offshore: number   // 1–5 (filled count)
  onshore:  number
}

const ATTRIBUTES: Attribute[] = [
  {
    label:    'WIND AVAILABILITY',
    sublabel: 'strength & consistency',
    icon:     'wind',
    offshore: 5,
    onshore:  2,
  },
  {
    label:    'LOCATIONS',
    sublabel: 'site options & land use',
    icon:     'pin',
    offshore: 2,
    onshore:  5,
  },
  {
    label:    'SIZE',
    sublabel: 'typical turbine capacity',
    icon:     'scale',
    offshore: 5,
    onshore:  3,
  },
  {
    label:    'COMMUNITY IMPACT',
    sublabel: 'visual / noise proximity',
    icon:     'house',
    offshore: 1,
    onshore:  4,
  },
]

function renderIcon(type: IconType, cx: number, cy: number, filled: boolean, color: string) {
  switch (type) {
    case 'wind':  return <WindIcon  key={`${cx}-${cy}`} cx={cx} cy={cy} filled={filled} color={color}/>
    case 'pin':   return <PinIcon   key={`${cx}-${cy}`} cx={cx} cy={cy} filled={filled} color={color}/>
    case 'scale': return <ScaleIcon key={`${cx}-${cy}`} cx={cx} cy={cy} filled={filled} color={color}/>
    case 'house': return <HouseIcon key={`${cx}-${cy}`} cx={cx} cy={cy} filled={filled} color={color}/>
  }
}

// Small (16×16) standalone copy of one rating icon, for the HTML detail
// cards — same icon components, same geometry, just their own tiny viewBox.
function RatingIcon({ type, filled, color }: { type: IconType; filled: boolean; color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 20 20" aria-hidden="true">
      {renderIcon(type, 10, 10, filled, color)}
    </svg>
  )
}

// ── Side data — single source of truth for the SVG panels and the HTML detail cards ──
interface SideData {
  key:      'offshore' | 'onshore'
  index:    number
  title:    string
  subtitle: string
  color:    string
  dimColor: string
  midColor: string
  ratingOf: (a: Attribute) => number
}

const SIDES: SideData[] = [
  {
    key: 'offshore', index: 1,
    title: 'OFFSHORE WIND',
    subtitle: 'deep water · higher wind speeds · larger turbines',
    color: RC.green, dimColor: RC.greenDim, midColor: RC.greenMid,
    ratingOf: (a) => a.offshore,
  },
  {
    key: 'onshore', index: 2,
    title: 'ONSHORE WIND',
    subtitle: 'land-based · more locations · closer to communities',
    color: RC.amber, dimColor: RC.amberDim, midColor: RC.amberMid,
    ratingOf: (a) => a.onshore,
  },
]

// ── One panel ─────────────────────────────────────────────────────────────────
interface PanelProps {
  side:       SideData
  panelX:     number
  isActive:   boolean
  isDimmed:   boolean
  setActive:  (key: SideData['key'] | null) => void
}

function Panel({ side, panelX, isActive, isDimmed, setActive }: PanelProps) {
  const { title, subtitle, color, dimColor } = side
  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${title}`}
      onMouseEnter={() => setActive(side.key)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(side.key)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(isActive ? null : side.key)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${side.index * 0.08}s` } as React.CSSProperties}>
        {/* Panel background */}
        <rect x={panelX} y={0} width={PANEL_W} height={H}
          rx={8} fill={dimColor}/>

        {/* Panel header */}
        <rect x={panelX} y={0} width={PANEL_W} height={HEADER_H}
          rx={8} fill={`${color}22`}/>
        {/* Bottom edge of header not rounded */}
        <rect x={panelX} y={HEADER_H - 8} width={PANEL_W} height={8} fill={`${color}22`}/>
        <line x1={panelX} y1={HEADER_H} x2={panelX + PANEL_W} y2={HEADER_H}
          stroke={`${color}30`} strokeWidth={1}/>

        {/* Active highlight wash */}
        <rect x={panelX} y={0} width={PANEL_W} height={H} rx={8}
          fill={color} opacity={isActive ? 0.05 : 0}/>

        <text x={panelX + PANEL_W / 2} y={24}
          textAnchor="middle" fontSize={12} fontWeight="800" letterSpacing="1.5"
          fontFamily="Montserrat, sans-serif" fill={color}>
          {title}
        </text>
        <text className="rc-panel-label" x={panelX + PANEL_W / 2} y={42}
          textAnchor="middle" fontSize={8} fontWeight="500" letterSpacing="0.8"
          fontFamily="Montserrat, sans-serif" fill={RC.white45}>
          {subtitle}
        </text>

        {/* Attribute rows — icon-rating strip only; label/sublabel live in the
            HTML detail card below, where they stay legible at any viewport */}
        {ATTRIBUTES.map((attr, rowIdx) => {
          const rowY = ROW_Y0 + rowIdx * ROW_H
          const rowMidY = rowY + ROW_H / 2
          const rating = side.ratingOf(attr)

          return (
            <g key={attr.label}>
              {/* Row separator */}
              {rowIdx > 0 && (
                <line x1={panelX + 16} y1={rowY} x2={panelX + PANEL_W - 16} y2={rowY}
                  stroke={RC.white08} strokeWidth={1}/>
              )}

              {/* Icon slots */}
              {Array.from({ length: ICON_COUNT }, (_, slotIdx) => {
                const iconX = iconSlotX(panelX, slotIdx)
                return renderIcon(attr.icon, iconX, rowMidY + 2, slotIdx < rating, color)
              })}
            </g>
          )
        })}
      </g>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function ComparisonSVG({ active, setActive }: { active: SideData['key'] | null; setActive: (k: SideData['key'] | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 320 }}
      aria-label="Offshore vs onshore wind comparison diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* Offshore panel */}
      <Panel
        side={SIDES[0]}
        panelX={L_X}
        isActive={active === 'offshore'}
        isDimmed={active !== null && active !== 'offshore'}
        setActive={setActive}
      />

      {/* Onshore panel */}
      <Panel
        side={SIDES[1]}
        panelX={R_X}
        isActive={active === 'onshore'}
        isDimmed={active !== null && active !== 'onshore'}
        setActive={setActive}
      />

      {/* Centre divider */}
      <line
        x1={W / 2} y1={20}
        x2={W / 2} y2={H - 20}
        stroke={RC.white10} strokeWidth={1} strokeDasharray="4 6"
      />
      <text x={W / 2} y={H / 2 + 5}
        textAnchor="middle" fontSize={8} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.white20}
        transform={`rotate(-90, ${W/2}, ${H/2})`}
      >
        VS
      </text>
    </svg>
  )
}

// ── Detail cards — attribute label, sublabel and the same icon-rating row,
//    reproduced at a size that stays legible on a phone screen ─────────────────
function DetailCards({ active, setActive }: { active: SideData['key'] | null; setActive: (k: SideData['key'] | null) => void }) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
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
              {ATTRIBUTES.map((attr) => {
                const rating = side.ratingOf(attr)
                return (
                  <div key={attr.label} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[10px] font-bold tracking-wide" style={{ color: RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                        {attr.label}
                      </span>
                      <span className="block text-[10px]" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                        {attr.sublabel}
                      </span>
                    </span>
                    <span className="flex-shrink-0 flex items-center gap-0.5" aria-label={`${rating} out of ${ICON_COUNT}`}>
                      {Array.from({ length: ICON_COUNT }, (_, slotIdx) => (
                        <RatingIcon key={slotIdx} type={attr.icon} filled={slotIdx < rating} color={side.color} />
                      ))}
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

// ── Public component ──────────────────────────────────────────────────────────

export interface OffshoreVsOnshoreComparisonDiagramProps {
  title:    string
  caption?: string
}

export function OffshoreVsOnshoreComparisonDiagram({ title, caption }: OffshoreVsOnshoreComparisonDiagramProps) {
  const [active, setActive] = useState<SideData['key'] | null>(null)

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
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a panel below to highlight offshore or onshore across all four attributes
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <ComparisonSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards — label, sublabel and rating icons, always legible */}
      <DetailCards active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: 'rgba(255,255,255,0.30)' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
