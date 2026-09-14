'use client'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js'
import type { Student } from '@/lib/data/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const PART_COLORS: Record<number, string> = {
  1: 'rgba(130,188,0,0.85)',
  2: 'rgba(59,130,246,0.85)',
  3: 'rgba(168,85,247,0.85)',
}

interface CohortCOLChartProps {
  students: Student[]
}

export function CohortCOLChart({ students }: CohortCOLChartProps) {
  const smMap: Record<number, { total: number; count: number; partNumber: number }> = {}

  students.forEach(s => {
    Object.values(s.smProgress).forEach(p => {
      if (!smMap[p.smId]) smMap[p.smId] = { total: 0, count: 0, partNumber: p.partNumber }
      if (p.colScore) {
        smMap[p.smId].total += p.colScore.percent
        smMap[p.smId].count += 1
      }
    })
  })

  const entries = Object.entries(smMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .filter(([, d]) => d.count > 0)
    .map(([smId, d]) => ({
      label: `SM${smId}`,
      avgCOL: Math.round(d.total / d.count),
      partNumber: d.partNumber,
    }))

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-500">
        No COL scores yet for this cohort.
      </div>
    )
  }

  const data = {
    labels: entries.map(e => e.label),
    datasets: [{
      label: 'Avg COL Score (%)',
      data: entries.map(e => e.avgCOL),
      backgroundColor: entries.map(e => PART_COLORS[e.partNumber] ?? 'rgba(100,116,139,0.7)'),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: import('chart.js').TooltipItem<'bar'>) => ` ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { callback: (v: unknown) => `${v}%`, font: { size: 10 } },
      },
    },
  }

  return (
    <div style={{ height: '200px' }}>
      <Bar data={data} options={options} />
    </div>
  )
}
