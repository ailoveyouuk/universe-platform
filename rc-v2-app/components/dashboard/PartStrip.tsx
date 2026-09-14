'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PartStrip — compact horizontal part progress card
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { clsx } from 'clsx'
import type { PartMeta, SubModuleMeta } from '@/lib/curriculum'

// ── Part accent config ────────────────────────────────────────────────────────

const PART_CONFIG: Record<number, {
  bar:    string
  badge:  string
  text:   string
  glow:   string
}> = {
  1: { bar: 'bg-rc-green',  badge: 'bg-rc-green-50 text-rc-green',    text: 'text-rc-green',  glow: 'shadow-green' },
  2: { bar: 'bg-blue-500',  badge: 'bg-blue-50 text-blue-600',        text: 'text-blue-600',  glow: '' },
  3: { bar: 'bg-purple-500',badge: 'bg-purple-50 text-purple-600',    text: 'text-purple-600',glow: '' },
}

// ── SM pip ────────────────────────────────────────────────────────────────────

type PipStatus = 'complete' | 'inprogress' | 'available' | 'locked'

function SMPip({
  sm,
  status,
  barColor,
}: {
  sm: SubModuleMeta
  status: PipStatus
  barColor: string
}) {
  return (
    <div
      title={sm.title}
      className={clsx(
        'flex-1 h-1.5 rounded-full transition-all duration-500',
        status === 'complete'    && barColor,
        status === 'inprogress' && 'bg-amber-400',
        status === 'available'  && 'bg-rc-border',
        status === 'locked'     && 'bg-rc-border opacity-40',
      )}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PartStripProps {
  part:               PartMeta
  progress:           number   // 0–100
  completedSlugs:     Set<string>
  inProgressSlugs:    Set<string>
  unlockedParts:      number[]
  href:               string
}

export function PartStrip({
  part,
  progress,
  completedSlugs,
  inProgressSlugs,
  unlockedParts,
  href,
}: PartStripProps) {
  const cfg        = PART_CONFIG[part.number] ?? PART_CONFIG[1]
  const isStarted  = progress > 0
  const isComplete = progress === 100
  const totalHours = part.subModules.reduce((s, sm) => s + sm.estimatedHours, 0)
  const completedCount  = part.subModules.filter(sm => completedSlugs.has(sm.slug)).length

  return (
    <Link href={href} className="block group">
      <div className={clsx(
        'bg-white rounded-2xl border border-rc-border p-5',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200',
        'flex flex-col gap-4',
      )}>

        {/* Top row: badge + progress pct */}
        <div className="flex items-center justify-between">
          <span className={clsx('rc-tag text-xs font-semibold', cfg.badge)}>
            Part {part.number} · {part.subtitle}
          </span>
          <span className={clsx('font-heading font-bold text-base', cfg.text)}>
            {progress}%
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-heading font-semibold text-rc-dark text-sm leading-snug">
            {part.description}
          </h3>
          <p className="text-rc-grey-light text-xs mt-1">
            {completedCount}/{part.subModules.length} sub-modules · {totalHours}h
          </p>
        </div>

        {/* SM pip row */}
        <div className="flex gap-1">
          {part.subModules.map(sm => {
            const status: PipStatus =
              completedSlugs.has(sm.slug)           ? 'complete'   :
              inProgressSlugs.has(sm.slug)           ? 'inprogress' :
              unlockedParts.includes(sm.partNumber)  ? 'available'  : 'locked'
            return (
              <SMPip key={sm.id} sm={sm} status={status} barColor={cfg.bar} />
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-rc-bg-main rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-700', cfg.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* CTA */}
        <div className={clsx(
          'flex items-center gap-1 text-xs font-semibold',
          cfg.text,
          'group-hover:gap-2 transition-all duration-200',
        )}>
          <span>
            {isComplete ? 'Review' : isStarted ? 'Continue' : 'Explore'}
          </span>
          <span>→</span>
        </div>
      </div>
    </Link>
  )
}
