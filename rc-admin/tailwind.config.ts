import type { Config } from 'tailwindcss'
import { brand, fonts } from '@rc/theme'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'rc-green':     brand.green,
        'rc-green-dark':brand.greenShades.dark,
        'adm-bg':       '#0d1117',
        'adm-surface':  '#161b22',
        'adm-border':   '#30363d',
        'adm-text':     '#e6edf3',
        'adm-muted':    '#8b949e',
        'adm-gold':     '#d4a017',
        'adm-page':     '#f6f8fa',
        'adm-card':     '#ffffff',
        'adm-cborder':  '#d0d7de',
        // Was referenced across 17 call sites as text-rc-green-600 but
        // never actually defined — Tailwind silently generated no rule for
        // it, so those links/badges rendered with whatever text color they
        // inherited (often the light adm-text, invisible on white).
        'rc-green-600': brand.greenShades[600],
        // Muted/secondary text color for the light main content area
        // (cards, tables, helper text) — 'adm-muted' is tuned for the dark
        // sidebar and is too low-contrast against white/adm-page.
        'adm-ink-muted': '#4b5563',
        // Dark, high-contrast text color for form fields and other light-
        // surface content — 'adm-text' is a light grey/white meant for the
        // dark sidebar/surface, and is unreadable on white input backgrounds.
        'adm-ink':      '#1f2937',
      },
      fontFamily: {
        heading: fonts.heading,
        body:    fonts.body,
      },
    },
  },
  plugins: [],
}

export default config
