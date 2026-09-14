'use client'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js'
import type { SMStat } from '@/lib/data/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const PART_COLORS: Record<number, string> = {
  1: 'rgba(130,188,0,0.85)',
  2: 'rgba(59,130,246,0.85)',
  3: 'rgba(168,85,247,0.85)',
}

interface COLScoreChartProps {
  smStats: SMStat[]
}

export function COLScoreChart({ smStats }: COLScoreChartProps) {
  const withScores = smStats.filter(s => s.avgCOLPercent !== null)

  const isEmpty = withScores.length === 0

  const data = {
    labels: withScores.map(s => `SM${s.smId}`),
    datasets: [{
      label: 'Avg COL Score (%)',
      data: withScores.map(s => Math.round(s.avgCOLPercent ?? 0)),
      backgroundColor: withScores.map(s => PART_COLORS[s.partNumber]),
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const options = {
    indexAxis: 'y' as const,
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
        min: 0,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { callback: (v: unknown) => `${v}%`, font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  }

  return (
    <div className="card p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-inst-slate text-sm">COL Score by Sub-Module</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rc-green inline-block" />Part 1</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Part 2</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Part 3</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center" style={{ height: '320px' }}>
        {isEmpty
          ? <p className="text-sm text-slate-500">No data yet — COL scores will appear here once students complete sub-modules.</p>
          : <Bar data={data} options={options} />
        }
      </div>
    </div>
  )
}
