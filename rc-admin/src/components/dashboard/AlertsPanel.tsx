import type { PlatformAlert } from '@/lib/data/types'

const SEVERITY_STYLES: Record<PlatformAlert['severity'], { bar: string; icon: string; badge: string }> = {
  info:     { bar: 'bg-sky-400',    icon: 'ℹ',  badge: 'bg-sky-50 text-sky-700' },
  warning:  { bar: 'bg-amber-400',  icon: '⚠',  badge: 'bg-amber-50 text-amber-700' },
  critical: { bar: 'bg-red-500',    icon: '⚑',  badge: 'bg-red-50 text-red-700' },
}

interface AlertsPanelProps {
  alerts: PlatformAlert[]
  onDismiss?: (alertId: string) => void
  dismissingId?: string | null
}

export function AlertsPanel({ alerts, onDismiss, dismissingId }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-3">Alerts</h3>
        <div className="flex items-center gap-2 text-emerald-600 py-4">
          <span>✓</span>
          <p className="text-sm font-medium">All clear — no active alerts</p>
        </div>
      </div>
    )
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-adm-bg text-sm">Alerts</h3>
        <span className="text-xs text-slate-500">{alerts.length} active</span>
      </div>
      <div className="space-y-2">
        {sorted.map(alert => {
          const { bar, icon, badge } = SEVERITY_STYLES[alert.severity]
          return (
            <div key={alert.id} className="flex gap-3 p-3 rounded-lg border border-adm-cborder hover:bg-adm-page transition-colors">
              <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${bar}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs">{icon}</span>
                  <p className="text-xs font-semibold text-adm-bg">{alert.title}</p>
                  <span className={`stat-pill text-xs font-medium capitalize ml-auto ${badge}`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-slate-500">{alert.description}</p>
                {alert.affectedCount > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">{alert.affectedCount} affected</p>
                )}
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  disabled={dismissingId === alert.id}
                  className="text-xs font-semibold text-slate-500 hover:text-adm-bg transition-colors disabled:opacity-50 self-start flex-shrink-0"
                >
                  {dismissingId === alert.id ? 'Dismissing…' : 'Dismiss'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
