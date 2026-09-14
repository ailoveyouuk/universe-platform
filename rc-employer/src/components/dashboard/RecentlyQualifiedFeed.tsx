import type { CandidateProfile } from '@/lib/data/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function levelLabel(level: CandidateProfile['completionLevel']): { label: string; className: string } {
  switch (level) {
    case 'module':  return { label: 'Module Complete', className: 'bg-amber-100 text-amber-700' }
    case 'part':    return { label: 'Part Complete',   className: 'bg-emerald-100 text-emerald-700' }
    case 'partial': return { label: 'In Progress',     className: 'bg-blue-100 text-blue-600' }
    default:        return { label: 'Getting Started', className: 'bg-slate-100 text-slate-500' }
  }
}

interface RecentlyQualifiedFeedProps {
  candidates: CandidateProfile[]
}

export function RecentlyQualifiedFeed({ candidates }: RecentlyQualifiedFeedProps) {
  if (candidates.length === 0) {
    return (
      <div className="card p-5 flex flex-col h-full">
        <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Recently Qualified</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500">No newly qualified candidates yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col h-full">
      <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Recently Qualified</h3>
      <div className="space-y-0">
        {candidates.slice(0, 10).map(c => {
          const { label, className } = levelLabel(c.completionLevel)
          return (
            <div key={c.id} className="flex items-start gap-3 py-2.5 border-b border-emp-border last:border-0">
              <div className="w-8 h-8 rounded-full bg-emp-navy/10 flex items-center justify-center flex-shrink-0">
                <span className="text-emp-navy text-xs font-bold font-heading">
                  {c.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-emp-navy">{c.displayName}</p>
                  <span className={`badge ${className}`}>{label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500">{c.smsCompleted}/15 SMs</p>
                  {c.avgCOLPercent !== null && (
                    <p className="text-xs text-slate-500">· COL {Math.round(c.avgCOLPercent)}%</p>
                  )}
                  {c.lastActiveAt && (
                    <p className="text-xs text-slate-500">· {timeAgo(c.lastActiveAt)}</p>
                  )}
                </div>
                {c.topSkillAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.topSkillAreas.slice(0, 3).map(skill => (
                      <span key={skill} className="text-xs bg-emp-accent/10 text-emp-accent px-1.5 py-0.5 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
