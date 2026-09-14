// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 14: Chart Data & Visualizations — Skills & Roles
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Renewable Energy Jobs by Sector (2023) ───────────────────

export const renewableJobsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm14-jobs',
  title: 'Global Renewable Energy Jobs by Technology (2023)',
  description:
    'The renewable energy sector employed approximately 16.2 million people globally in 2023. Solar PV is by far the largest employer, accounting for over 7 million jobs — reflecting the labour intensity of manufacturing, installation, and maintenance. Bioenergy, wind, and hydropower also provide millions of jobs, with the sector growing rapidly as energy transitions accelerate.',
  type: 'horizontalBar',
  labels: ['Solar PV', 'Liquid Biofuels', 'Wind Energy', 'Biomass Heating', 'Hydropower', 'Solar Heating', 'Geothermal', 'Wave & Tidal'],
  datasets: [
    {
      label: 'Global Jobs (millions)',
      data: [7.1, 2.4, 1.4, 0.85, 2.2, 1.0, 0.15, 0.02],
      backgroundColor: ['#82BC00', '#388E3C', '#0277BD', '#4CAF50', '#01579B', '#FFC107', '#FF7043', '#039BE5'],
    },
  ],
  xAxisLabel: 'Number of Jobs (millions)',
  source: 'IRENA Renewable Energy and Jobs Annual Review 2024',
  sourceUrl: 'https://www.irena.org/publications/2024/May/Renewable-Energy-and-Jobs-Annual-Review-2024',
}

// ── Chart 2: Renewable Energy Workforce Growth Projection (2023–2030) ─────────

export const workforceGrowthChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm14-growth',
  title: 'Global Renewable Energy Workforce Growth (2023–2030)',
  description:
    'IRENA projects that the global renewable energy workforce could reach 38 million jobs by 2030 under an accelerated transition scenario — more than double current levels. Achieving this will require major investments in training, education, and upskilling programmes globally, with particular urgency in regions where fossil fuel jobs are declining rapidly.',
  type: 'line',
  labels: ['2020', '2021', '2022', '2023', '2025', '2027', '2030'],
  datasets: [
    {
      label: 'Renewable Energy Jobs — Actual (millions)',
      data: [12.0, 12.7, 13.7, 16.2, null, null, null],
      backgroundColor: 'rgba(130, 188, 0, 0.15)',
      borderColor: '#82BC00',
    },
    {
      label: 'Renewable Energy Jobs — Projected (millions)',
      data: [null, null, null, 16.2, 22.0, 30.0, 38.0],
      backgroundColor: 'rgba(130, 188, 0, 0.05)',
      borderColor: '#A5C850',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Jobs (millions)',
  source: 'IRENA World Energy Transitions Outlook 2023',
  sourceUrl: 'https://www.irena.org/publications/2023/Jun/World-Energy-Transitions-Outlook-2023',
}

// ── Chart 3: Skills Gap — Renewable Energy vs Fossil Fuels (2023) ────────────

export const skillsGapChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm14-gap',
  title: 'Skills Shortage Index — Renewable Energy Sectors (2023)',
  description:
    'Skills shortages are a pressing challenge across all renewable energy sectors. Offshore wind faces the most acute shortage, reflecting the specialised nature of marine engineering and subsea installation. Solar, grid, and storage roles are also experiencing significant gaps as deployment accelerates faster than training pipelines can respond.',
  type: 'bar',
  labels: ['Offshore Wind', 'Grid & Storage', 'Solar PV', 'Green Hydrogen', 'Onshore Wind', 'Biomass', 'Hydropower'],
  datasets: [
    {
      label: 'Skills Shortage Index (1–10)',
      data: [8.7, 7.9, 7.2, 8.1, 6.5, 5.2, 4.8],
      backgroundColor: ['#82BC00', '#A5C850', '#82BC00', '#82BC00', '#A5C850', '#82BC00', '#82BC00'],
    },
  ],
  xAxisLabel: 'Renewable Energy Sector',
  yAxisLabel: 'Skills Shortage (1=low, 10=critical)',
  source: 'IRENA & RenewableUK Workforce Report 2023',
  sourceUrl: 'https://www.irena.org/publications/2023/Jan/Renewable-Energy-Statistics-2023',
}

// ── Chart 4: Transferable Skills from Fossil Fuels to Renewables ──────────────

export const transferableSkillsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm14-transfer',
  title: 'Transferability of Fossil Fuel Skills to Renewable Energy Roles (%)',
  description:
    'Many skills from the fossil fuel industry are highly transferable to renewables. Offshore oil & gas workers can transfer approximately 70–80% of their skills to offshore wind, while mechanical, electrical, and project management skills from conventional power generation map closely to solar and wind roles. This "just transition" potential is significant — particularly for workers in coal, oil, and gas communities.',
  type: 'horizontalBar',
  labels: ['Offshore O&G → Offshore Wind', 'Mech. Engineering → Wind Turbine', 'Electrical Eng. → Grid/Solar', 'Project Mgmt → RE Projects', 'Coal Power → Biomass', 'Petroleum Eng. → Hydrogen'],
  datasets: [
    {
      label: 'Skills Transferability (%)',
      data: [78, 72, 85, 90, 65, 55],
      backgroundColor: ['#82BC00', '#A5C850', '#82BC00', '#82BC00', '#A5C850', '#82BC00'],
    },
  ],
  xAxisLabel: 'Transferability (%)',
  source: 'IRENA Renewable Energy Benefits: Measuring the Economics 2023',
  sourceUrl: 'https://www.irena.org/publications',
}
