import type { ShortlistedCandidate } from '@/lib/data/types'

const STAGE_STYLES: Record<ShortlistedCandidate['stage'], { label: string; className: string }> = {
  interested:   { label: 'Interested',   className: 'bg-slate-100 text-slate-600' },
  contacted:    { label: 'Contacted',    className: 'bg-blue-100 text-blue-600' },
  interviewing: { label: 'Interviewing', className: 'bg-amber-100 text-amber-700' },
  offered:      { label: 'Offered',      className: 'bg-purple-100 text-purple-700' },
  hired:        { label: 'Hired',        className: 'bg-emerald-100 text-emerald-700' },
}

interface ShortlistSummaryProps {
  shortlisted: ShortlistedCandidate[]
}

export function ShortlistSummary({ shortlisted }: ShortlistSummaryProps) {
  const stageCounts = shortlisted.reduce<Record<string, number>>((acc, s) => {
    acc[s.stage] = (acc[s.stage] ?? 0) + 1
    return acc
  }, {})

  if (shortlisted.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Pipeline</h3>
        <p className="text-sm text-slate-500 text-center py-6">
          Your shortlist is empty. Browse the Talent Pool to add candidates.
        </p>
      </div>
    )
  }

  const stages: ShortlistedCandidate['stage'][] = ['interested', 'contacted', 'interviewing', 'offered', 'hired']

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-emp-navy text-sm">Pipeline</h3>
        <span className="text-xs text-slate-500">{shortlisted.length} total</span>
      </div>
      <div className="flex gap-2">
        {stages.map(stage => {
          const count = stageCounts[stage] ?? 0
          const { label, className } = STAGE_STYLES[stage]
          return (
            <div key={stage} className="flex-1 text-center">
              <div className={`badge ${className} w-full justify-center py-1.5 mb-1`}>
                <span className="font-bold text-sm">{count}</span>
              </div>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
