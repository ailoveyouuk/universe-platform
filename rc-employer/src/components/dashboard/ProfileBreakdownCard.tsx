'use client'
import type { ProfileTally } from '@/lib/data/types'

interface ProfileBreakdownCardProps {
  title: string
  tally: ProfileTally[]
  total: number          // denominator for the percentage bar -- opted-in candidates who answered this question
  maxRows?: number        // show at most this many rows, roll the rest into "+N more"
  accent?: 'blue' | 'green' | 'amber' | 'purple'
  emptyLabel?: string
}

const ACCENT_BAR: Record<NonNullable<ProfileBreakdownCardProps['accent']>, string> = {
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
}

// A single categorical or multi-select breakdown, rendered as a compact
// horizontal bar list rather than a chart.js instance -- the Insights page
// renders a couple dozen of these across all 8 candidate-profile sections,
// so plain CSS bars keep it light and keep every value's label legible.
export function ProfileBreakdownCard({ title, tally, total, maxRows = 6, accent = 'blue', emptyLabel }: ProfileBreakdownCardProps) {
  const shown = tally.slice(0, maxRows)
  const rest = tally.slice(maxRows)
  const restCount = rest.reduce((sum, t) => sum + t.count, 0)
  const maxCount = tally.length > 0 ? tally[0].count : 0

  return (
    <div className="card p-5 flex flex-col h-full">
      <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">{title}</h3>
      {shown.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-xs text-slate-400 text-center">{emptyLabel ?? 'No candidates have answered this yet'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map(row => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
            const widthPct = maxCount > 0 ? Math.max((row.count / maxCount) * 100, 4) : 0
            return (
              <div key={row.value}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs text-slate-600 truncate">{row.value}</span>
                  <span className="text-xs font-semibold text-emp-navy tabular-nums flex-shrink-0">{row.count} · {pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${ACCENT_BAR[accent]}`} style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            )
          })}
          {rest.length > 0 && (
            <p className="text-[11px] text-slate-400 pt-1">
              +{rest.length} more value{rest.length === 1 ? '' : 's'} ({restCount} candidate{restCount === 1 ? '' : 's'})
            </p>
          )}
        </div>
      )}
    </div>
  )
}
