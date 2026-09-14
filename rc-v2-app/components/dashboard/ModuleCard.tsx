import Link from 'next/link'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

interface ModuleCardProps {
  title:        string
  description:  string
  part:         1 | 2 | 3
  hours:        number
  subModuleCount: number
  progress:     number   // 0–100
  locked?:      boolean
  href:         string
  icon:         string
}

const partAccents: Record<1|2|3, string> = {
  1: 'border-rc-green/40',
  2: 'border-blue-300/40',
  3: 'border-purple-300/40',
}

export function ModuleCard({
  title, description, part, hours, subModuleCount,
  progress, locked = false, href, icon,
}: ModuleCardProps) {
  const isStarted   = progress > 0
  const isCompleted = progress === 100

  return (
    <div className={clsx(
      'module-card border-2',
      partAccents[part],
      locked && 'opacity-60',
    )}>
      {/* Icon + badge row */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-rc-green-50 flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        {isCompleted ? (
          <Badge variant="green">Completed</Badge>
        ) : locked ? (
          <Badge variant="grey">Locked</Badge>
        ) : isStarted ? (
          <Badge variant="green">In Progress</Badge>
        ) : null}
      </div>

      {/* Title + description */}
      <div>
        <h3 className="font-heading font-bold text-rc-dark text-lg leading-snug">{title}</h3>
        <p className="text-rc-grey text-sm mt-1 leading-relaxed">{description}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-rc-grey-light">
        <span>⏱ {hours} hours</span>
        <span>📖 {subModuleCount} sub-modules</span>
      </div>

      {/* Progress */}
      <ProgressBar value={progress} showLabel size="sm" />

      {/* CTA */}
      {!locked && (
        <Link href={href} className="block">
          <Button
            variant={isStarted && !isCompleted ? 'primary' : 'outline'}
            fullWidth
          >
            {isCompleted ? 'Review Content' : isStarted ? 'Continue Learning →' : 'Start Learning →'}
          </Button>
        </Link>
      )}
    </div>
  )
}
