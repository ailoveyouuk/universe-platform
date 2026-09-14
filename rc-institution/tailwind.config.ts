import type { Config } from 'tailwindcss'
import { brand, fonts } from '@rc/theme'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'rc-green':   brand.green,
        // Both referenced but never defined — same gap found and fixed
        // in rc-admin's and rc-employer's tailwind configs.
        'rc-green-600': brand.greenShades[600],
        'rc-green-700': brand.greenShades.dark,
        'inst-slate': '#1e293b',
        'inst-border':'#e2e8f0',
        'inst-bg':    '#f8fafc',
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
