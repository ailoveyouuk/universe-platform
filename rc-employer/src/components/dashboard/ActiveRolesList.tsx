import type { JobRole } from '@/lib/data/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface ActiveRolesListProps {
  roles: JobRole[]
}

export function ActiveRolesList({ roles }: ActiveRolesListProps) {
  const open = roles.filter(r => r.status === 'open')

  if (open.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Open Roles</h3>
        <p className="text-sm text-slate-500 text-center py-6">
          No open roles. Add roles to match them against the talent pool.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-emp-navy text-sm">Open Roles</h3>
        <span className="text-xs text-slate-500">{open.length} open</span>
      </div>
      <div className="space-y-0">
        {open.map(role => (
          <div key={role.id} className="flex items-center justify-between py-2.5 border-b border-emp-border last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-emp-navy truncate">{role.title}</p>
              <p className="text-xs text-slate-500">{role.department} · Posted {timeAgo(role.postedAt)}</p>
            </div>
            <div className="text-right ml-4 flex-shrink-0">
              <p className="text-xs text-slate-500">Min {role.minSMsCompleted} SMs</p>
              {role.minCOLPercent && (
                <p className="text-xs text-slate-500">COL ≥ {role.minCOLPercent}%</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
