// @rc/theme/brands — shared shape every brand pack must conform to.
//
// Keeping this separate from index.ts's re-exports means adding a new
// client brand is: add one file under brands/ that satisfies BrandTokens,
// register it in the BRANDS map in index.ts. Nothing else changes — every
// consumer (44+ diagram components, four apps' tailwind configs) keeps
// importing `brand`/`fonts`/`RC` exactly as before; only which brand pack
// those resolve to varies.

export interface BrandColors {
  /** Primary brand accent — drives buttons, links, active states, the
   *  `rc-green`/`rc-green-*` Tailwind tokens, and every diagram's primary
   *  accent (via the RC.green* family). Named `primary` here even though
   *  the RC default is literally green — the field, not the color, is
   *  what's brand-neutral. */
  primary: string
  primaryShades: {
    50: string
    100: string
    200: string
    600: string
    dark: string
  }
}

export interface BrandFonts {
  heading: string[]
  body: string[]
  headingCss: string
  bodyCss: string
}

/** Non-visual brand identity — logo assets, "Powered by" wordmark, and
 *  contact overrides. Nothing in the app reads this yet (no component has
 *  been wired to render a client logo or swap the support email) — it
 *  exists so that work has real, correct data to consume once it starts,
 *  rather than being invented at that point. */
export interface BrandIdentity {
  /** Internal id, matches the brand pack's filename and the
   *  NEXT_PUBLIC_BRAND value that selects it. */
  id: string
  /** Display name used in copy, e.g. "Renewables Connect", "Octopus Energy". */
  displayName: string
  /** Public-folder-relative paths (each app's own /public/brands/<id>/...).
   *  Left undefined for the default RC brand — RC's existing logo usage
   *  predates this package and isn't being touched here. */
  logo?: {
    /** Full lockup (mascot/mark + wordmark) for a dark background. */
    fullDark?: string
    /** Full lockup for a light/white background. */
    fullLight?: string
    /** Wordmark only, no mark — for a dark background. */
    wordmarkDark?: string
    /** Wordmark only, no mark — for a light background. */
    wordmarkLight?: string
    /** Small square mark only — sidebar collapse states, favicons, etc.
     *  Not always available: press kits often only offer the mark
     *  combined with a wordmark, not cropped standalone — see the brand
     *  pack's own comments for whether this had to be left unset. */
    markOnly?: string
    /** Horizontal lockup (mark beside the wordmark, not stacked above it)
     *  for a dark background — useful in a narrow header bar. */
    horizontalDark?: string
    /** Horizontal lockup for a light background. */
    horizontalLight?: string
  }
  favicon?: string
  /** Whether this brand's UI should show a "Powered by Renewables Connect"
   *  line under the client's own logo. Always false for the RC brand
   *  itself (RC doesn't need to credit RC). */
  poweredByRC: boolean
  /** Override for the support contact shown in access-denied screens and
   *  email footers. Undefined = use each app's existing RC default. */
  supportEmail?: string
  partnershipsEmail?: string
}

export interface BrandTokens {
  colors: BrandColors
  fonts: BrandFonts
  identity: BrandIdentity
}
