import type { SMStat } from '@/lib/data/types'

function colColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-100 text-emerald-700'
  if (pct >= 60) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

interface TopBottomSMsProps {
  smStats: SMStat[]
}

export function TopBottomSMs({ smStats }: TopBottomSMsProps) {
  const ranked = [...smStats]
    .filter(s => s.avgCOLPercent !== null)
    .sort((a, b) => (b.avgCOLPercent ?? 0) - (a.avgCOLPercent ?? 0))

  const top3    = ranked.slice(0, 3)
  const bottom3 = ranked.slice(-3).reverse()

  const Row = ({ sm, rank }: { sm: SMStat; rank: 'top' | 'bottom' }) => (
    <div className="flex items-center justify-between py-2 border-b border-inst-border last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-bold w-5 text-center ${rank === 'top' ? 'text-emerald-500' : 'text-red-400'}`}>
          {rank === 'top' ? '↑' : '↓'}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-inst-slate truncate">SM{sm.smId} · {sm.smTitle}</p>
          <p className="text-xs text-slate-500">{sm.studentsCompleted} completed</p>
        </div>
      </div>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${colColor(sm.avgCOLPercent ?? 0)}`}>
        {Math.round(sm.avgCOLPercent ?? 0)}%
      </span>
    </div>
  )

  const isEmpty = ranked.length === 0

  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      <h3 className="font-heading font-semibold text-inst-slate text-sm">Top & Bottom Sub-Modules</h3>
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500 text-center">No data yet — rankings will appear once students attempt sub-modules.</p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Highest COL</p>
            {top3.map(sm => <Row key={sm.smId} sm={sm} rank="top" />)}
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Lowest COL</p>
            {bottom3.map(sm => <Row key={sm.smId} sm={sm} rank="bottom" />)}
          </div>
        </>
      )}
    </div>
  )
}
