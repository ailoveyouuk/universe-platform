import type { PlatformActivityEvent } from '@/lib/data/types'

const EVENT_ICONS: Record<PlatformActivityEvent['type'], string> = {
  learner_registered:      '◉',
  learner_completed_sm:    '✓',
  learner_completed_part:  '◎',
  learner_completed_module:'★',
  institution_joined:      '⊞',
  employer_joined:         '◈',
  employer_shortlisted:    '⬡',
  col_score_low:           '⚑',
}

const EVENT_COLORS: Record<PlatformActivityEvent['type'], string> = {
  learner_registered:      'bg-rc-green/10 text-rc-green-dark',
  learner_completed_sm:    'bg-emerald-50 text-emerald-700',
  learner_completed_part:  'bg-emerald-100 text-emerald-800',
  learner_completed_module:'bg-adm-gold/10 text-adm-gold',
  institution_joined:      'bg-sky-50 text-sky-700',
  employer_joined:         'bg-purple-50 text-purple-700',
  employer_shortlisted:    'bg-slate-50 text-slate-600',
  col_score_low:           'bg-red-50 text-red-600',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

interface PlatformActivityFeedProps {
  events: PlatformActivityEvent[]
  onRemove?: (eventId: string) => void
  removingId?: string | null
}

export function PlatformActivityFeed({ events, onRemove, removingId }: PlatformActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="card p-5 flex flex-col h-full">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Platform Activity</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-500">No activity yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col">
      <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Platform Activity</h3>
      <div className="space-y-0">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-3 py-2.5 border-b border-adm-cborder last:border-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${EVENT_COLORS[event.type]}`}>
              {EVENT_ICONS[event.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-adm-bg">{event.description}</p>
              <p className="text-xs text-slate-500 mt-0.5">{timeAgo(event.timestamp)}</p>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(event.id)}
                disabled={removingId === event.id}
                title="Remove this event (e.g. test/seed data)"
                className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {removingId === event.id ? '…' : '✕'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
