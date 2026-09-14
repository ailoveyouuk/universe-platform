// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 13: Chart Data & Visualizations — Wave & Tidal Energy
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Marine Energy Installed Capacity (2010–2023) ──────────────

export const marineCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm13-capacity',
  title: 'Global Marine Energy Installed Capacity (2010–2023)',
  description:
    'Marine energy (wave and tidal combined) remains at an early stage of commercial development, with total global installed capacity of around 530 MW by end-2023. Tidal range projects — principally the 240 MW Rance Tidal Barrage in France (operational since 1966) — account for the majority. Tidal stream and wave energy devices are at the pre-commercial and early-commercial stages.',
  type: 'line',
  labels: ['2010', '2013', '2015', '2017', '2019', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Tidal Range (GW)',
      data: [0.27, 0.27, 0.27, 0.28, 0.28, 0.30, 0.32, 0.35],
      backgroundColor: 'rgba(1, 87, 155, 0.15)',
      borderColor: '#01579B',
    },
    {
      label: 'Tidal Stream (MW)',
      data: [5, 20, 45, 60, 90, 120, 140, 160],
      backgroundColor: 'rgba(3, 155, 229, 0.15)',
      borderColor: '#039BE5',
    },
    {
      label: 'Wave Energy (MW)',
      data: [2, 5, 8, 12, 15, 18, 20, 22],
      backgroundColor: 'rgba(0, 188, 212, 0.15)',
      borderColor: '#00BCD4',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Capacity (MW)',
  source: 'Ocean Energy Europe & IRENA Offshore Renewables Report 2023',
  sourceUrl: 'https://www.oceanenergy-europe.eu/ocean-energy/statistics/',
}

// ── Chart 2: Wave & Tidal Energy Global Resource Potential ───────────────────

export const marineResourceChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm13-resource',
  title: 'Wave & Tidal Energy Resource — Global Technical Potential (TWh/year)',
  description:
    'The theoretical global resource of wave and tidal energy is vast. Wave energy alone has a technical potential of over 29,000 TWh per year — comparable to current global electricity consumption. Tidal current energy carries a potential of around 3,000 TWh/year, concentrated around headlands, straits, and island archipelagos where tidal flows are fast and predictable.',
  type: 'bar',
  labels: ['Wave Energy', 'Tidal Stream', 'Tidal Range', 'Ocean Thermal (OTEC)', 'Salinity Gradient'],
  datasets: [
    {
      label: 'Global Technical Potential (TWh/year)',
      data: [29000, 3000, 1000, 44000, 1650],
      backgroundColor: ['#01579B', '#039BE5', '#29B6F6', '#0277BD', '#4FC3F7'],
    },
  ],
  xAxisLabel: 'Marine Energy Technology',
  yAxisLabel: 'Technical Potential (TWh/year)',
  source: 'IEA Ocean Energy Technology Brief 2020',
  sourceUrl: 'https://www.iea.org/reports/ocean-energy',
}

// ── Chart 3: Tidal Energy — Top Deployment Regions (2023) ────────────────────

export const tidalRegionsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm13-regions',
  title: 'Tidal & Wave Energy Deployment by Region (2023)',
  description:
    'Europe — particularly the UK, France, and Scotland — leads global marine energy deployment, driven by favourable policy environments, excellent tidal resources, and established offshore engineering expertise. The EMEC (European Marine Energy Centre) in Orkney, Scotland, has tested more wave and tidal devices than any other location in the world. Asia-Pacific, North America, and South America are emerging development regions.',
  type: 'horizontalBar',
  labels: ['Europe (UK/France/Ireland)', 'Asia-Pacific', 'North America', 'South Korea', 'South America', 'Africa & Middle East'],
  datasets: [
    {
      label: 'Marine Energy Capacity (MW)',
      data: [380, 60, 35, 30, 8, 3],
      backgroundColor: ['#01579B', '#039BE5', '#0288D1', '#29B6F6', '#0277BD', '#4FC3F7'],
    },
  ],
  xAxisLabel: 'Installed Capacity (MW)',
  source: 'Ocean Energy Europe Market Overview 2024',
  sourceUrl: 'https://www.oceanenergy-europe.eu/',
}

// ── Chart 4: Marine Energy LCOE Projection (2023–2040) ───────────────────────

export const marineLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm13-lcoe',
  title: 'Marine Energy Projected LCOE Reduction (2023–2040)',
  description:
    'Wave and tidal energy currently have high LCOEs of $200–600/MWh, reflecting early-stage manufacturing, limited supply chains, and small project scales. Learning-by-doing and economies of scale are expected to drive costs down substantially, with projections suggesting tidal stream could reach $80–130/MWh by 2035 and potentially compete with offshore wind by 2040. Wave energy has a longer cost reduction trajectory.',
  type: 'line',
  labels: ['2023', '2025', '2027', '2030', '2032', '2035', '2038', '2040'],
  datasets: [
    {
      label: 'Tidal Stream LCOE (USD/MWh)',
      data: [350, 280, 200, 150, 120, 100, 90, 80],
      backgroundColor: 'rgba(1, 87, 155, 0.15)',
      borderColor: '#01579B',
    },
    {
      label: 'Wave Energy LCOE (USD/MWh)',
      data: [500, 420, 350, 270, 220, 180, 150, 130],
      backgroundColor: 'rgba(3, 155, 229, 0.15)',
      borderColor: '#039BE5',
    },
    {
      label: 'Offshore Wind (Reference) (USD/MWh)',
      data: [90, 85, 80, 72, 68, 65, 62, 60],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'Ocean Energy Europe & IRENA Marine Energy Outlook 2023',
  sourceUrl: 'https://www.irena.org/ocean',
}
