'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { clsx }            from 'clsx'
import { TOCSidebar }      from '@/components/module/TOCSidebar'
import { ContentRenderer } from '@/components/module/ContentRenderer'
import { Button }          from '@/components/ui/Button'
import { TopHeader }       from '@/components/layout/TopHeader'
import { subModule1 }      from '@/content/sub-module-1'
import { subModule2 }      from '@/content/sub-module-2'
import { subModule3 }      from '@/content/sub-module-3'
import { subModule4 }      from '@/content/sub-module-4'
import { subModule5 }      from '@/content/sub-module-5'
import { subModule6 }      from '@/content/sub-module-6'
import { subModule7 }      from '@/content/sub-module-7'
import { subModule8 }      from '@/content/sub-module-8'
import { subModule9 }      from '@/content/sub-module-9'
import { subModule10 }     from '@/content/sub-module-10'
import { subModule11 }     from '@/content/sub-module-11'
import { subModule12 }     from '@/content/sub-module-12'
import { subModule13 }     from '@/content/sub-module-13'
import { subModule14 }     from '@/content/sub-module-14'
import { subModule15 }     from '@/content/sub-module-15'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link                from 'next/link'
import { useAuth }            from '@/lib/auth/useAuth'
import { useProgress }        from '@/lib/progress/useProgress'
import { useLearnerAccess }    from '@/lib/access/useLearnerAccess'
import { useProgressContext }  from '@/lib/progress/ProgressContext'
import { getSubModuleMeta }    from '@/lib/curriculum'
import type { SubModule, Section } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-module registry — add new sub-modules here as they are built
// ─────────────────────────────────────────────────────────────────────────────

const SUB_MODULE_REGISTRY: Record<string, SubModule> = {
  'greenhouse-gas-emissions': subModule1,
  'global-race-to-net-zero':  subModule2,
  'energy-transition':        subModule3,
  'fixed-offshore-wind':      subModule4,
  'floating-offshore-wind':   subModule5,
  'onshore-wind':             subModule6,
  'nuclear':                  subModule7,
  'solar':                    subModule8,
  'biomass':                  subModule9,
  'hydropower':               subModule10,
  'hydrogen':                 subModule11,
  'carbon-capture':           subModule12,
  'wave-tidal':               subModule13,
  'skills-roles':             subModule14,
  'future-renewables':        subModule15,
}

// ── Part number lookup (for breadcrumb + back link) ───────────────────────────

const SLUG_TO_PART: Record<string, number> = {
  'greenhouse-gas-emissions': 1,
  'global-race-to-net-zero':  1,
  'energy-transition':        1,
  'fixed-offshore-wind':      1,
  'floating-offshore-wind':   1,
  'onshore-wind':             2,
  'nuclear':                  2,
  'solar':                    2,
  'biomass':                  2,
  'hydropower':               2,
  'hydrogen':                 3,
  'carbon-capture':           3,
  'wave-tidal':               3,
  'skills-roles':             3,
  'future-renewables':        3,
}

// Curriculum order — the object literal above is already authored in
// programme order (5 sub-modules per part), so this just captures that
// as an explicit, indexable sequence for 'what comes next' navigation.
const SUB_MODULE_ORDER = Object.keys(SUB_MODULE_REGISTRY)

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function ModuleViewerInner() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router        = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const moduleId     = typeof params?.moduleId    === 'string' ? params.moduleId    : 'module-1'
  const slug         = typeof params?.subModuleId === 'string' ? params.subModuleId : ''
  const subModule    = SUB_MODULE_REGISTRY[slug] ?? subModule1
  const sections     = subModule.sections
  const meta         = getSubModuleMeta(slug)
  const partNum      = SLUG_TO_PART[slug] ?? 1
  // subModule.title is authored as "SM <n> — <title>" for the desktop
  // breadcrumb trail; the mobile heading already shows the number in its own
  // pill, so strip the prefix there to avoid "SM 1 — SM 1 — Title"-style repeats.
  const subModuleTitleShort = subModule.title.replace(/^SM\s*\d+\s*[\u2014-]\s*/i, '')

  // What comes after this sub-module, for the completion screen — the next
  // sub-module in programme order, and whether reaching it also crosses
  // into a new Part (both are just derived from position in the order).
  const orderIndex     = SUB_MODULE_ORDER.indexOf(slug)
  const nextSlug        = orderIndex >= 0 ? SUB_MODULE_ORDER[orderIndex + 1] : undefined
  const nextSubModule   = nextSlug ? SUB_MODULE_REGISTRY[nextSlug] : undefined
  const nextPartNum     = nextSlug ? SLUG_TO_PART[nextSlug] : undefined
  const isNewPart       = nextPartNum !== undefined && nextPartNum !== partNum
  const isProgrammeEnd  = !nextSlug

  // ?section= deep-link (used by quiz "review section" links)
  const deepLinkSection = searchParams?.get('section') ?? null

  // Access — which curriculum parts this learner has actually paid for.
  // While this is loading we treat the part as locked (never flash content
  // open before we know), so `unlocked` only becomes true once we have a
  // real answer.
  const { unlockedParts, loading: accessLoading, error: accessError } = useLearnerAccess()
  const unlocked = !accessLoading && unlockedParts.includes(partNum as 1 | 2 | 3)

  // Progress
  const { markComplete, completedSectionsFor, subModulePercent, recordSectionView } = useProgress()
  const { handleSMComplete } = useProgressContext()
  const persistedCompleted = new Set(completedSectionsFor(slug))

  const [activeSectionId, setActiveSectionId] = useState(() => {
    // Honour deep-link first, then resume from last incomplete, else start at beginning
    if (deepLinkSection && sections.some(s => s._id === deepLinkSection)) {
      return deepLinkSection
    }
    return sections.find(s => !persistedCompleted.has(s._id))?._id ?? sections[0]?._id ?? ''
  })
  const [completedIds,   setCompletedIds]    = useState<Set<string>>(new Set(Array.from(persistedCompleted)))
  const [mobileNavOpen,  setMobileNavOpen]   = useState(false)

  // Lock background scroll while the mobile TOC drawer is open — otherwise
  // iOS Safari lets a touch-drag inside the drawer scroll the page
  // underneath it instead of the drawer's own section list.
  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileNavOpen])
  const [readingProgress,setReadingProgress] = useState(0)
  const [justCompleted,  setJustCompleted]   = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const activeIndex    = sections.findIndex(s => s._id === activeSectionId)
  const activeSection: Section | undefined = sections[activeIndex]
  const totalSections  = sections.length
  const overallProgress = subModulePercent(slug, totalSections)

  // Record reading position for the dashboard's "continue where you left
  // off" card — every time the active section changes, not just on
  // completion, so it reflects real position even mid-section.
  useEffect(() => {
    if (!activeSection) return
    recordSectionView(slug, activeSection._id, activeSection.title, activeIndex + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, activeSection?._id])

  // Reading progress bar (tracks scroll position within current section)
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    function onScroll() {
      const scrollTop    = el!.scrollTop
      const scrollHeight = el!.scrollHeight - el!.clientHeight
      setReadingProgress(scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeSectionId])

  // Reset reading progress when section changes
  useEffect(() => {
    setReadingProgress(0)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSectionId])

  function markSectionDone(id: string) {
    if (!completedIds.has(id)) {
      const next = new Set(Array.from(completedIds).concat(id))
      setCompletedIds(next)
      markComplete(slug, id, totalSections)
    }
  }

  function goToSection(id: string) {
    if (activeSectionId) markSectionDone(activeSectionId)
    setActiveSectionId(id)
    setMobileNavOpen(false)
  }

  function goNext() {
    markSectionDone(activeSectionId)
    if (activeIndex < sections.length - 1) {
      setActiveSectionId(sections[activeIndex + 1]._id)
    } else {
      if (meta) handleSMComplete(meta, new Date().toISOString())
      setJustCompleted(true)
    }
  }

  function goPrev() {
    if (activeIndex > 0) setActiveSectionId(sections[activeIndex - 1]._id)
  }

  const totalMinutes  = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0)
  const remainingMins = sections.slice(activeIndex).reduce((sum, s) => sum + s.estimatedMinutes, 0)

  // ── Sign-in gate ────────────────────────────────────────────────────────────
  // This page renders outside AppLayout (full-width reading chrome), so it
  // needs its own guard. Without this, an unauthenticated visitor who
  // bookmarks or shares a direct module link previously hit an infinite
  // "Loading…" spinner (useLearnerAccess never resolves without a
  // learnerId) instead of ever being sent to sign in.
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-rc-bg-main">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-rc-grey text-sm">Redirecting to sign in…</p>
        </div>
      </div>
    )
  }

  // ── Locked screen ───────────────────────────────────────────────────────────
  // A learner without access to this part who lands here directly (a
  // bookmarked link, a shared URL, editing the address bar) sees a locked
  // message instead of the content — the dashboard already hides this as
  // a card, but that's a UI convenience, not the enforcement point.
  if (accessLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-rc-bg-main">
        <p className="text-rc-grey text-sm">Loading…</p>
      </div>
    )
  }

  // Resolution finished but genuinely failed (network error, or the backend
  // couldn't set up a learner profile for this account) — tell the learner
  // what happened instead of showing the "not unlocked" purchase message,
  // which would be actively misleading here.
  if (accessError) {
    return (
      <div className="flex h-screen items-center justify-center bg-rc-bg-main">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center text-4xl mx-auto mb-6">
            ⚠️
          </div>
          <h1 className="font-heading font-bold text-3xl text-rc-dark mb-3">
            Something went wrong
          </h1>
          <p className="text-rc-grey mb-8">{accessError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 rounded-xl bg-rc-green text-white font-semibold hover:bg-rc-green-600 transition-colors"
            >
              Try again
            </button>
            <Link href="/dashboard">
              <button className="w-full px-6 py-3 rounded-xl bg-slate-100 text-rc-dark font-semibold hover:bg-slate-200 transition-colors">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-rc-bg-main">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-4xl mx-auto mb-6">
            🔒
          </div>
          <h1 className="font-heading font-bold text-3xl text-rc-dark mb-3">
            This part isn't unlocked yet
          </h1>
          <p className="text-rc-grey mb-8">
            <span className="font-semibold text-rc-dark">{subModule.title}</span> is part of Part {partNum},
            which isn't included in your current access. Contact your institution or employer, or purchase
            access, to unlock it.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <button className="w-full px-6 py-3 rounded-xl bg-rc-green text-white font-semibold hover:bg-rc-green-600 transition-colors">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Completion screen ───────────────────────────────────────────────────────
  if (justCompleted) {
    return (
      <div className="flex h-screen items-center justify-center bg-rc-bg-main">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 rounded-full bg-rc-green-50 border-2 border-rc-green flex items-center justify-center text-4xl mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-heading font-bold text-3xl text-rc-dark mb-3">
            Sub-Module Complete!
          </h1>
          <p className="text-rc-grey mb-2">
            You've completed <span className="font-semibold text-rc-dark">{subModule.title}</span>.
          </p>
          {meta && (
            <p className="text-rc-grey mb-8 text-sm">
              Sub-Module {meta.id} of 15 · Part {partNum}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {!isProgrammeEnd && nextSlug && nextSubModule && (
              <Link href={`/learn/${moduleId}/${nextSlug}`}>
                <button className="w-full px-6 py-3 rounded-xl bg-rc-green text-white font-semibold hover:bg-rc-green-600 transition-colors">
                  {isNewPart
                    ? `Start Part ${nextPartNum}: ${nextSubModule.title} →`
                    : `Next: ${nextSubModule.title} →`}
                </button>
              </Link>
            )}
            {isProgrammeEnd && (
              <div className="px-4 py-3 rounded-xl bg-rc-green-50 border border-rc-green text-rc-dark text-sm font-medium">
                🎉 That's the whole programme complete — nice work.
              </div>
            )}
            <Link href={`/learn/${moduleId}/part/${partNum}`}>
              <button className={clsx(
                'w-full px-6 py-3 rounded-xl transition-colors',
                !isProgrammeEnd && nextSlug
                  ? 'border border-rc-border text-rc-grey hover:border-rc-dark hover:text-rc-dark text-sm'
                  : 'bg-rc-green text-white font-semibold hover:bg-rc-green-600',
              )}>
                Back to Part {partNum} Overview →
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="w-full px-6 py-3 rounded-xl border border-rc-border text-rc-grey hover:border-rc-dark hover:text-rc-dark transition-colors text-sm">
                Return to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main viewer ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-rc-bg-main">

      {/* Mobile TOC overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* TOC Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 flex md:relative',
        'transition-transform duration-300',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <TOCSidebar
          moduleTitle="Module 1"
          part={partNum as 1 | 2 | 3}
          subModuleTitle={subModule.title}
          sections={sections}
          activeSectionId={activeSectionId}
          completedIds={completedIds}
          progress={overallProgress}
          onSectionClick={goToSection}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <TopHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: `Part ${partNum}`,   href: `/learn/${moduleId}/part/${partNum}` },
            { label: subModule.title },
            { label: activeSection?.title ?? '' },
          ]}
          mobileHeading={{
            badge: meta ? `SM ${meta.id}` : `Part ${partNum}`,
            title: subModuleTitleShort,
            subtitle: activeSection?.title,
          }}
          onMobileMenuToggle={() => setMobileNavOpen(v => !v)}
          actions={
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-xs text-rc-grey-light">
                ⏱ {remainingMins}m remaining
              </span>
              <span className="text-xs font-semibold text-rc-green">
                {overallProgress}% complete
              </span>
            </div>
          }
        />

        {/* Reading progress track — always-visible grey track with a green
            fill, sitting in normal document flow directly under the header.
            Deliberately not layered over the header via position:fixed/
            absolute (see comment history) — this renders unconditionally on
            every browser since it isn't relying on any positioning context. */}
        <div className="h-1 bg-rc-border flex-shrink-0 relative overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-y-0 left-0 bg-rc-green transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Scrollable content */}
        <div ref={mainRef} className="flex-1 overflow-y-auto scrollbar-hidden">
          <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Section header */}
            <div className="mb-8 pb-6 border-b border-rc-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="rc-tag bg-rc-green-50 text-rc-green text-xs">
                  {activeIndex + 1} of {sections.length}
                </span>
                <span className="text-xs text-rc-grey-light">
                  {activeSection?.estimatedMinutes}m read
                </span>
                {completedIds.has(activeSectionId) && (
                  <span className="rc-tag bg-emerald-50 text-emerald-700 text-xs">
                    ✓ Completed
                  </span>
                )}
              </div>
              <h1 className="font-heading font-bold text-2xl text-rc-dark">
                {activeSection?.title}
              </h1>
            </div>

            {/* Content blocks */}
            {activeSection && activeSection.content.length > 0 ? (
              <ContentRenderer blocks={activeSection.content} />
            ) : (
              <div className="space-y-6">
                <div className="bg-rc-bg-main rounded-xl border border-rc-border p-6">
                  <h3 className="font-heading font-bold text-rc-dark mb-3">Learning Objectives</h3>
                  <ul className="space-y-2">
                    {subModule.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-rc-grey">
                        <span className="text-rc-green font-bold mt-0.5">✓</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-rc-border">
              <Button
                variant="outline"
                size="md"
                onClick={goPrev}
                disabled={activeIndex === 0}
              >
                ← Previous
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={goNext}
              >
                {activeIndex === sections.length - 1
                  ? '✓ Complete Sub-Module'
                  : `${sections[activeIndex + 1]?.title ?? 'Next'} →`}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense — required by Next.js App Router when using useSearchParams
export default function ModuleViewerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-rc-bg-main"><span className="text-rc-grey">Loading...</span></div>}>
      <ModuleViewerInner />
    </Suspense>
  )
}
