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
        'rc-green':   brand.green,
        // Referenced in EmployerAccessGate but never defined — same gap
        // found and fixed in rc-admin's tailwind config.
        'rc-green-600': brand.greenShades[600],
        'emp-navy':   '#0f172a',
        'emp-slate':  '#1e3a5f',
        'emp-border': '#e2e8f0',
        'emp-bg':     '#f8fafc',
        'emp-accent': '#0ea5e9',
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
