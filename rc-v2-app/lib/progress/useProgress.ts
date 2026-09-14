'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Progress System — localStorage-backed progress tracking
//
// Persists section-level completions keyed by sub-module slug.
// Derives sub-module %, part %, and overall % from raw data.
//
// Data shape in localStorage (key: 'rc_v2_progress'):
// {
//   "greenhouse-gas-emissions": {
//     completedSections: ["s-intro", "s-gwp", ...],
//     startedAt: "ISO string",
//     completedAt?: "ISO string"
//   },
//   ...
// }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { PARTS, getSubModulesByPart, type PartNumber } from '@/lib/curriculum'

const STORAGE_KEY = 'rc_v2_progress'

// ── Raw storage shape ─────────────────────────────────────────────────────────

export interface SubModuleProgressRecord {
  completedSections: string[]
  startedAt:         string
  completedAt?:      string
  // Which section the learner most recently had open in this sub-module —
  // recorded on every section view (not just completions), so "where I
  // left off" reflects real reading position, not just completion state.
  resumeSectionId?:    string
  resumeSectionTitle?: string
  resumeSectionIndex?: number   // 1-based position within this sub-module
}

export type ProgressStore = Record<string, SubModuleProgressRecord>

// ── Read / write helpers (not hooks — safe to call anywhere) ──────────────────

export function readProgressStore(): ProgressStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressStore) : {}
  } catch {
    return {}
  }
}

function writeProgressStore(store: ProgressStore): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    // Dispatch a custom event so other hook instances on the same page react
    window.dispatchEvent(new Event('rc_progress_updated'))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ── Record reading position (for "continue where you left off") ──────────────

export function setResumePointer(
  subModuleSlug: string,
  sectionId:     string,
  sectionTitle:  string,
  sectionIndex:  number,
): void {
  const store  = readProgressStore()
  const record = store[subModuleSlug] ?? {
    completedSections: [],
    startedAt:         new Date().toISOString(),
  }
  record.resumeSectionId    = sectionId
  record.resumeSectionTitle = sectionTitle
  record.resumeSectionIndex = sectionIndex
  writeProgressStore({ ...store, [subModuleSlug]: record })
}

// ── Mark a section complete ────────────────────────────────────────────────────

export function markSectionComplete(
  subModuleSlug: string,
  sectionId:     string,
  totalSections: number,
): void {
  const store  = readProgressStore()
  const record = store[subModuleSlug] ?? {
    completedSections: [],
    startedAt:         new Date().toISOString(),
  }

  if (!record.completedSections.includes(sectionId)) {
    record.completedSections = [...record.completedSections, sectionId]
  }

  // Mark fully complete when all sections done
  if (
    record.completedSections.length >= totalSections &&
    !record.completedAt
  ) {
    record.completedAt = new Date().toISOString()
  }

  writeProgressStore({ ...store, [subModuleSlug]: record })
}

// ── Compute derived progress values ───────────────────────────────────────────

/** Returns 0–100 for a sub-module given its total section count */
export function getSubModulePercent(
  store:         ProgressStore,
  slug:          string,
  totalSections: number,
): number {
  if (totalSections === 0) return 0
  const record = store[slug]
  if (!record) return 0
  return Math.round((record.completedSections.length / totalSections) * 100)
}

/** Returns 0–100 for a Part (average across its sub-modules) */
export function getPartPercent(
  store:      ProgressStore,
  partNumber: PartNumber,
): number {
  const sms     = getSubModulesByPart(partNumber)
  if (sms.length === 0) return 0
  const total   = sms.reduce(
    (sum, sm) => sum + getSubModulePercent(store, sm.slug, sm.sectionCount),
    0,
  )
  return Math.round(total / sms.length)
}

/** Returns 0–100 across the entire module */
export function getOverallPercent(store: ProgressStore): number {
  const allSMs  = PARTS.flatMap(p => p.subModules)
  if (allSMs.length === 0) return 0
  const total   = allSMs.reduce(
    (sum, sm) => sum + getSubModulePercent(store, sm.slug, sm.sectionCount),
    0,
  )
  return Math.round(total / allSMs.length)
}

// ── React hook ────────────────────────────────────────────────────────────────

export interface ResumePointer {
  sectionId:    string
  sectionTitle: string
  sectionIndex: number
}

export interface UseProgressReturn {
  store:               ProgressStore
  markComplete:        (slug: string, sectionId: string, total: number) => void
  recordSectionView:   (slug: string, sectionId: string, sectionTitle: string, sectionIndex: number) => void
  subModulePercent:    (slug: string, total: number) => number
  partPercent:         (partNumber: PartNumber) => number
  overallPercent:      () => number
  isSubModuleStarted:  (slug: string) => boolean
  isSubModuleComplete: (slug: string) => boolean
  completedSectionsFor:(slug: string) => string[]
  resumePointerFor:    (slug: string) => ResumePointer | null
}

export function useProgress(): UseProgressReturn {
  // Initialise with an empty store so server and client render identically,
  // avoiding the Next.js hydration mismatch caused by reading localStorage
  // during useState initialisation (localStorage is unavailable on the server).
  // The real stored data is loaded in the effect below, after hydration.
  const [store, setStore] = useState<ProgressStore>({})

  // After hydration: read localStorage and keep in sync with other updates
  useEffect(() => {
    // Load persisted progress on first mount (client-only, post-hydration)
    setStore(readProgressStore())

    function onUpdate() {
      setStore(readProgressStore())
    }
    window.addEventListener('rc_progress_updated', onUpdate)
    window.addEventListener('storage', onUpdate)   // cross-tab sync
    return () => {
      window.removeEventListener('rc_progress_updated', onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [])

  const markComplete = useCallback(
    (slug: string, sectionId: string, total: number) => {
      markSectionComplete(slug, sectionId, total)
      setStore(readProgressStore())
    },
    [],
  )

  const recordSectionView = useCallback(
    (slug: string, sectionId: string, sectionTitle: string, sectionIndex: number) => {
      setResumePointer(slug, sectionId, sectionTitle, sectionIndex)
      setStore(readProgressStore())
    },
    [],
  )

  return {
    store,
    markComplete,
    recordSectionView,
    subModulePercent:    (slug, total) => getSubModulePercent(store, slug, total),
    partPercent:         (partNumber)  => getPartPercent(store, partNumber),
    overallPercent:      ()            => getOverallPercent(store),
    isSubModuleStarted:  (slug)        => Boolean(store[slug]?.completedSections?.length),
    isSubModuleComplete: (slug)        => Boolean(store[slug]?.completedAt),
    completedSectionsFor:(slug)        => store[slug]?.completedSections ?? [],
    resumePointerFor:    (slug) => {
      const r = store[slug]
      if (!r?.resumeSectionId || !r.resumeSectionTitle || !r.resumeSectionIndex) return null
      return { sectionId: r.resumeSectionId, sectionTitle: r.resumeSectionTitle, sectionIndex: r.resumeSectionIndex }
    },
  }
}
