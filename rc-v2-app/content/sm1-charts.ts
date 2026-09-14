// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 1: Chart Data & Visualizations
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization, GWPCardsBlock } from '@/types'

// ── Chart 1: Atmospheric CO₂ Concentration (Mauna Loa) ──────────────────────

export const co2ConcentrationChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's1-co2-chart',
  title: 'Atmospheric CO₂ Concentration — Mauna Loa Observatory',
  description:
    'Global average atmospheric CO₂ concentration measured at Mauna Loa, Hawaii since 1958. The steady rise demonstrates accelerating human-induced greenhouse gas emissions.',
  type: 'line',
  labels: [
    '1958', '1965', '1970', '1975', '1980', '1985', '1990', '1995', '2000', '2005', '2010', '2015', '2020', '2024',
  ],
  datasets: [
    {
      label: 'CO₂ Concentration (ppm)',
      data: [315, 320, 326, 331, 339, 347, 354, 361, 369, 379, 390, 401, 414, 424],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'CO₂ Concentration (ppm)',
  source: 'NOAA Global Monitoring Laboratory — Carbon Cycle Greenhouse Gases (Keeling et al., 2005; NOAA 2024)',
  sourceUrl: 'https://gml.noaa.gov/ccgg/trends/',
}

// ── Chart 2: Global Emissions by Sector ──────────────────────────────────────

export const emissionsBySectorChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's2-sectors-chart',
  title: 'Global Greenhouse Gas Emissions by Sector',
  description: 'Distribution of global emissions across major economic sectors. Energy-related activities dominate at 73%, highlighting the centrality of the energy transition.',
  type: 'doughnut',
  labels: ['Energy (73%)', 'Agriculture (18%)', 'Industrial Processes (6%)', 'Waste (3%)'],
  datasets: [
    {
      label: 'Global GHG Emissions',
      data: [73, 18, 6, 3],
      backgroundColor: ['#82BC00', '#8B4513', '#CD853F', '#DAA520'],
    },
  ],
  source: 'IPCC Climate Change 2021: The Physical Science Basis',
  sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/',
}

// ── Chart 3: Energy Sector Emissions Breakdown ───────────────────────────────

export const energySectorChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's2-energy-chart',
  title: 'Energy Sector Emissions Breakdown',
  description: 'The energy sector accounts for 73% of global emissions. Electricity & heat production and transport are the two largest sub-sectors, underscoring why grid decarbonisation and EVs are priorities.',
  type: 'horizontalBar',
  labels: ['Electricity & Heat (25%)', 'Transport (24%)', 'Buildings (21%)', 'Manufacturing & Industry (21%)', 'Other Energy (9%)'],
  datasets: [
    {
      label: '% of Energy Sector Emissions',
      data: [25, 24, 21, 21, 9],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: '% of Energy Sector Emissions',
  source: 'IEA Energy Statistics Database (2023)',
  sourceUrl: 'https://www.iea.org/data-and-statistics',
}

// ── Chart 4: Agriculture Emissions Sources ──────────────────────────────────

export const agricultureChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's2-agriculture-chart',
  title: 'Agriculture Sector Emissions Sources',
  description:
    'Agriculture accounts for ~18% of global emissions. Livestock methane and deforestation for agricultural expansion are the dominant drivers.',
  type: 'doughnut',
  labels: ['Livestock Methane (38%)', 'Fertilisers N₂O (17%)', 'Deforestation for Ag (27%)', 'Rice Cultivation (10%)', 'Other Ag (8%)'],
  datasets: [
    {
      label: 'Agricultural Emissions',
      data: [38, 17, 27, 10, 8],
      backgroundColor: ['#8B4513', '#CD853F', '#DAA520', '#556B2F', '#4682B4'],
    },
  ],
  source: 'Gerber et al. (2013) & FAO Food & Agricultural Organization',
  sourceUrl: 'https://www.fao.org/home/en',
}

// ── Chart 5: Industrial Emissions Contributors ──────────────────────────────
// Changed from 'bar' to 'horizontalBar' — category names are long, horizontal
// layout gives them breathing room and makes the ranking easier to read.

export const industrialChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's2-industrial-chart',
  title: 'Industrial Process Emissions Contributors',
  description: 'Iron & steel and cement production together represent over 16% of global CO₂ — making heavy industry one of the hardest sectors to decarbonise due to its reliance on high-temperature fossil fuel combustion.',
  type: 'horizontalBar',
  labels: ['Iron & Steel', 'Cement Production', 'Chemicals & Petrochemicals', 'Non-Ferrous Metals', 'Glass Making'],
  datasets: [
    {
      label: '% of Global CO₂ Emissions',
      data: [8.5, 7.5, 3.5, 1.5, 0.8],
      backgroundColor: '#CD853F',
    },
  ],
  xAxisLabel: '% of Global CO₂ Emissions',
  source: 'IPCC Fifth Assessment Report (AR5) & Global Cement Report',
  sourceUrl: 'https://www.ipcc.ch/assessment-report/ar5/',
}

// ── Chart 6: Remaining Carbon Budget by Temperature Target ───────────────────
// Replaces the misleading mixed-units bar (Gt vs years on the same axis).
// Now shows only the Gt budget side-by-side — clean and comparable.

export const carbonBudgetChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's4-carbon-budget-chart',
  title: 'Remaining Carbon Budget by Temperature Target (Gt CO₂)',
  description:
    'Remaining CO₂ that can be emitted for a 50% likelihood of limiting warming to 1.5°C or 2°C. The gap between these two targets represents over 850 Gt CO₂ — roughly 21 additional years of current emissions.',
  type: 'bar',
  labels: ['1.5°C Target', '2.0°C Target'],
  datasets: [
    {
      label: 'Remaining CO₂ Budget (Gt)',
      data: [380, 1230],
      backgroundColor: ['#82BC00', '#DAA520'],
    },
  ],
  xAxisLabel: 'Paris Agreement Temperature Limit',
  yAxisLabel: 'Remaining CO₂ Budget (Gt)',
  source: 'IPCC AR6 WG1 Report 2023 — Global Carbon Budget Assessment',
  sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/',
}

// ── Chart 7: Years of Emissions Remaining by Temperature Target ───────────────
// Companion to carbonBudgetChart — same data expressed in years for immediacy.

export const temperatureTargetsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's4-temp-targets-chart',
  title: 'Years of Current Emissions Remaining by Temperature Target',
  description:
    'At 2022 emission rates, the 1.5°C budget is exhausted in ~9 years; the 2°C budget in ~30. This chart makes the urgency of the 1.5°C ambition viscerally clear.',
  type: 'bar',
  labels: ['1.5°C Target (50% likelihood)', '2.0°C Target (50% likelihood)'],
  datasets: [
    {
      label: 'Years Remaining at 2022 Emission Rates',
      data: [9, 30],
      backgroundColor: ['#82BC00', '#DAA520'],
    },
  ],
  xAxisLabel: 'Temperature Target',
  yAxisLabel: 'Years at 2022 Emission Rates',
  source: 'Global Carbon Project 2023 & IPCC AR6',
  sourceUrl: 'https://www.globalcarbonproject.org/',
}

// ── Chart 8: Mitigation Impact Comparison ────────────────────────────────────

export const mitigationChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's5-mitigation-chart',
  title: 'Estimated CO₂ Reduction Potential by Mitigation Strategy',
  description:
    'Global emissions reduction potential by 2050 relative to 2020 levels. Renewable energy and energy efficiency together deliver over half of all achievable reductions.',
  type: 'horizontalBar',
  labels: [
    'Renewable Energy',
    'Energy Efficiency',
    'Forest Protection & Reforestation',
    'Sustainable Agriculture',
    'Carbon Capture & Storage',
  ],
  datasets: [
    {
      label: 'CO₂ Reduction Potential (Gt CO₂/yr by 2050)',
      data: [8.5, 6.8, 4.2, 2.8, 1.5],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'CO₂ Reduction Potential (Gt CO₂/yr by 2050)',
  source: 'IPCC Climate Change Mitigation Report & World Resources Institute',
  sourceUrl: 'https://www.ipcc.ch/report/ar6/wg3/',
}

// ── Chart 9: Transport Emissions by Mode ──────────────────────────────────────

export const transportChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 's2-transport-chart',
  title: 'Transport Sector Emissions by Mode',
  description:
    'Road transport dominates at ~75% of total transport emissions. Aviation and maritime shipping are small by share but growing rapidly and among the hardest to decarbonise.',
  type: 'doughnut',
  labels: ['Road Transport (75%)', 'Aviation (2.5%)', 'Maritime Shipping (2.5%)', 'Rail (2%)', 'Other (18%)'],
  datasets: [
    {
      label: 'Transport Emissions by Mode',
      data: [75, 2.5, 2.5, 2, 18],
      backgroundColor: ['#8B4513', '#CD853F', '#DAA520', '#556B2F', '#4682B4'],
    },
  ],
  source: 'IEA Transport Sector CO₂ Emissions Database & ICAO/IMO Reports',
  sourceUrl: 'https://www.iea.org/reports/transport-biofuels',
}

// ── Chart 10: IEA CO₂ Emissions from Electricity & Heat by Fuel ──────────────
// Replaces the static PAGE_15.png image (IEA CC BY 4.0 chart).
// Source data: IEA CO₂ Emissions from Fuel Combustion, 2022 edition.
// Values in Mt CO₂ for global electricity and heat production.

export const ieaElectricityFuelChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm1-iea-fuel-chart',
  title: 'CO₂ Emissions from Electricity & Heat Production by Fuel (2000–2021)',
  description:
    'Coal dominates electricity and heat sector CO₂ emissions, accounting for approximately 68–70% of the total throughout the period. Natural gas has grown as a share — particularly after 2015 — while oil-fired generation has declined as oil-fired power stations have been phased out. Total sector emissions reached approximately 13.8 Gt CO₂ in 2021, the highest level on record.',
  type: 'bar',
  labels: ['2000', '2005', '2010', '2015', '2019', '2020', '2021'],
  datasets: [
    {
      label: 'Coal (Mt CO₂)',
      data: [6900, 8100, 9000, 9100, 9200, 8400, 9500],
      backgroundColor: '#8B4513',
    },
    {
      label: 'Natural Gas (Mt CO₂)',
      data: [2200, 2500, 2800, 3100, 3600, 3500, 3700],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Oil (Mt CO₂)',
      data: [950, 880, 790, 700, 580, 510, 500],
      backgroundColor: '#CD853F',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'CO₂ Emissions (Mt)',
  source: 'IEA — CO₂ Emissions from Fuel Combustion (2022 edition). Licence: CC BY 4.0',
  sourceUrl: 'https://www.iea.org/data-and-statistics/data-product/co2-emissions-from-fuel-combustion',
}

// ── GWP Cards Block ──────────────────────────────────────────────────────────

export const gwpCardsBlock: GWPCardsBlock = {
  _type: 'gwpCardsBlock',
  _key: 's1-gwp-cards',
}
