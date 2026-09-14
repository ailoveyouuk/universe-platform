'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useLearnerId } from '@/lib/auth/LearnerContext'
import { readProgressStore } from '@/lib/progress/useProgress'
import { updateSMProgress, submitCOLScore, issueCertificate } from '@/lib/api/learnerApi'
import { PARTS, getSubModulesByPart, type SubModuleMeta } from '@/lib/curriculum'

const MODULE_CONTEXT  = 'Module 1 — An Introduction to Renewables & Clean Energy'
const CERTIFYING_BODY = 'Renewables Connect'

const PART_ACCENTS = {
  1: 'rc-green',
  2: 'blue-500',
  3: 'purple-500',
} as const

interface ProgressContextValue {
  handleSMComplete:  (smMeta: SubModuleMeta, completedAt: string) => void
  handleCOLComplete: (smId: number, score: number, maxScore: number) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  // learnerId is the real Postgres Learner.id, resolved by LearnerContext via
  // /api/auth/register — NOT user.id (that's the Azure AD account id, and
  // sending it to the backend as a learnerId would just match no rows).
  const learnerId = useLearnerId()

  const handleSMComplete = useCallback(
    (smMeta: SubModuleMeta, completedAt: string) => {
      if (!learnerId) {
        console.error('[ProgressContext] no learnerId yet — SM completion will not sync to the backend', smMeta.slug)
        return
      }
      const recipientName = user?.displayName ?? 'Learner'

      // Persist SM status
      updateSMProgress(learnerId, smMeta.id, {
        status: 'completed',
        completedAt,
      }).catch(err => console.error('[ProgressContext] updateSMProgress failed', smMeta.slug, err))

      // Submodule certificate
      issueCertificate(learnerId, {
        level:          'submodule',
        title:          smMeta.title,
        subtitle:       smMeta.shortDescription,
        moduleContext:  MODULE_CONTEXT,
        recipientName,
        completedAt,
        partNumber:     smMeta.partNumber,
        partAccent:     PART_ACCENTS[smMeta.partNumber],
        smId:           smMeta.id,
        certifyingBody: CERTIFYING_BODY,
        credentialId:   `RC-SM${String(smMeta.id).padStart(2, '0')}-${completedAt.slice(0, 10).replace(/-/g, '')}`,
      }).catch(err => console.error('[ProgressContext] issueCertificate (submodule) failed', smMeta.slug, err))

      // Check part + module completion against local store.
      // markSectionComplete writes to localStorage synchronously before this fires,
      // so the store already reflects the just-completed SM.
      const store      = readProgressStore()
      const partSMs    = getSubModulesByPart(smMeta.partNumber)
      const partComplete = partSMs.every(sm => Boolean(store[sm.slug]?.completedAt))

      if (partComplete) {
        const partCompletedAt = partSMs
          .map(sm => store[sm.slug]?.completedAt ?? '')
          .sort()
          .at(-1) ?? completedAt

        const partMeta = PARTS.find(p => p.number === smMeta.partNumber)!

        issueCertificate(learnerId, {
          level:          'part',
          title:          `${partMeta.title}: ${partMeta.subtitle}`,
          subtitle:       partMeta.description,
          moduleContext:  MODULE_CONTEXT,
          recipientName,
          completedAt:    partCompletedAt,
          partNumber:     smMeta.partNumber,
          partAccent:     PART_ACCENTS[smMeta.partNumber],
          smId:           null,
          certifyingBody: CERTIFYING_BODY,
          credentialId:   `RC-PT${smMeta.partNumber}-${partCompletedAt.slice(0, 10).replace(/-/g, '')}`,
        }).catch(err => console.error('[ProgressContext] issueCertificate (part) failed', smMeta.partNumber, err))

        // Check full module
        const allSMs        = PARTS.flatMap(p => p.subModules)
        const moduleComplete = allSMs.every(sm => Boolean(store[sm.slug]?.completedAt))

        if (moduleComplete) {
          const moduleCompletedAt = allSMs
            .map(sm => store[sm.slug]?.completedAt ?? '')
            .sort()
            .at(-1) ?? completedAt

          issueCertificate(learnerId, {
            level:          'module',
            title:          'Module 1: An Introduction to Renewables & Clean Energy',
            subtitle:       'Completed all 15 sub-modules across 3 parts',
            moduleContext:  MODULE_CONTEXT,
            recipientName,
            completedAt:    moduleCompletedAt,
            partNumber:     null,
            partAccent:     null,
            smId:           null,
            certifyingBody: CERTIFYING_BODY,
            credentialId:   `RC-MOD1-${moduleCompletedAt.slice(0, 10).replace(/-/g, '')}`,
          }).catch(err => console.error('[ProgressContext] issueCertificate (module) failed', err))
        }
      }
    },
    [learnerId, user],
  )

  const handleCOLComplete = useCallback(
    (smId: number, score: number, maxScore: number) => {
      if (!learnerId) {
        console.error('[ProgressContext] no learnerId yet — COL score will not sync to the backend', smId)
        return
      }
      submitCOLScore(learnerId, smId, score, maxScore)
        .catch(err => console.error('[ProgressContext] submitCOLScore failed', smId, err))
    },
    [learnerId],
  )

  return (
    <ProgressContext.Provider value={{ handleSMComplete, handleCOLComplete }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgressContext must be used within ProgressProvider')
  return ctx
}
