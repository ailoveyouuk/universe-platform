'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SMGrid — 3×5 grid of sub-module tiles replacing the quiz score table
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { clsx } from 'clsx'
import type { SubModuleMeta } from '@/lib/curriculum'

// ── Part accent config ────────────────────────────────────────────────────────

const PART_CONFIG: Record<number, {
  bar:    string
  badge:  string
  text:   string
  numBg:  string
}> = {
  1: { bar: 'bg-rc-green',   badge: 'bg-rc-green-50 text-rc-green',   text: 'text-rc-green',   numBg: 'bg-rc-green' },
  2: { bar: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600',       text: 'text-blue-600',   numBg: 'bg-blue-500' },
  3: { bar: 'bg-purple-500', badge: 'bg-purple-50 text-purple-600',   text: 'text-purple-600', numBg: 'bg-purple-500' },
}

// ── Status config ─────────────────────────────────────────────────────────────

type SMStatus = 'complete' | 'inprogress' | 'available' | 'locked'

function statusLabel(s: SMStatus): string {
  switch (s) {
    case 'complete':   return 'Complete'
    case 'inprogress': return 'In Progress'
    case 'available':  return 'Not Started'
    case 'locked':     return 'Locked'
  }
}

function statusStyle(s: SMStatus): string {
  switch (s) {
    case 'complete':   return 'bg-emerald-50 text-emerald-700'
    case 'inprogress': return 'bg-amber-50 text-amber-700'
    case 'available':  return 'bg-slate-50 text-slate-500'
    case 'locked':     return 'bg-slate-50 text-slate-400'
  }
}

// ── Quiz score pill ───────────────────────────────────────────────────────────

function QuizPill({ pct, passed }: { pct: number; passed: boolean }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
      passed
        ? 'bg-rc-green-50 text-rc-green border border-rc-green/20'
        : 'bg-amber-50 text-amber-700 border border-amber-200',
    )}>
      {passed ? '✓' : '✗'} {pct}%
    </span>
  )
}

// ── SM tile ───────────────────────────────────────────────────────────────────

interface SMTileProps {
  sm:         SubModuleMeta
  status:     SMStatus
  quizPct:    number | null
  quizPassed: boolean
  href:       string
}

function SMTile({ sm, status, quizPct, quizPassed, href }: SMTileProps) {
  const cfg     = PART_CONFIG[sm.partNumber] ?? PART_CONFIG[1]
  const locked  = status === 'locked'

  const inner = (
    <div className={clsx(
      'bg-white rounded-xl border border-rc-border p-4',
      'flex flex-col gap-2.5 h-full',
      !locked && 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
      locked  && 'opacity-55',
    )}>

      {/* Top row: number + quiz score */}
      <div className="flex items-start justify-between gap-2">
        <span className={clsx(
          'w-7 h-7 rounded-lg flex items-center justify-center',
          'font-heading font-bold text-white flex-shrink-0',
          cfg.numBg,
        )} style={{ fontSize: 12 }}>
          {sm.id}
        </span>
        {quizPct !== null && (
          <QuizPill pct={quizPct} passed={quizPassed} />
        )}
      </div>

      {/* Title */}
      <p className="font-heading font-semibold text-rc-dark leading-snug line-clamp-2" style={{ fontSize: 13 }}>
        {sm.title}
      </p>

      {/* Footer: status + hours */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className={clsx('rc-tag text-xs', statusStyle(status))}>
          {statusLabel(status)}
        </span>
        <span className="text-rc-grey-light" style={{ fontSize: 11 }}>
          {sm.estimatedHours}h
        </span>
      </div>

      {/* Part accent bar at bottom */}
      <div className={clsx('h-0.5 rounded-full -mx-4 -mb-4', cfg.bar)} />
    </div>
  )

  return locked ? (
    <div className="flex flex-col">{inner}</div>
  ) : (
    <Link href={href} className="flex flex-col">
      {inner}
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface SMGridProps {
  subModules:      SubModuleMeta[]
  completedSlugs:  Set<string>
  inProgressSlugs: Set<string>
  quizScores:      Record<string, { bestPct: number; passed: boolean } | undefined>
  unlockedParts:   number[]
}

export function SMGrid({
  subModules,
  completedSlugs,
  inProgressSlugs,
  quizScores,
  unlockedParts,
}: SMGridProps) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-rc-dark mb-5">Your Sub-Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {subModules.map(sm => {
          const status: SMStatus =
            completedSlugs.has(sm.slug)             ? 'complete'   :
            inProgressSlugs.has(sm.slug)             ? 'inprogress' :
            unlockedParts.includes(sm.partNumber)    ? 'available'  : 'locked'

          const quiz = quizScores[sm.slug]

          return (
            <SMTile
              key={sm.id}
              sm={sm}
              status={status}
              quizPct={quiz?.bestPct ?? null}
              quizPassed={quiz?.passed ?? false}
              href={`/learn/module-1/${sm.slug}`}
            />
          )
        })}
      </div>
    </div>
  )
}
