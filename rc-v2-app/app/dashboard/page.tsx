'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — redesigned for clarity and data focus
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }               from 'react'
import Link                       from 'next/link'
import { AppLayout }              from '@/components/layout/AppLayout'
import { DashboardHero }          from '@/components/dashboard/DashboardHero'
import { PartStrip }              from '@/components/dashboard/PartStrip'
import { SMGrid }                 from '@/components/dashboard/SMGrid'
import { ProfileDashboardCard }   from '@/components/profile/ProfileDashboardCard'
import { useProgress }            from '@/lib/progress/useProgress'
import { useLearnerAccess }       from '@/lib/access/useLearnerAccess'
import { useQuizScores }          from '@/lib/progress/quizProgress'
import { useAuth }                from '@/lib/auth/useAuth'
import { useLearnerContext }      from '@/lib/auth/LearnerContext'
import { PARTS, getPartMeta }     from '@/lib/curriculum'

export default function DashboardPage() {
  const {
    overallPercent,
    partPercent,
    isSubModuleStarted,
    isSubModuleComplete,
    resumePointerFor,
  } = useProgress()

  const { store: quizStore, averageScore, passedCount } = useQuizScores()
  const { unlockedParts } = useLearnerAccess()
  const { user } = useAuth()
  const { isNewUser } = useLearnerContext()

  // Azure AD's displayName is a full name ("Jane Smith") — the greeting
  // only wants the forename, and falls back to null (no greeting shown)
  // rather than guessing from an email address.
  const forename = user?.displayName?.trim().split(/\s+/)[0] || null

  // ── Derived values ──────────────────────────────────────────────────────────

  const allSMs = useMemo(() => PARTS.flatMap(p => p.subModules), [])

  const completedSlugs = useMemo(
    () => new Set(allSMs.filter(sm => isSubModuleComplete(sm.slug)).map(sm => sm.slug)),
    [allSMs, isSubModuleComplete],
  )
  const inProgressSlugs = useMemo(
    () => new Set(
      allSMs
        .filter(sm => isSubModuleStarted(sm.slug) && !isSubModuleComplete(sm.slug))
        .map(sm => sm.slug),
    ),
    [allSMs, isSubModuleStarted, isSubModuleComplete],
  )

  const overall      = overallPercent()
  const completedSMs = completedSlugs.size

  // Best sub-module to resume (first in-progress, then first available not complete)
  const resumeSM =
    allSMs.find(sm => inProgressSlugs.has(sm.slug)) ??
    allSMs.find(sm => sm.available && !completedSlugs.has(sm.slug))

  // "Continue where you left off" breadcrumb — Module / Part / Sub-module,
  // plus the exact section if the learner has actually opened this
  // sub-module before (recorded by ModuleViewerPage on every section view).
  const resumePart    = resumeSM ? getPartMeta(resumeSM.partNumber) : undefined
  const resumeSection = resumeSM ? resumePointerFor(resumeSM.slug) : null

  // A learner who has opened and read into a sub-module, but not yet
  // completed a section within it, still counts as "started" for the
  // hero's headline/CTA — completedSMs/inProgressSlugs alone (which only
  // move on section completion) understated real engagement.
  const isStarted = completedSMs > 0 || inProgressSlugs.size > 0 || Boolean(resumeSection)

  // Deep-link straight to the exact section the learner was last reading
  // (ModuleViewerPage honours ?section= — see its `deepLinkSection` logic)
  // rather than defaulting to the sub-module's first section.
  const resumeHref = resumeSM
    ? `/learn/module-1/${resumeSM.slug}${resumeSection ? `?section=${resumeSection.sectionId}` : ''}`
    : null

  const resumeContext = resumeSM && resumePart
    ? {
        partNumber:      resumePart.number,
        partTitle:        resumePart.title,
        subModuleTitle:   resumeSM.title,
        sectionTitle:     resumeSection?.sectionTitle ?? null,
        sectionIndex:     resumeSection?.sectionIndex ?? null,
        sectionTotal:     resumeSM.sectionCount,
      }
    : null

  // Quiz scores keyed by slug for SMGrid
  const quizScoresBySlug = useMemo(
    () => Object.fromEntries(
      Object.entries(quizStore).map(([slug, record]) => [
        slug,
        record ? { bestPct: record.bestPct, passed: record.passed } : undefined,
      ]),
    ),
    [quizStore],
  )

  const avgScore = Object.keys(quizStore).length > 0 ? averageScore : null

  return (
    <AppLayout breadcrumbs={[{ label: 'Module 1' }, { label: 'Dashboard' }]}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <DashboardHero
        overallPct={overall}
        completedSMs={completedSMs}
        totalSMs={allSMs.length}
        avgQuizScore={avgScore}
        quizzesPassed={passedCount}
        resumeHref={resumeHref}
        isStarted={isStarted}
        forename={forename}
        isNewUser={isNewUser}
        resumeContext={resumeContext}
      />

      {/* ── Career Profile card ───────────────────────────────────────────── */}
      <div className="mb-4">
        <ProfileDashboardCard />
      </div>

      {/* ── Programme overview banner ──────────────────────────────────────── */}
      <Link href="/overview" className="block mb-6 group">
        <div className="bg-white border border-rc-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-rc-green-50 flex items-center justify-center flex-shrink-0 text-lg">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-rc-dark text-sm">Programme Overview</p>
            <p className="text-rc-grey-light text-xs mt-0.5 truncate">
              Full course structure · 10 elective modules · Module 1 breakdown · How it's delivered
            </p>
          </div>
          <span className="text-rc-green font-semibold text-sm flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-200">
            View →
          </span>
        </div>
      </Link>

      {/* ── Part progress strips ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {PARTS.map(part => (
          <PartStrip
            key={part.number}
            part={part}
            progress={partPercent(part.number)}
            completedSlugs={completedSlugs}
            inProgressSlugs={inProgressSlugs}
            unlockedParts={unlockedParts}
            href={`/learn/module-1/part/${part.number}`}
          />
        ))}
      </div>

      {/* ── Sub-module grid ─────────────────────────────────────────────────── */}
      <SMGrid
        subModules={allSMs}
        completedSlugs={completedSlugs}
        inProgressSlugs={inProgressSlugs}
        quizScores={quizScoresBySlug}
        unlockedParts={unlockedParts}
      />

    </AppLayout>
  )
}
