'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useCertificates — derives earned certificates from progress + curriculum
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { readProgressStore, type ProgressStore } from '@/lib/progress/useProgress'
import { useAuth } from '@/lib/auth/useAuth'
import { PARTS } from '@/lib/curriculum'
import type { CertificateRecord } from './types'

const MODULE_CONTEXT = 'Module 1 — An Introduction to Renewables & Clean Energy'
const MODULE_TITLE   = 'Module 1: An Introduction to Renewables & Clean Energy'
const CERTIFYING_BODY = 'Renewables Connect'

type PartAccent = 'rc-green' | 'blue-500' | 'purple-500'

const PART_ACCENTS: Record<number, PartAccent> = {
  1: 'rc-green',
  2: 'blue-500',
  3: 'purple-500',
}

function buildSmCert(
  store: ProgressStore,
  recipientName: string,
): CertificateRecord[] {
  const certs: CertificateRecord[] = []

  for (const part of PARTS) {
    for (const sm of part.subModules) {
      const record = store[sm.slug]
      if (record?.completedAt) {
        certs.push({
          id:            `sm-${sm.id}`,
          level:         'submodule',
          title:         sm.title,
          subtitle:      sm.shortDescription,
          moduleContext: MODULE_CONTEXT,
          recipientName,
          completedAt:   record.completedAt,
          partNumber:    sm.partNumber as 1 | 2 | 3,
          partAccent:    PART_ACCENTS[sm.partNumber],
          smId:          sm.id,
          certifyingBody: CERTIFYING_BODY,
          credentialId:  `RC-SM${String(sm.id).padStart(2, '0')}-${record.completedAt.slice(0, 10).replace(/-/g, '')}`,
        })
      }
    }
  }

  return certs
}

function buildPartCerts(
  store: ProgressStore,
  recipientName: string,
): CertificateRecord[] {
  const certs: CertificateRecord[] = []

  for (const part of PARTS) {
    const allComplete = part.subModules.every(sm => Boolean(store[sm.slug]?.completedAt))
    if (!allComplete) continue

    // Part completedAt = latest SM completedAt in this part
    const completedAt = part.subModules
      .map(sm => store[sm.slug]?.completedAt ?? '')
      .sort()
      .at(-1) ?? new Date().toISOString()

    certs.push({
      id:            `part-${part.number}`,
      level:         'part',
      title:         `${part.title}: ${part.subtitle}`,
      subtitle:      part.description,
      moduleContext: MODULE_CONTEXT,
      recipientName,
      completedAt,
      partNumber:    part.number as 1 | 2 | 3,
      partAccent:    PART_ACCENTS[part.number],
      certifyingBody: CERTIFYING_BODY,
      credentialId:  `RC-PT${part.number}-${completedAt.slice(0, 10).replace(/-/g, '')}`,
    })
  }

  return certs
}

function buildModuleCert(
  store: ProgressStore,
  recipientName: string,
): CertificateRecord | null {
  const allSMs = PARTS.flatMap(p => p.subModules)
  const allComplete = allSMs.every(sm => Boolean(store[sm.slug]?.completedAt))
  if (!allComplete) return null

  const completedAt = allSMs
    .map(sm => store[sm.slug]?.completedAt ?? '')
    .sort()
    .at(-1) ?? new Date().toISOString()

  return {
    id:            'module-1',
    level:         'module',
    title:         MODULE_TITLE,
    subtitle:      'Completed all 15 sub-modules across 3 parts',
    moduleContext: MODULE_CONTEXT,
    recipientName,
    completedAt,
    certifyingBody: CERTIFYING_BODY,
    credentialId:  `RC-MOD1-${completedAt.slice(0, 10).replace(/-/g, '')}`,
  }
}

export interface UseCertificatesReturn {
  smCerts:     CertificateRecord[]
  partCerts:   CertificateRecord[]
  moduleCert:  CertificateRecord | null
  totalEarned: number
}

export function useCertificates(): UseCertificatesReturn {
  const { user } = useAuth()
  const recipientName = user?.displayName ?? 'Learner'

  const [store, setStore] = useState<ProgressStore>({})

  useEffect(() => {
    setStore(readProgressStore())

    function onUpdate() {
      setStore(readProgressStore())
    }

    window.addEventListener('rc_progress_updated', onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener('rc_progress_updated', onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [])

  const smCerts    = buildSmCert(store, recipientName)
  const partCerts  = buildPartCerts(store, recipientName)
  const moduleCert = buildModuleCert(store, recipientName)

  const totalEarned = smCerts.length + partCerts.length + (moduleCert ? 1 : 0)

  return { smCerts, partCerts, moduleCert, totalEarned }
}
