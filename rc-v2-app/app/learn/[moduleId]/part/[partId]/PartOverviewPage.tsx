'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Part Overview Page
//
// Route: /learn/[moduleId]/part/[partId]
// e.g.   /learn/module-1/part/1
//
// Shows a graphical hero + 5 sub-module cards for the selected Part.
// Progress is read live from localStorage via useProgress().
// ─────────────────────────────────────────────────────────────────────────────

import { useParams }       from 'next/navigation'
import Link                from 'next/link'
import { clsx }            from 'clsx'
import { AppLayout }       from '@/components/layout/AppLayout'
import { ProgressBar }     from '@/components/ui/ProgressBar'
import { useProgress }     from '@/lib/progress/useProgress'
import { useLearnerAccess } from '@/lib/access/useLearnerAccess'
import { getPartMeta }     from '@/lib/curriculum'
import type { SubModuleMeta, PartMeta } from '@/lib/curriculum'

// ── Part colour config ────────────────────────────────────────────────────────

const PART_THEME: Record<number, {
  heroBg:      string
  heroGlow:    string
  accent:      string
  accentLight: string
  accentTag:   string
  accentText:  string
  cardBorder:  string
  progressBar: string
  badgeBg:     string
  badgeText:   string
  orbA:        string
  orbB:        string
}> = {
  1: {
    heroBg:      'from-[#0d1f0d] via-[#0f2d14] to-[#111827]',
    heroGlow:    'from-rc-green/20 via-transparent to-transparent',
    accent:      '#82BC00',
    accentLight: '#f4fae6',
    accentTag:   'bg-rc-green-50 text-rc-green',
    accentText:  'text-rc-green',
    cardBorder:  'hover:border-rc-green/50',
    progressBar: 'bg-rc-green',
    badgeBg:     'bg-rc-green-50',
    badgeText:   'text-rc-green',
    orbA:        'bg-rc-green/10',
    orbB:        'bg-rc-green/5',
  },
  2: {
    heroBg:      'from-[#0d1525] via-[#0f1e35] to-[#111827]',
    heroGlow:    'from-blue-500/20 via-transparent to-transparent',
    accent:      '#3b82f6',
    accentLight: '#eff6ff',
    accentTag:   'bg-blue-50 text-blue-600',
    accentText:  'text-blue-500',
    cardBorder:  'hover:border-blue-400/50',
    progressBar: 'bg-blue-500',
    badgeBg:     'bg-blue-50',
    badgeText:   'text-blue-600',
    orbA:        'bg-blue-500/10',
    orbB:        'bg-blue-400/5',
  },
  3: {
    heroBg:      'from-[#160d25] via-[#1c1035] to-[#111827]',
    heroGlow:    'from-purple-500/20 via-transparent to-transparent',
    accent:      '#a855f7',
    accentLight: '#faf5ff',
    accentTag:   'bg-purple-50 text-purple-600',
    accentText:  'text-purple-500',
    cardBorder:  'hover:border-purple-400/50',
    progressBar: 'bg-purple-500',
    badgeBg:     'bg-purple-50',
    badgeText:   'text-purple-600',
    orbA:        'bg-purple-500/10',
    orbB:        'bg-purple-400/5',
  },
}

// ── Sub-module number icons ───────────────────────────────────────────────────

const SM_ICONS: Record<number, string> = {
  1: '🌍', 2: '🎯', 3: '⚡', 4: '🌊', 5: '🌐',
  6: '💨', 7: '☢', 8: '☀', 9: '🌿', 10: '💧',
  11: '🔬', 12: '🏭', 13: '🌊', 14: '🧑‍💼', 15: '🔭',
}

// ── Sub-Module Card ───────────────────────────────────────────────────────────

function SubModuleCard({
  sm,
  theme,
  moduleId,
  progress,
  isStarted,
  isComplete,
  unlocked,
}: {
  sm:         SubModuleMeta
  theme:      typeof PART_THEME[1]
  moduleId:   string
  progress:   number
  isStarted:  boolean
  isComplete: boolean
  unlocked:   boolean
}) {
  const href = `/learn/${moduleId}/${sm.slug}`

  const statusLabel = isComplete
    ? 'Completed'
    : isStarted
    ? 'In Progress'
    : unlocked
    ? 'Available'
    : 'Locked'

  const statusStyle = isComplete
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : isStarted
    ? `${theme.badgeBg} ${theme.badgeText} border border-current/20`
    : unlocked
    ? 'bg-slate-50 text-slate-600 border border-slate-200'
    : 'bg-slate-100 text-slate-500 border border-slate-200'

  const cardContent = (
    <div className={clsx(
      'group relative bg-white rounded-2xl border border-rc-border p-6',
      'transition-all duration-300',
      'flex flex-col gap-5',
      unlocked
        ? `cursor-pointer shadow-card hover:shadow-card-hover ${theme.cardBorder} hover:-translate-y-0.5`
        : 'opacity-70 cursor-default',
    )}>

      {/* Top row: icon + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
          'transition-transform duration-300 group-hover:scale-110',
          unlocked ? theme.badgeBg : 'bg-slate-100',
        )}>
          {SM_ICONS[sm.id]}
        </div>

        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0', statusStyle)}>
          {statusLabel}
        </span>
      </div>

      {/* Sub-module number chip */}
      <div className="flex items-center gap-2">
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-md',
          unlocked ? theme.accentTag : 'bg-slate-100 text-slate-500',
        )}>
          SM {sm.id}
        </span>
        <span className="text-xs text-rc-grey-light">
          {sm.estimatedHours}h · {sm.sectionCount} sections
        </span>
      </div>

      {/* Title */}
      <div>
        <h3 className={clsx(
          'font-heading font-bold text-lg leading-snug mb-2',
          unlocked ? 'text-rc-dark' : 'text-rc-grey',
        )}>
          {sm.title}
        </h3>
        <p className="text-sm text-rc-grey leading-relaxed line-clamp-2">
          {sm.shortDescription}
        </p>
      </div>

      {/* Key topics */}
      <div className="flex flex-wrap gap-1.5">
        {sm.keyTopics.map(topic => (
          <span
            key={topic}
            className="text-xs px-2 py-0.5 rounded-full bg-rc-bg-main text-rc-grey border border-rc-border"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Progress bar (only if started) */}
      {isStarted && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-rc-grey-light">
            <span>Progress</span>
            <span className={theme.accentText}>{progress}%</span>
          </div>
          <div className="h-1.5 bg-rc-border rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-500', theme.progressBar)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA row */}
      {unlocked && (
        <div className={clsx(
          'flex items-center gap-1.5 text-sm font-semibold',
          theme.accentText,
          'group-hover:gap-2.5 transition-all duration-200',
        )}>
          <span>
            {isComplete ? 'Review Content' : isStarted ? 'Continue Learning' : 'Start Learning'}
          </span>
          <span>→</span>
        </div>
      )}

      {!unlocked && (
        <p className="text-xs text-slate-400 font-medium">
          🔒 Purchase this part to unlock
        </p>
      )}
    </div>
  )

  return unlocked ? (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  ) : (
    <div>{cardContent}</div>
  )
}

// ── Radial progress ring (SVG) ────────────────────────────────────────────────

function ProgressRing({
  value,
  color,
  size = 80,
  strokeWidth = 6,
}: {
  value: number
  color: string
  size?: number
  strokeWidth?: number
}) {
  const radius      = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset      = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartOverviewPage() {
  const params    = useParams()
  const moduleId  = typeof params?.moduleId === 'string' ? params.moduleId : 'module-1'
  const partIdStr = typeof params?.partId   === 'string' ? params.partId   : '1'
  const partNum   = parseInt(partIdStr, 10) as 1 | 2 | 3

  const part  = getPartMeta(partNum)
  const theme = PART_THEME[partNum] ?? PART_THEME[1]

  const { subModulePercent, partPercent, isSubModuleStarted, isSubModuleComplete } = useProgress()
  const { unlockedParts } = useLearnerAccess()
  const unlocked = unlockedParts.includes(partNum)

  if (!part) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Not Found' }]}>
        <p className="text-rc-grey">Part not found.</p>
      </AppLayout>
    )
  }

  const overallPartProgress = partPercent(partNum)
  const completedCount      = part.subModules.filter(sm => isSubModuleComplete(sm.slug)).length
  const availableCount      = unlocked ? part.subModules.length : 0
  const totalHours          = part.subModules.reduce((s, sm) => s + sm.estimatedHours, 0)

  // Find the next sub-module to resume/start
  const nextSM = unlocked
    ? part.subModules.find(sm => !isSubModuleComplete(sm.slug))
    : undefined

  return (
    <div className="min-h-screen bg-rc-bg-main">

      {/* ── Dark hero section ─────────────────────────────────────────────── */}
      <div className={clsx('relative bg-gradient-to-br overflow-hidden', theme.heroBg)}>

        {/* Decorative orbs */}
        <div className={clsx(
          'absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3',
          theme.orbA,
        )} />
        <div className={clsx(
          'absolute bottom-0 left-1/4 w-64 h-64 rounded-full blur-3xl translate-y-1/2',
          theme.orbB,
        )} />

        {/* Gradient glow (bottom fade) */}
        <div className={clsx(
          'absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t',
          theme.heroGlow,
        )} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/40 mb-8">
            <Link href="/dashboard" className="hover:text-white/70 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-white/70 transition-colors">
              Module 1
            </Link>
            <span>/</span>
            <span className="text-white/70">{part.title}: {part.subtitle}</span>
          </nav>

          {/* Hero content */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">

            {/* Left: title & description */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl">
                  {part.icon}
                </div>
                <span className="text-white/50 text-sm font-semibold uppercase tracking-widest">
                  Module 1 · {part.title}
                </span>
              </div>

              <h1 className="font-heading font-bold text-white text-2xl sm:text-3xl lg:text-4xl mb-3 leading-tight">
                {part.subtitle}
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-xl">
                {part.description}
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-5 mt-6">
                {[
                  { label: 'Sub-Modules',  value: `${part.subModules.length}` },
                  { label: 'Total Hours',   value: `${totalHours}h` },
                  { label: 'Now Available', value: `${availableCount} of ${part.subModules.length}` },
                  { label: 'Completed',     value: `${completedCount}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center sm:text-left">
                    <div className="font-heading font-bold text-white text-xl">{value}</div>
                    <div className="text-white/40 text-xs">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: progress ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="relative">
                <ProgressRing value={overallPartProgress} color={theme.accent} size={120} strokeWidth={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading font-bold text-white text-2xl">
                    {overallPartProgress}%
                  </span>
                  <span className="text-white/40 text-xs">Complete</span>
                </div>
              </div>
              {nextSM && (
                <Link href={`/learn/${moduleId}/${nextSM.slug}`}>
                  <button className="mt-1 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200">
                    {overallPartProgress > 0 ? 'Resume Learning →' : 'Start Part →'}
                  </button>
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Sub-module grid ────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Section header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="font-heading font-bold text-rc-dark text-2xl">Sub-Modules</h2>
            <p className="text-rc-grey text-sm mt-1">
              {completedCount} of {part.subModules.length} completed
            </p>
          </div>

          {/* Progress legend */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-rc-grey-light">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: theme.accent }} />
              In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Locked
            </span>
          </div>
        </div>

        {/* Cards grid — 2 col on md, 3 on xl, staggered visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {part.subModules.map((sm) => (
            <SubModuleCard
              key={sm.id}
              sm={sm}
              theme={theme}
              moduleId={moduleId}
              progress={subModulePercent(sm.slug, sm.sectionCount)}
              isStarted={isSubModuleStarted(sm.slug)}
              isComplete={isSubModuleComplete(sm.slug)}
              unlocked={unlocked}
            />
          ))}
        </div>

        {/* Part progress bar */}
        <div className="mt-10 bg-white rounded-2xl border border-rc-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold text-rc-dark">
              {part.title} — Overall Progress
            </span>
            <span className={clsx('font-heading font-bold text-xl', theme.accentText)}>
              {overallPartProgress}%
            </span>
          </div>
          <div className="h-3 bg-rc-bg-main rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', theme.progressBar)}
              style={{ width: `${overallPartProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-rc-grey-light">
            <span>0%</span>
            <span>100% — Certificate Unlocked</span>
          </div>
        </div>

        {/* Back to dashboard */}
        <div className="mt-8 flex justify-start">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-sm text-rc-grey hover:text-rc-dark transition-colors font-medium">
              ← Back to Dashboard
            </button>
          </Link>
        </div>

      </div>
    </div>
  )
}
