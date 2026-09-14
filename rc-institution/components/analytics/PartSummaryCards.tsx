import type { SMStat, PartNumber } from '@/lib/data/types'

function colColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

const PART_CONFIG: Record<PartNumber, { label: string; accent: string }> = {
  1: { label: 'Part 1', accent: 'bg-rc-green' },
  2: { label: 'Part 2', accent: 'bg-blue-400' },
  3: { label: 'Part 3', accent: 'bg-purple-400' },
}

interface PartSummaryCardsProps {
  smStats: SMStat[]
}

export function PartSummaryCards({ smStats }: PartSummaryCardsProps) {
  const parts: PartNumber[] = [1, 2, 3]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {parts.map(part => {
        const partStats = smStats.filter(s => s.partNumber === part)
        const totalAttempted = partStats.reduce((sum, s) => sum + s.studentsAttempted, 0)
        const totalCompleted = partStats.reduce((sum, s) => sum + s.studentsCompleted, 0)
        const completionRate = totalAttempted > 0
          ? Math.round((totalCompleted / totalAttempted) * 100)
          : 0

        const colValues = partStats.map(s => s.avgCOLPercent).filter((v): v is number => v !== null)
        const avgCOL = colValues.length > 0
          ? Math.round(colValues.reduce((a, b) => a + b, 0) / colValues.length)
          : null

        const cfg = PART_CONFIG[part]

        return (
          <div key={part} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${cfg.accent}`} />
              <h3 className="font-heading font-semibold text-inst-slate text-sm">{cfg.label}</h3>
              <span className="text-xs text-slate-500">({partStats.length} SMs)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Completion Rate</p>
                <p className="font-heading font-bold text-2xl text-inst-slate">{completionRate}%</p>
                <p className="text-xs text-slate-500">{totalCompleted}/{totalAttempted} attempts</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Avg COL</p>
                {avgCOL !== null ? (
                  <>
                    <p className={`font-heading font-bold text-2xl ${colColor(avgCOL)}`}>{avgCOL}%</p>
                    <p className="text-xs text-slate-500">{colValues.length} SMs with data</p>
                  </>
                ) : (
                  <>
                    <p className="font-heading font-bold text-2xl text-slate-300">—</p>
                    <p className="text-xs text-slate-500">No COL data yet</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
