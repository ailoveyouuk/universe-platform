// @rc/theme — single source of truth for brand tokens, shared across
// rc-v2-app, rc-employer, rc-institution, and rc-admin.
//
// Why this exists: the RC green (#82BC00) and the Montserrat/Inter font
// pairing were hardcoded independently in all four apps' tailwind.config.ts
// files, and the diagram/chart accent palette (green/amber/blue/teal/red)
// was hardcoded independently in ~44 SVG diagram components in rc-v2-app.
// Centralising them here meant a future white-label deployment (a client
// wanting their own branding) could be a change in ONE file, not 44+.
//
// That future arrived: this package is now multi-brand. Which brand's
// colors/fonts/identity get exported as `brand`/`fonts`/`identity` below is
// selected at BUILD time (this is a static-export architecture — there's
// no server to resolve per-request) via NEXT_PUBLIC_BRAND, defaulting to
// 'renewables-connect'. No app's build workflow sets this today, so every
// existing deploy is completely unaffected — this file's default-path
// output is byte-identical to what it was before the refactor.
//
// Adding a new client brand: add one file under brands/ that satisfies
// BrandTokens (see types.ts), register it in the BRANDS map below. Nothing
// else changes — every consumer (44+ diagram components, four apps'
// tailwind configs) keeps importing `brand`/`fonts`/`RC` exactly as
// before; only which brand pack those resolve to varies.
//
// Deliberately NOT brand-scoped: the diagram/chart accent palette below
// (amber/blue/teal/red/cyan/orange, and the whole RC token object built
// from it) is illustrative/pedagogical — data-viz colors, not corporate
// identity — so it stays fixed across every brand. Only the primary accent
// (buttons/links/active-states) and typography vary per brand.
//
// This package has no build step — consumers import the TS source directly
// (each app's next.config already sets transpilePackages), same pattern as
// @rc/types and @rc/api-client.

import type { BrandTokens } from './types'
import { renewablesConnect } from './brands/renewables-connect'
import { octopusEnergy } from './brands/octopus-energy'

export type { BrandColors, BrandFonts, BrandIdentity, BrandTokens } from './types'

const BRANDS: Record<string, BrandTokens> = {
  'renewables-connect': renewablesConnect,
  'octopus-energy': octopusEnergy,
}

const DEFAULT_BRAND_ID = 'renewables-connect'

function resolveBrandId(): string {
  const requested = process.env.NEXT_PUBLIC_BRAND
  if (requested && BRANDS[requested]) return requested
  return DEFAULT_BRAND_ID
}

export const activeBrandId = resolveBrandId()
const activeBrand = BRANDS[activeBrandId]

/** Non-visual brand identity (display name, logo assets, contact
 *  overrides). Nothing in the app reads this yet — no component has been
 *  wired to render a client logo or swap the support email — it exists so
 *  that work has real, correct data to consume once it starts. */
export const identity = activeBrand.identity

/** Convert a "#rrggbb" hex string to an "r,g,b" triplet for rgba() strings. */
function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

/** Build an rgba() string from a base hex color and an alpha (0-1). */
export function rcRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriplet(hex)},${alpha})`
}

// ── Brand base colors ────────────────────────────────────────────────────
// `green`/`greenShades` resolve to the active brand's primary accent — the
// names are historical (RC's primary happens to be green) and kept as-is
// so none of the 50 existing consuming files need to change. The
// amber/blue/teal/red/cyan/orange diagram accents are fixed, see note
// above.

export const brand = {
  green: activeBrand.colors.primary,
  greenShades: activeBrand.colors.primaryShades,
  // Secondary accents used across rc-v2-app's diagrams and charts —
  // intentionally not brand-scoped, see file header.
  amber: '#DAA520',
  blue: '#4A9EBF',
  teal: '#2AA198',
  red: '#E05252',
  cyan: '#00ACC1',
  orange: '#E8832A',
}

// Note: heading/body are plain (mutable) string[] rather than `as const`
// tuples — Tailwind's Config type wants a mutable string[] for
// fontFamily entries, and a readonly tuple doesn't satisfy it.
export const fonts: {
  heading: string[]
  body: string[]
  headingCss: string
  bodyCss: string
} = {
  heading: activeBrand.fonts.heading,
  body: activeBrand.fonts.body,
  // CSS font-family strings, for contexts (e.g. Chart.js, inline SVG
  // <text>) that need a string rather than a Tailwind array.
  headingCss: activeBrand.fonts.headingCss,
  bodyCss: activeBrand.fonts.bodyCss,
}

// ── Shared UI scale ──────────────────────────────────────────────────────
// Currently defined in full only in rc-v2-app's tailwind.config.ts; kept
// here so the other three apps can opt in as they're brought in line,
// without re-typing the values.

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  cardHover: '0 4px 12px rgba(0,0,0,0.12)',
  green: `0 0 0 3px ${rcRgba(brand.green, 0.25)}`,
} as const

// ── Motion tokens ─────────────────────────────────────────────────────────
// Shared timing/easing for the lightweight Framer Motion animation layer,
// so every animated element across rc-v2-app moves at the same tempo
// rather than each component picking its own duration by feel.

export const motion = {
  duration: {
    fast: 0.15,
    base: 0.3,
    slow: 0.5,
  },
  // Standard easing curves, expressed as cubic-bezier arrays (Framer
  // Motion's native format).
  ease: {
    standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
    out: [0, 0, 0.2, 1] as [number, number, number, number],
    in: [0.4, 0, 1, 1] as [number, number, number, number],
  },
  // A small set of ready-made variants for the common "content block
  // reveals as it scrolls into view" pattern used throughout module pages.
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
} as const

// ── Diagram / chart token object ─────────────────────────────────────────
// Matches the shape of the `const RC = {...}` object independently
// redeclared in ~44 of rc-v2-app's components/module/blocks/*.tsx files
// (the "Mauna Loa" dark-card diagram style: RC green on a dark translucent
// card). This is a superset of every key found across those files, built
// from the `brand` colors above via rcRgba(), so a re-brand's primary
// color cascades here too. Existing per-diagram fine-tuned alpha values
// (some diagrams use bespoke opacities like 0.18 or 0.44 for specific SVG
// layers) are intentionally NOT force-migrated.
export const RC = {
  green: brand.green,
  greenDim: rcRgba(brand.green, 0.12),
  /** Alias for greenDim — some diagram files use this older name. */
  greenAlpha: rcRgba(brand.green, 0.12),
  greenMid: rcRgba(brand.green, 0.35),
  greenBright: rcRgba(brand.green, 0.65),
  amber: brand.amber,
  amberDim: rcRgba(brand.amber, 0.12),
  amberMid: rcRgba(brand.amber, 0.38),
  amberBright: rcRgba(brand.amber, 0.65),
  blue: brand.blue,
  blueDim: rcRgba(brand.blue, 0.12),
  blueMid: rcRgba(brand.blue, 0.38),
  teal: brand.teal,
  tealDim: rcRgba(brand.teal, 0.12),
  tealMid: rcRgba(brand.teal, 0.40),
  red: brand.red,
  redDim: rcRgba(brand.red, 0.12),
  redMid: rcRgba(brand.red, 0.40),
  white90: rcRgba('#FFFFFF', 0.90),
  white70: rcRgba('#FFFFFF', 0.70),
  white65: rcRgba('#FFFFFF', 0.65),
  white55: rcRgba('#FFFFFF', 0.55),
  white50: rcRgba('#FFFFFF', 0.50),
  white45: rcRgba('#FFFFFF', 0.45),
  white35: rcRgba('#FFFFFF', 0.35),
  white30: rcRgba('#FFFFFF', 0.30),
  white28: rcRgba('#FFFFFF', 0.28),
  white20: rcRgba('#FFFFFF', 0.20),
  white15: rcRgba('#FFFFFF', 0.15),
  white12: rcRgba('#FFFFFF', 0.12),
  white10: rcRgba('#FFFFFF', 0.10),
  white08: rcRgba('#FFFFFF', 0.08),
  cardBg: 'rgba(10,15,20,0.72)',
  cardBorder: rcRgba('#FFFFFF', 0.08),
  grid: rcRgba('#FFFFFF', 0.06),
  tooltipBg: rcRgba('#FFFFFF', 0.97),
  tooltipText: '#111827',
  fontBody: fonts.bodyCss,
  fontHeading: fonts.headingCss,
} as const
