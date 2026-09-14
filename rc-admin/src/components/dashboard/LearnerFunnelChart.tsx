'use client'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import type { LearnerFunnel } from '@/lib/data/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface LearnerFunnelChartProps {
  funnel: LearnerFunnel
}

export function LearnerFunnelChart({ funnel }: LearnerFunnelChartProps) {
  const isEmpty = funnel.registered === 0

  if (isEmpty) {
    return (
      <div className="card p-5 flex flex-col h-full">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-2">Learner Funnel</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500">No learner data yet</p>
        </div>
      </div>
    )
  }

  const stages = [
    { label: 'Registered',       value: funnel.registered },
    { label: 'Started SM1',      value: funnel.startedSM1 },
    { label: 'Part 1 Complete',  value: funnel.completedPart1 },
    { label: 'Module Complete',  value: funnel.completedModule },
  ]

  const data = {
    labels: stages.map(s => s.label),
    datasets: [{
      data: stages.map(s => s.value),
      backgroundColor: ['rgba(130,188,0,0.3)', 'rgba(130,188,0,0.5)', 'rgba(130,188,0,0.7)', 'rgba(130,188,0,0.95)'],
      borderRadius: 6,
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
          label: (ctx: { raw: unknown; dataIndex: number }) => {
            const pct = funnel.registered > 0
              ? Math.round(((stages[ctx.dataIndex]?.value ?? 0) / funnel.registered) * 100)
              : 0
            return ` ${ctx.raw} learners (${pct}% of registered)`
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
    },
  }

  return (
    <div className="card p-5 flex flex-col">
      <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Learner Funnel</h3>
      <div style={{ height: '200px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
