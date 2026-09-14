import Link from 'next/link'
import { clsx } from 'clsx'
import type { PartMeta } from '@/lib/curriculum'

// ── Part-level accent map ─────────────────────────────────────────────────────

const PART_STYLES: Record<number, {
  border:        string
  iconBg:        string
  tagBg:         string
  tagText:       string
  progressBar:   string
  progressGlow:  string
  headingAccent: string
}> = {
  1: {
    border:        'border-rc-green/30 hover:border-rc-green/60',
    iconBg:        'bg-rc-green-50',
    tagBg:         'bg-rc-green-50',
    tagText:       'text-rc-green',
    progressBar:   'bg-rc-green',
    progressGlow:  'shadow-green',
    headingAccent: 'text-rc-green',
  },
  2: {
    border:        'border-blue-300/30 hover:border-blue-400/60',
    iconBg:        'bg-blue-50',
    tagBg:         'bg-blue-50',
    tagText:       'text-blue-600',
    progressBar:   'bg-blue-500',
    progressGlow:  '',
    headingAccent: 'text-blue-600',
  },
  3: {
    border:        'border-purple-300/30 hover:border-purple-400/60',
    iconBg:        'bg-purple-50',
    tagBg:         'bg-purple-50',
    tagText:       'text-purple-600',
    progressBar:   'bg-purple-500',
    progressGlow:  '',
    headingAccent: 'text-purple-600',
  },
}

interface PartCardProps {
  part:               PartMeta
  progress:           number   // 0–100
  completedSubModules: number
  locked:             boolean
  href:               string
}

export function PartCard({
  part,
  progress,
  completedSubModules,
  locked,
  href,
}: PartCardProps) {
  const styles       = PART_STYLES[part.number] ?? PART_STYLES[1]
  const isStarted    = progress > 0
  const isCompleted  = progress === 100
  const totalHours   = part.subModules.reduce((s, sm) => s + sm.estimatedHours, 0)
  const availableCount = part.subModules.filter(sm => sm.available).length

  const statusLabel = isCompleted
    ? 'Completed ✓'
    : isStarted
    ? 'In Progress'
    : locked
    ? 'Coming Soon'
    : 'Ready to Start'

  const statusStyle = isCompleted
    ? 'bg-emerald-50 text-emerald-700'
    : isStarted
    ? `${styles.tagBg} ${styles.tagText}`
    : locked
    ? 'bg-amber-50 text-amber-700'
    : 'bg-slate-50 text-slate-500'

  const card = (
    <div className={clsx(
      'module-card border-2 group',
      styles.border,
      'transition-all duration-300',
      locked && 'opacity-60',
      !locked && 'hover:shadow-card-hover hover:-translate-y-0.5',
    )}>

      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
          'transition-transform duration-300 group-hover:scale-110',
          styles.iconBg,
        )}>
          {part.icon}
        </div>
        <span className={clsx('rc-tag text-xs font-semibold', statusStyle)}>
          {statusLabel}
        </span>
      </div>

      {/* Title block */}
      <div>
        <p className={clsx('text-xs font-bold uppercase tracking-widest mb-1', styles.headingAccent)}>
          {part.title}
        </p>
        <h3 className="font-heading font-bold text-rc-dark text-lg leading-snug">
          {part.subtitle}
        </h3>
        <p className="text-rc-grey text-sm mt-1 leading-relaxed">
          {part.description}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-rc-grey-light">
        <span>⏱ {totalHours}h</span>
        <span>📖 {part.subModules.length} sub-modules</span>
        {!locked && (
          <span>✅ {availableCount} available now</span>
        )}
      </div>

      {/* Sub-module progress pills */}
      <div className="flex gap-1.5">
        {part.subModules.map((sm, i) => (
          <div
            key={sm.id}
            title={sm.title}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all duration-500',
              i < completedSubModules
                ? styles.progressBar
                : 'bg-rc-border',
            )}
          />
        ))}
      </div>

      {/* Overall progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-rc-grey-light">Part progress</span>
          <span className={clsx('font-semibold', styles.headingAccent)}>{progress}%</span>
        </div>
        <div className="h-2 bg-rc-bg-main rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-700', styles.progressBar)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      {!locked && (
        <div className={clsx(
          'flex items-center gap-1.5 text-sm font-semibold',
          styles.headingAccent,
          'group-hover:gap-3 transition-all duration-200',
        )}>
          <span>
            {isCompleted ? 'Review Part' : isStarted ? 'Continue Part' : 'Explore Sub-Modules'}
          </span>
          <span>→</span>
        </div>
      )}
    </div>
  )

  return locked ? (
    <div>{card}</div>
  ) : (
    <Link href={href} className="block">
      {card}
    </Link>
  )
}
