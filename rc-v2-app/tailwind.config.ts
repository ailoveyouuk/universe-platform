import type { Config } from 'tailwindcss'
import { brand, fonts } from '@rc/theme'

// Tailwind can't compute an opacity-modifier class (e.g. bg-rc-green/15)
// for a color whose value is a bare var(--x) reference — it needs to know
// the actual RGB channels to blend in the alpha at build time. So the
// CSS custom property holds raw "R G B" channel numbers instead of a full
// color string, and this wraps it in the documented Tailwind pattern for
// an opacity-aware custom-property color (rgb(var(...) / <alpha>)),
// falling back to the build-time brand color's own channels when the
// variable isn't set (the vast majority of learners, who see no
// institution-specific branding — see LearnerContext.tsx).
function hexToRgbSpace(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return '130 188 0' // falls back to brand green's own channels if parsing ever fails
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

function withOpacity(variableName: string, fallbackHex: string) {
  const fallbackRgb = hexToRgbSpace(fallbackHex)
  return ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `rgb(var(${variableName}, ${fallbackRgb}))`
      : `rgb(var(${variableName}, ${fallbackRgb}) / ${opacityValue})`
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'xl:grid-cols-4',
    '2xl:grid-cols-5',
    'line-clamp-2',
  ],
  theme: {
    extend: {
      colors: {
        rc: {
          // Backed by CSS custom properties so an institution's
          // primaryColor (set at runtime in LearnerContext once the
          // learner's institution is known) recolors every existing
          // bg-rc-green/text-rc-green/etc. usage — including opacity
          // modifiers like bg-rc-green/15 — with no per-component
          // changes; falls back to the build-time brand color until
          // that effect runs, so unbranded institutions see no change.
          // Tailwind's own Config type doesn't model the documented
          // "color as a function" form (it only types RecursiveKeyValuePair<
          // string, string>), even though it fully supports and invokes it
          // at runtime — the `as unknown as string` casts below are just
          // satisfying that type gap, not changing what's produced.
          green:      withOpacity('--rc-accent-rgb', brand.green) as unknown as string,
          'green-50': brand.greenShades[50],
          'green-100':brand.greenShades[100],
          'green-200':brand.greenShades[200],
          'green-600':withOpacity('--rc-accent-600-rgb', brand.greenShades[600]) as unknown as string,
          dark:       '#111827',
          grey:       '#4B5563',
          // Was #9CA3AF (~2.5:1 contrast on white — fails WCAG AA for
          // text). Used purely as muted/secondary text throughout the app
          // (hints, captions, metadata) — never as a background or border
          // — so darkening it here fixes every usage at once.
          'grey-light':'#64748B',
          border:     '#E5E7EB',
          'bg-main':  '#F8F9FA',
          'bg-card':  '#FFFFFF',
          'bg-sidebar':'#111827',
        },
      },
      fontFamily: {
        heading: fonts.heading,
        body:    fonts.body,
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '16px',
        xl:   '24px',
        full: '9999px',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        green:  '0 0 0 3px rgba(130,188,0,0.25)',
      },
      spacing: {
        sidebar: '280px',
        header:  '72px',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
