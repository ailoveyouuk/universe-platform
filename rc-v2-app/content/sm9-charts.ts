// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 9: Chart Data & Visualizations — Biomass Conversion
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Bioenergy Installed Capacity (2012–2023) ─────────────────

export const biomassCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm9-capacity',
  title: 'Global Bioenergy Installed Capacity (2012–2023)',
  description:
    'Global bioenergy capacity has grown steadily from around 83 GW in 2012 to over 145 GW in 2023. Asia — led by China — has driven much of the growth, with bioenergy from municipal solid waste and agricultural residues becoming a major contributor. Europe also maintains a significant bioenergy base, particularly for combined heat and power (CHP) applications.',
  type: 'line',
  labels: ['2012', '2014', '2016', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Global Bioenergy Capacity (GW)',
      data: [83, 95, 108, 121, 127, 133, 139, 143, 145],
      backgroundColor: 'rgba(56, 142, 60, 0.15)',
      borderColor: '#388E3C',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA Renewable Capacity Statistics 2024',
  sourceUrl: 'https://www.irena.org/Statistics',
}

// ── Chart 2: Biomass Feedstock Types — Global Share (2023) ───────────────────

export const biomassFeedstockChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm9-feedstock',
  title: 'Biomass Energy Feedstock Types — Global Share (2023)',
  description:
    'Wood pellets and forest residues remain the dominant feedstock for bioenergy globally, accounting for nearly half of total biomass energy use. Agricultural residues, energy crops, municipal solid waste, and biogas from anaerobic digestion each contribute meaningfully. The feedstock mix varies significantly by region.',
  type: 'bar',
  labels: ['Wood & Forest Residues', 'Agricultural Residues', 'Municipal Solid Waste', 'Energy Crops', 'Biogas (AD)', 'Liquid Biofuels'],
  datasets: [
    {
      label: 'Share of Global Bioenergy (GW)',
      data: [68, 25, 18, 14, 12, 8],
      backgroundColor: ['#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#2E7D32'],
    },
  ],
  xAxisLabel: 'Feedstock Category',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IEA Bioenergy Technology Report 2023',
  sourceUrl: 'https://www.iea.org/energy-system/renewables/bioenergy',
}

// ── Chart 3: Biofuel Production by Region (2023) ──────────────────────────────

export const biofuelRegionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm9-biofuel',
  title: 'Liquid Biofuel Production by Region (2023)',
  description:
    'The United States and Brazil together account for over 80% of global bioethanol production, primarily from corn and sugarcane respectively. Europe leads in biodiesel production, drawing on oilseed crops and used cooking oil. Asia is emerging as a significant biofuel producer, with strong growth in Indonesia and Thailand.',
  type: 'horizontalBar',
  labels: ['USA', 'Brazil', 'European Union', 'China', 'Indonesia', 'India', 'Canada', 'Thailand'],
  datasets: [
    {
      label: 'Liquid Biofuel Production (billion litres/year)',
      data: [55, 33, 14, 7, 5, 4, 3, 2],
      backgroundColor: ['#388E3C', '#4CAF50', '#388E3C', '#388E3C', '#4CAF50', '#388E3C', '#388E3C', '#4CAF50'],
    },
  ],
  xAxisLabel: 'Production (billion litres/year)',
  source: 'IEA Renewables 2023 Report',
  sourceUrl: 'https://www.iea.org/reports/renewables-2023',
}

// ── Chart 4: LCOE Comparison — Biomass vs Other Renewables (2023) ────────────

export const biomassLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm9-lcoe',
  title: 'LCOE Comparison — Bioenergy vs Other Renewables (2023)',
  description:
    'Bioenergy LCOE varies considerably by feedstock and technology: purpose-built biomass plants typically cost $70–130/MWh, while co-firing with coal can be cheaper. Biomass offers a unique advantage as a dispatchable renewable — it can generate power on demand, unlike variable wind and solar, justifying a cost premium for grid stability.',
  type: 'bar',
  labels: ['Solar PV', 'Onshore Wind', 'Offshore Wind', 'Biomass (dedicated)', 'Biomass (co-firing)', 'Geothermal'],
  datasets: [
    {
      label: 'LCOE Low Estimate (USD/MWh)',
      data: [24, 25, 60, 70, 40, 50],
      backgroundColor: 'rgba(56, 142, 60, 0.5)',
    },
    {
      label: 'LCOE High Estimate (USD/MWh)',
      data: [48, 50, 110, 130, 80, 100],
      backgroundColor: 'rgba(56, 142, 60, 0.85)',
    },
  ],
  xAxisLabel: 'Technology',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA Renewable Power Generation Costs 2023',
  sourceUrl: 'https://www.irena.org/publications/2023/Aug/Renewable-Power-Generation-Costs-in-2022',
}
