// ─────────────────────────────────────────────────────────────────────────────
// NuclearWasteClassificationDiagram — RC Diagram Design Language v1.2 (comparison-panel variant, dense)
//
// Three-column card comparison showing nuclear waste classification:
//   LLW (Low-Level) | ILW (Intermediate-Level) | HLW (High-Level)
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// panels, staggered entrance, hover/tap/focus highlight with sibling-dimming.
// Each class keeps the header band + abbreviation badge + volume/radioactivity
// stat bars in the SVG (these are graphics, not prose — they read fine at any
// size). The characteristic-heavy content (typical examples, disposal route,
// decay note) used to be tiny hand-wrapped SVG text at the bottom of each
// card — the same mobile-legibility problem as the other dense comparison
// diagrams (Geothermal/Hydropower/OffshoreVsOnshore/Mooring/SubseaCable).
// It now lives in real HTML `.rc-detail-card`s below the diagram: always
// legible at any viewport, synced to the same hover/tap highlight as the
// SVG panel.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.40),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.40),
  blue:       '#4A90D9',
  blueDim:    'rgba(74,144,217,0.12)',
  blueMid:    'rgba(74,144,217,0.40)',
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white15:    'rgba(255,255,255,0.15)',
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
         the inline SVG per-card stat labels/values shrink past legibility.
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
        <pattern id="rcGridNW" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowNW" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridNW)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowNW)" />
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
const W        = 920
const H        = 380
const CARD_W   = 268
const CARD_H   = 330
const CARD_RX  = 8
const CARD_GAP = 24
const TOTAL_W  = CARD_W * 3 + CARD_GAP * 2  // 268*3 + 24*2 = 852
const LEFT_PAD = (W - TOTAL_W) / 2           // 34

function cardX(col: number): number {
  return LEFT_PAD + col * (CARD_W + CARD_GAP)
}

const CARD_TOP = (H - CARD_H) / 2   // vertical centering

// ── Waste class data ──────────────────────────────────────────────────────────
interface WasteClass {
  num:        number
  abbr:       string
  name:       string
  color:      string
  dimColor:   string
  midColor:   string
  volume:     number    // % of total volume
  volumeLabel:string
  activity:   number    // % of total radioactivity
  activityLabel:string
  examples:   string[]
  disposal:   string
  decayNote:  string
}

const WASTE_CLASSES: WasteClass[] = [
  {
    num:           1,
    abbr:          'LLW',
    name:          'Low-Level Waste',
    color:         RC.green,
    dimColor:      RC.greenDim,
    midColor:      RC.greenMid,
    volume:        90,
    volumeLabel:   '~90%',
    activity:      1,
    activityLabel: '<1%',
    examples:      ['Protective clothing', 'Contaminated tools', 'Filters & resins', 'Lab equipment'],
    disposal:      'Near-surface repositories',
    decayNote:     'Low radioactivity; safe in < 300 years',
  },
  {
    num:           2,
    abbr:          'ILW',
    name:          'Intermediate-Level',
    color:         RC.amber,
    dimColor:      RC.amberDim,
    midColor:      RC.amberMid,
    volume:        7,
    volumeLabel:   '~7%',
    activity:      4,
    activityLabel: '~4%',
    examples:      ['Metal reactor components', 'Cladding & filters', 'Sludges & slurries', 'Decommissioning debris'],
    disposal:      'Engineered repositories',
    decayNote:     'Requires shielding; hazardous for centuries',
  },
  {
    num:           3,
    abbr:          'HLW',
    name:          'High-Level Waste',
    color:         RC.blue,
    dimColor:      RC.blueDim,
    midColor:      RC.blueMid,
    volume:        3,
    volumeLabel:   '~3%',
    activity:      95,
    activityLabel: '~95%',
    examples:      ['Spent nuclear fuel rods', 'Vitrified waste glass', 'Reprocessing residues'],
    disposal:      'Deep geological repository',
    decayNote:     'Generates heat; hazardous for 100,000+ years',
  },
]

// ── Mini stat bar (label + filled rect) ──────────────────────────────────────
function StatBar({
  x, y, label, pct, maxPct = 100, barW = 220, barH = 10, color, dimColor,
}: {
  x: number; y: number; label: string; pct: number; maxPct?: number
  barW?: number; barH?: number; color: string; dimColor: string
}) {
  const filled = (pct / maxPct) * barW
  return (
    <g>
      <text className="rc-panel-label" x={x} y={y - 3} fontSize={7.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.white45}>
        {label}
      </text>
      {/* Track */}
      <rect x={x} y={y} width={barW} height={barH} rx={barH / 2} fill={dimColor}/>
      {/* Fill */}
      <rect x={x} y={y} width={Math.max(filled, barH)} height={barH} rx={4.5} fill={color} opacity={0.75}/>
    </g>
  )
}

// ── Single waste class card ───────────────────────────────────────────────────
function WasteCard({ col, wc, isActive }: { col: number; wc: WasteClass; isActive: boolean }) {
  const cx   = cardX(col)
  const ct   = CARD_TOP
  const midX = cx + CARD_W / 2
  const BAR_W = CARD_W - 40
  const BAR_X = cx + 20

  // y positions inside the card
  const headerTop  = ct
  const headerBot  = ct + 62
  const statY1     = headerBot + 22     // volume bar y
  const statY2     = statY1 + 36        // activity bar y

  return (
    <g>
      {/* Card background */}
      <rect x={cx} y={ct} width={CARD_W} height={CARD_H} rx={CARD_RX}
        fill={wc.dimColor} stroke={isActive ? wc.color : `${wc.color}35`} strokeWidth={isActive ? 1.8 : 1.2}/>

      {/* Coloured header band */}
      <rect x={cx} y={headerTop} width={CARD_W} height={headerBot - headerTop} rx={CARD_RX}
        fill={wc.dimColor} stroke="none"/>
      {/* Clip the bottom of the header rect so rounded corners only at top */}
      <rect x={cx} y={headerTop + (CARD_RX as number)} width={CARD_W} height={headerBot - headerTop - CARD_RX}
        fill={wc.dimColor} stroke="none"/>

      {/* Header top rule */}
      <rect x={cx} y={headerTop} width={CARD_W} height={3} rx={2} fill={wc.color} opacity={0.7}/>

      {/* Abbreviation badge */}
      <rect x={midX - 22} y={headerTop + 12} width={44} height={22} rx={5}
        fill={wc.midColor} opacity={isActive ? 0.85 : 0.6}/>
      <text x={midX} y={headerTop + 28}
        textAnchor="middle" fontSize={11} fontWeight="900"
        fontFamily="Montserrat, sans-serif" fill={wc.color}>
        {wc.abbr}
      </text>

      {/* Full class name */}
      <text className="rc-panel-label" x={midX} y={headerTop + 48}
        textAnchor="middle" fontSize={8.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : RC.white65}>
        {wc.name}
      </text>

      {/* Divider below header */}
      <line x1={cx + 12} y1={headerBot} x2={cx + CARD_W - 12} y2={headerBot}
        stroke={`${wc.color}25`} strokeWidth={1}/>

      {/* Volume stat bar */}
      <text className="rc-panel-label" x={BAR_X} y={statY1 - 3} fontSize={7.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.white45}>
        Share of total volume
      </text>
      <text className="rc-panel-label" x={BAR_X + BAR_W} y={statY1 - 3} textAnchor="end"
        fontSize={9} fontWeight="900"
        fontFamily="Montserrat, sans-serif" fill={wc.color}>
        {wc.volumeLabel}
      </text>
      <rect x={BAR_X} y={statY1} width={BAR_W} height={9} rx={4.5} fill={wc.dimColor}/>
      <rect x={BAR_X} y={statY1} width={Math.max((wc.volume / 100) * BAR_W, 9)} height={9}
        rx={4.5} fill={wc.color} opacity={0.75}/>

      {/* Radioactivity stat bar */}
      <text className="rc-panel-label" x={BAR_X} y={statY2 - 3} fontSize={7.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.white45}>
        Share of total radioactivity
      </text>
      <text className="rc-panel-label" x={BAR_X + BAR_W} y={statY2 - 3} textAnchor="end"
        fontSize={9} fontWeight="900"
        fontFamily="Montserrat, sans-serif" fill={wc.color}>
        {wc.activityLabel}
      </text>
      <rect x={BAR_X} y={statY2} width={BAR_W} height={9} rx={4.5} fill={wc.dimColor}/>
      <rect x={BAR_X} y={statY2} width={Math.max((wc.activity / 100) * BAR_W, 9)} height={9}
        rx={4.5} fill={wc.color} opacity={0.75}/>

      {/* Number badge, bottom-right of card — echoes the family's numbered-panel convention */}
      <circle cx={cx + CARD_W - 20} cy={ct + CARD_H - 20} r={11}
        fill={wc.color} fillOpacity={isActive ? 0.30 : 0.16} stroke={wc.color} strokeOpacity={0.60} strokeWidth={1}/>
      <text x={cx + CARD_W - 20} y={ct + CARD_H - 17}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={wc.color}>
        {String(wc.num).padStart(2, '0')}
      </text>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function WasteClassSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="Nuclear waste classification: LLW, ILW, HLW comparison"
    >
      <BlueprintFrame w={W} h={H} />

      {WASTE_CLASSES.map((wc, i) => {
        const isActive = active === wc.num
        const isDimmed = active !== null && !isActive
        return (
          <g
            key={i}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${wc.name}`}
            onMouseEnter={() => setActive(wc.num)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(wc.num)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === wc.num ? null : wc.num)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${wc.num * 0.10}s` } as React.CSSProperties}>
              <WasteCard col={i} wc={wc} isActive={isActive} />
            </g>
          </g>
        )
      })}
    </svg>
  )
}

// ── Detail cards — examples / disposal / decay characteristics, always legible ─
function DetailCards({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
    >
      {WASTE_CLASSES.map((wc) => {
        const isActive = active === wc.num
        return (
          <div
            key={wc.num}
            className="rc-detail-card rounded-lg p-3"
            style={{
              background: isActive ? rcRgba(wc.color, 0.10) : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? rcRgba(wc.color, 0.45) : RC.cardBorder}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${wc.name}`}
            onMouseEnter={() => setActive(wc.num)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(wc.num)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === wc.num ? null : wc.num)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: rcRgba(wc.color, isActive ? 0.28 : 0.16), border: `1px solid ${wc.color}`, color: wc.color, fontFamily: "'Montserrat', sans-serif" }}
              >
                {String(wc.num).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {wc.abbr} · {wc.name}
              </span>
            </div>
            <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {[
                { lbl: 'Typical examples', val: wc.examples.join(', ') },
                { lbl: 'Disposal route',   val: wc.disposal },
                { lbl: 'Decay characteristic', val: wc.decayNote },
              ].map((row) => (
                <div key={row.lbl}>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: wc.color, opacity: 0.85 }}>{row.lbl}</dt>
                  <dd className="mt-0.5" style={{ color: RC.white65 }}>{row.val}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface NuclearWasteClassificationDiagramProps {
  title:    string
  caption?: string
}

export function NuclearWasteClassificationDiagram({ title, caption }: NuclearWasteClassificationDiagramProps) {
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
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <WasteClassSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards */}
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

      {/* Source note */}
      <p style={{
        color:      RC.white30,
        fontSize:   10,
        margin:     0,
        padding:    '10px 24px',
        textAlign:  'center',
        fontFamily: "'Montserrat', sans-serif",
        borderTop:  `1px solid ${RC.cardBorder}`,
      }}>
        Volume and radioactivity percentages are approximate global averages. Source: IAEA Waste Classification System (2009, rev. 2018)
      </p>
    </figure>
  )
}
