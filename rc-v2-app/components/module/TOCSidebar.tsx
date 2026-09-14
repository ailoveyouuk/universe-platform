'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Section } from '@/types'

interface TOCSidebarProps {
  moduleTitle:     string
  part:            number
  subModuleTitle:  string
  sections:        Section[]
  activeSectionId: string
  completedIds:    Set<string>
  progress:        number
  onSectionClick:  (id: string) => void
}

export function TOCSidebar({
  moduleTitle, part, subModuleTitle, sections,
  activeSectionId, completedIds, progress, onSectionClick,
}: TOCSidebarProps) {
  return (
    <aside className="rc-sidebar flex-shrink-0 scrollbar-hidden">
      {/* Back to dashboard */}
      <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Module meta */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <span className="rc-tag bg-rc-green/20 text-rc-green text-xs mb-2 inline-block">
          Part {part}
        </span>
        <h2 className="font-heading font-bold text-white text-sm leading-snug mb-4">
          {subModuleTitle}
        </h2>
        <ProgressBar value={progress} showLabel size="sm" />
      </div>

      {/* Table of contents */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain scrollbar-hidden">
        <p className="nav-label">Sections</p>
        <div className="space-y-1">
          {sections.map((section, i) => {
            const isActive    = section._id === activeSectionId
            const isCompleted = completedIds.has(section._id)
            return (
              <button
                key={section._id}
                onClick={() => onSectionClick(section._id)}
                className={clsx(
                  'toc-item w-full text-left',
                  isActive    && 'active',
                  isCompleted && !isActive && 'completed',
                  !isActive && !isCompleted && 'upcoming',
                )}
              >
                {/* Status dot */}
                <span className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <span className="text-rc-green text-xs">✓</span>
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-rc-green animate-pulse block" />
                  ) : (
                    <span className="status-dot" />
                  )}
                </span>

                {/* Section info */}
                <span className="flex-1 min-w-0">
                  <span className={clsx(
                    'block text-xs font-medium leading-snug truncate',
                    isActive ? 'text-rc-green' : isCompleted ? 'text-white/50' : 'text-white/40',
                  )}>
                    <span className="text-white/25 mr-1">{i + 1}.</span>
                    {section.title}
                  </span>
                  <span className="block text-xs mt-0.5 text-white/25">
                    {isCompleted ? 'Completed' : `${section.estimatedMinutes}m`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
