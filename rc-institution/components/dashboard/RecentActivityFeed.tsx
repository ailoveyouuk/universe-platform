import type { Student } from '@/lib/data/types'

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

interface RecentActivityFeedProps {
  students: Student[]
}

interface ActivityEvent {
  studentName: string
  action: string
  timestamp: string
}

export function RecentActivityFeed({ students }: RecentActivityFeedProps) {
  const events: ActivityEvent[] = []

  students.forEach(student => {
    Object.values(student.smProgress).forEach(p => {
      if (p.completedAt) {
        events.push({ studentName: student.name, action: `completed ${p.smTitle}`, timestamp: p.completedAt })
      } else if (p.startedAt && p.status === 'in_progress') {
        events.push({ studentName: student.name, action: `started ${p.smTitle}`, timestamp: p.startedAt })
      }
    })
  })

  const sorted = events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12)

  return (
    <div className="card p-5 flex flex-col h-full">
      <h3 className="font-heading font-semibold text-inst-slate text-sm mb-4">Recent Activity</h3>
      <div className="flex-1 overflow-y-auto space-y-0">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-slate-500">No activity yet — learner events will appear here in real time.</p>
          </div>
        ) : sorted.map((e, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b border-inst-border last:border-0">
            <div className="w-6 h-6 rounded-full bg-rc-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rc-green text-xs font-bold">{e.studentName.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-inst-slate">
                <span className="font-semibold">{e.studentName}</span>
                {' '}<span className="text-slate-500">{e.action}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{timeAgo(e.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
