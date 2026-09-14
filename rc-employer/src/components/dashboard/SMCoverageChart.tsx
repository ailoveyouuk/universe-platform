'use client'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import type { SMCoverage } from '@/lib/data/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const PART_COLORS: Record<number, string> = {
  1: 'rgba(130,188,0,0.85)',
  2: 'rgba(14,165,233,0.85)',
  3: 'rgba(168,85,247,0.85)',
}

interface SMCoverageChartProps {
  smCoverage: SMCoverage[]
}

export function SMCoverageChart({ smCoverage }: SMCoverageChartProps) {
  if (smCoverage.length === 0) {
    return (
      <div className="card p-5 flex flex-col h-full">
        <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Talent Coverage by Sub-Module</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500">No coverage data available yet</p>
        </div>
      </div>
    )
  }

  const data = {
    labels: smCoverage.map(s => `SM${s.smId}`),
    datasets: [{
      label: 'Candidates Completed',
      data: smCoverage.map(s => s.candidatesCompleted),
      backgroundColor: smCoverage.map(s => PART_COLORS[s.partNumber]),
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown; dataIndex: number }) => {
            const sm = smCoverage[ctx.dataIndex]
            const col = sm?.avgCOLPercent != null ? ` · Avg COL: ${Math.round(sm.avgCOLPercent)}%` : ''
            return ` ${ctx.raw} candidates${col}`
          },
        },
      },
    },
    scales: {
      x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { stepSize: 1, font: { size: 11 } },
      },
    },
  }

  return (
    <div className="card p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-emp-navy text-sm">Talent Coverage by Sub-Module</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rc-green inline-block" />Part 1</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emp-accent inline-block" />Part 2</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Part 3</span>
        </div>
      </div>
      <div style={{ height: '260px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
