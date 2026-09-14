// Server-side mirror of rc-v2-app/lib/curriculum.ts's sub-module IDs.
// Kept minimal (id/slug/title/partNumber only) — just enough to seed and
// validate SMProgress rows. If the learner-app curriculum changes shape or
// count, update this list to match.

export interface SMMeta {
  id:         number
  slug:       string
  title:      string
  partNumber: number
}

export const SM_CURRICULUM: SMMeta[] = [
  { id: 1,  slug: 'greenhouse-gas-emissions', title: 'Greenhouse Gas Emissions',       partNumber: 1 },
  { id: 2,  slug: 'global-race-to-net-zero',  title: 'The Global Race to Net Zero',    partNumber: 1 },
  { id: 3,  slug: 'energy-transition',        title: 'The Energy Transition',          partNumber: 1 },
  { id: 4,  slug: 'fixed-offshore-wind',      title: 'Fixed Offshore Wind',            partNumber: 1 },
  { id: 5,  slug: 'floating-offshore-wind',   title: 'Floating Offshore Wind',         partNumber: 1 },
  { id: 6,  slug: 'onshore-wind',             title: 'Onshore Wind',                   partNumber: 2 },
  { id: 7,  slug: 'nuclear',                  title: 'Nuclear Energy',                 partNumber: 2 },
  { id: 8,  slug: 'solar',                    title: 'Solar Power',                    partNumber: 2 },
  { id: 9,  slug: 'biomass',                  title: 'Biomass & Bioenergy',            partNumber: 2 },
  { id: 10, slug: 'hydropower',               title: 'Hydropower',                     partNumber: 2 },
  { id: 11, slug: 'hydrogen',                 title: 'Hydrogen & Fuel Cells',          partNumber: 3 },
  { id: 12, slug: 'carbon-capture',           title: 'Carbon Capture & Storage',       partNumber: 3 },
  { id: 13, slug: 'wave-tidal',               title: 'Wave & Tidal Energy',            partNumber: 3 },
  { id: 14, slug: 'skills-roles',             title: 'Skills & Roles in Renewables',   partNumber: 3 },
  { id: 15, slug: 'future-renewables',        title: 'The Future of Renewables',       partNumber: 3 },
]

export function getSMMeta(smId: number): SMMeta | undefined {
  return SM_CURRICULUM.find(sm => sm.id === smId)
}
