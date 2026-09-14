// The default Renewables Connect brand pack — every value here is the
// exact value that lived directly in index.ts before this package became
// multi-brand-capable. Moving them here must not change what any consumer
// sees; see index.ts for how this is selected and verified.

import type { BrandTokens } from '../types'

export const renewablesConnect: BrandTokens = {
  colors: {
    primary: '#82BC00',
    primaryShades: {
      50: '#f4fae6',
      100: '#e3f2b3',
      200: '#c9e87a',
      600: '#6a9a00',
      dark: '#5a8400',
    },
  },
  fonts: {
    heading: ['Montserrat', 'sans-serif'],
    body: ['Inter', 'sans-serif'],
    headingCss: "'Montserrat', sans-serif",
    bodyCss: "'Inter', sans-serif",
  },
  identity: {
    id: 'renewables-connect',
    displayName: 'Renewables Connect',
    poweredByRC: false,
  },
}
