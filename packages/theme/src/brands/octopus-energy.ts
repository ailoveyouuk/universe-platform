// Octopus Energy brand pack — NOT wired to load by default anywhere.
// Selected only when NEXT_PUBLIC_BRAND=octopus-energy is set at build time
// (see index.ts). Nothing in any deploy workflow sets that today.
//
// Colour sourcing (for anyone revisiting this): the values below are taken
// from getComputedStyle() on live octopus.energy DOM elements (buttons,
// the page's own <meta name="theme-color">) — i.e. what's actually
// rendered in production today, not a press-kit guess. Cross-checked
// against two independent third-party lookups (Brandfetch, which itself
// disagreed with itself across two URLs and marks the profile
// "Unclaimed"/unverified) and against direct pixel-sampling of the
// official press-kit logo PNGs, which gave close-but-not-identical values
// (#150147 background purple, #ea58d4 mascot pink vs the live #100030 /
// #F050F8 below). The live-site values were preferred as canonical since
// they're demonstrably what's in production now.
//
// primaryShades below is a tint/shade ramp I derived myself (HLS
// interpolation from #F050F8) — it is NOT an official Octopus-published
// ramp, just a reasonable approximation in the same shape as the RC pack's
// shades, until/unless Octopus supplies real ones.
//
// LICENSING CAVEAT (flagged to Lewis, not yet resolved): these logo assets
// come from octopus.energy/press/media-assets, which frames itself as
// "ready for the press" — not confirmed as cleared for commercial/partner
// whitelabel use. Before this brand pack is ever switched on for a real
// Octopus Energy client relationship, go through partnerships@octoenergy.com
// to confirm usage rights. Nothing here activates that risk on its own —
// this file is inert until NEXT_PUBLIC_BRAND selects it.

import type { BrandTokens } from '../types'

export const octopusEnergy: BrandTokens = {
  colors: {
    // Deep near-black purple, confirmed via live button text colour and
    // the site's own theme-color meta tag.
    primary: '#F050F8',
    primaryShades: {
      50: '#fdecfd',
      100: '#f9d0fb',
      200: '#f3a1f7',
      600: '#d909e3',
      dark: '#a607ad',
    },
  },
  fonts: {
    // Octopus's own typeface is proprietary/unconfirmed from public
    // sources — using a close, widely-available system-safe fallback
    // rather than guessing a licensed font name. Revisit once a real
    // brand guideline doc is available (see partnerships note above).
    heading: ['Poppins', 'sans-serif'],
    body: ['Poppins', 'sans-serif'],
    headingCss: "'Poppins', sans-serif",
    bodyCss: "'Poppins', sans-serif",
  },
  identity: {
    id: 'octopus-energy',
    displayName: 'Octopus Energy',
    logo: {
      fullDark: '/brands/octopus-energy/full-dark.png',
      fullLight: '/brands/octopus-energy/full-light.png',
      wordmarkDark: '/brands/octopus-energy/wordmark-dark.png',
      wordmarkLight: '/brands/octopus-energy/wordmark-light.png',
      horizontalDark: '/brands/octopus-energy/horizontal-dark.png',
      horizontalLight: '/brands/octopus-energy/horizontal-light.png',
      // No standalone icon-only mark exists in the official press kit —
      // every file there includes the wordmark. Deliberately left unset
      // rather than algorithmically cropping one; a real mark-only asset
      // should come from Octopus directly if this is ever activated.
    },
    // Same reason as markOnly above — no dedicated favicon asset in the
    // press kit. Leave unset; each app falls back to its existing favicon
    // until a real one is supplied.
    poweredByRC: true,
    // Not yet confirmed with Lewis or Octopus — placeholders left unset
    // rather than invented. Fill in once this brand is actually activated.
  },
}
