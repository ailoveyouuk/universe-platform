'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Score Persistence
//
// Stores Confirmation of Learning scores in localStorage.
// Each attempt is recorded; the best score is always surfaced.
//
// Storage key: 'rc_v2_quiz_scores'
// Shape:
// {
//   "greenhouse-gas-emissions": {
//     attempts: [
//       { score: 7, total: 10, pct: 70, completedAt: "ISO", answers: [2,1,2,...] }
//     ],
//     bestScore: 8,
//     bestPct:   80,
//     passed:    true,
//   },
//   ...
// }
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rc_v2_quiz_scores'

export interface QuizAttempt {
  score:       number
  total:       number
  pct:         number
  passed:      boolean
  completedAt: string
  answers:     number[]   // selected option index per question
}

export interface SubModuleQuizRecord {
  attempts:  QuizAttempt[]
  bestScore: number
  bestPct:   number
  passed:    boolean
}

export type QuizStore = Record<string, SubModuleQuizRecord>

// ── Read / write ──────────────────────────────────────────────────────────────

export function readQuizStore(): QuizStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QuizStore) : {}
  } catch {
    return {}
  }
}

function writeQuizStore(store: QuizStore): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new Event('rc_quiz_updated'))
  } catch {
    // Fail silently
  }
}

// ── Save a completed quiz attempt ─────────────────────────────────────────────

export function saveQuizScore(
  subModuleSlug: string,
  score:         number,
  total:         number,
  answers:       number[],
): void {
  const store  = readQuizStore()
  const record = store[subModuleSlug] ?? { attempts: [], bestScore: 0, bestPct: 0, passed: false }

  const pct    = total > 0 ? Math.round((score / total) * 100) : 0
  const passed = pct >= 70

  const attempt: QuizAttempt = {
    score,
    total,
    pct,
    passed,
    completedAt: new Date().toISOString(),
    answers,
  }

  record.attempts  = [...record.attempts, attempt]
  record.bestScore = Math.max(record.bestScore, score)
  record.bestPct   = Math.max(record.bestPct,   pct)
  record.passed    = record.passed || passed

  writeQuizStore({ ...store, [subModuleSlug]: record })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSubModuleQuizRecord(slug: string): SubModuleQuizRecord | undefined {
  return readQuizStore()[slug]
}

/** Average best-pct across all sub-modules that have been attempted */
export function getAverageQuizScore(store: QuizStore): number {
  const records = Object.values(store)
  if (records.length === 0) return 0
  const total = records.reduce((sum, r) => sum + r.bestPct, 0)
  return Math.round(total / records.length)
}

/** How many sub-modules have a passed quiz score */
export function getPassedQuizCount(store: QuizStore): number {
  return Object.values(store).filter(r => r.passed).length
}

// ── React hook ────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

export function useQuizScores() {
  const [store, setStore] = useState<QuizStore>(() => readQuizStore())

  useEffect(() => {
    function onUpdate() { setStore(readQuizStore()) }
    window.addEventListener('rc_quiz_updated', onUpdate)
    window.addEventListener('storage',         onUpdate)
    return () => {
      window.removeEventListener('rc_quiz_updated', onUpdate)
      window.removeEventListener('storage',         onUpdate)
    }
  }, [])

  return {
    store,
    getRecord:       (slug: string) => store[slug],
    averageScore:    getAverageQuizScore(store),
    passedCount:     getPassedQuizCount(store),
    hasAttempted:    (slug: string) => Boolean(store[slug]?.attempts?.length),
    hasPassed:       (slug: string) => Boolean(store[slug]?.passed),
    bestPct:         (slug: string) => store[slug]?.bestPct ?? null,
  }
}
