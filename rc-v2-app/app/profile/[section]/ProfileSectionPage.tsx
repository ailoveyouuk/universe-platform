'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter }             from 'next/navigation'
import Link                                  from 'next/link'
import { AppLayout }                         from '@/components/layout/AppLayout'
import { ProgressBar }                       from '@/components/ui/ProgressBar'
import { Button }                            from '@/components/ui/Button'
import { useAuth }                           from '@/lib/auth/useAuth'
import { useProfile }                        from '@/lib/profile/useProfile'
import { calcSectionCompletion, extractSectionData } from '@/lib/profile/completion'
import { Section1Form }                      from '@/components/profile/sections/Section1Form'
import { Section2Form }                      from '@/components/profile/sections/Section2Form'
import { Section3Form }                      from '@/components/profile/sections/Section3Form'
import { Section4Form }                      from '@/components/profile/sections/Section4Form'
import { Section5Form }                      from '@/components/profile/sections/Section5Form'
import { Section6Form }                      from '@/components/profile/sections/Section6Form'
import { Section7Form }                      from '@/components/profile/sections/Section7Form'
import { Section8Form }                      from '@/components/profile/sections/Section8Form'
import { Section9Form }                      from '@/components/profile/sections/Section9Form'
import type { CandidateProfile }             from '@rc/types'
import type { ProfileSection }               from '@/types/profile'

// ── Section metadata ──────────────────────────────────────────────────────────

const SECTION_META: Record<number, { name: string; icon: string }> = {
  1: { name: 'Who I am',              icon: '👤' },
  2: { name: 'My interests',          icon: '🎯' },
  3: { name: 'My experience',         icon: '💼' },
  4: { name: 'My qualifications',     icon: '🎓' },
  5: { name: 'My technical skills',   icon: '⚙️' },
  6: { name: 'My sector specialism',  icon: '🌱' },
  7: { name: 'My track record',       icon: '📈' },
  8: { name: 'My career aspirations', icon: '🚀' },
  9: { name: 'Visibility & consent',  icon: '👁️' },
}

type FormComponent = React.ComponentType<{
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}>

const SECTION_FORMS: Record<number, FormComponent> = {
  1: Section1Form, 2: Section2Form, 3: Section3Form,
  4: Section4Form, 5: Section5Form, 6: Section6Form,
  7: Section7Form, 8: Section8Form, 9: Section9Form,
}

// ── Save toast ────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'success' | 'error'

function SaveToast({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
      state === 'saving' ? 'bg-rc-dark text-white'
      : state === 'success' ? 'bg-rc-green text-white'
      : 'bg-red-600 text-white'
    }`}>
      {state === 'saving' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {state === 'success' && '✓'}
      {state === 'error' && '✕'}
      {state === 'saving' ? 'Saving…'
        : state === 'success' ? 'Saved successfully'
        : 'Save failed — please try again'}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SectionFormPage() {
  const params  = useParams()
  const router  = useRouter()
  const { isAuthenticated } = useAuth()
  const { profile, loading, updateSection } = useProfile()

  const sectionNum = parseInt(String(params.section), 10)
  const isValid    = sectionNum >= 1 && sectionNum <= 9 && !Number.isNaN(sectionNum)

  // Local draft state — initialised from fetched profile
  const [draft, setDraft]       = useState<Partial<CandidateProfile>>({})
  const [hydrated, setHydrated] = useState(false)
  const [saveState, setSave]    = useState<SaveState>('idle')

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  // Hydrate draft from fetched profile (once)
  useEffect(() => {
    if (!loading && !hydrated) {
      setDraft(profile)
      setHydrated(true)
    }
  }, [loading, profile, hydrated])

  const handleChange = useCallback((updates: Partial<CandidateProfile>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSave = async () => {
    setSave('saving')
    const sectionData = extractSectionData(draft, sectionNum as ProfileSection)
    const ok = await updateSection(sectionData)
    setSave(ok ? 'success' : 'error')
    setTimeout(() => setSave('idle'), 3000)
  }

  // 404 guard
  if (!isValid) {
    return (
      <AppLayout>
        <p className="text-rc-grey">Invalid section. <Link href="/profile" className="text-rc-green underline">Back to profile</Link></p>
      </AppLayout>
    )
  }

  const meta        = SECTION_META[sectionNum]
  const SectionForm = SECTION_FORMS[sectionNum]
  const completion  = calcSectionCompletion(draft, sectionNum as ProfileSection)
  const prevSection = sectionNum > 1 ? sectionNum - 1 : null
  const nextSection = sectionNum < 9 ? sectionNum + 1 : null

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Career Profile', href: '/profile' },
        { label: meta.name },
      ]}
    >
      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-rc-green-50 flex items-center justify-center text-2xl flex-shrink-0">
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <p className="text-xs font-semibold text-rc-grey-light uppercase tracking-widest">
              Section {sectionNum} of 9
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              completion.pct === 100 ? 'bg-rc-green text-white' : 'bg-rc-green-50 text-rc-green'
            }`}>
              {completion.pct}% complete
            </span>
          </div>
          <h1 className="font-heading font-bold text-xl text-rc-dark">{meta.name}</h1>
        </div>
        <Link
          href="/profile"
          className="text-sm text-rc-green hover:underline flex-shrink-0 hidden sm:block mt-1"
        >
          ← Back to profile
        </Link>
      </div>

      {/* Section progress bar */}
      <ProgressBar value={completion.pct} showLabel className="mb-8" />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-rc-border p-6 sm:p-8 mb-8">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-rc-border rounded-lg" />
            ))}
          </div>
        ) : (
          <SectionForm data={draft} onChange={handleChange} />
        )}
      </div>

      {/* ── Save + navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={saveState === 'saving'}
          className="sm:w-auto w-full"
        >
          Save section
        </Button>

        <div className="flex gap-3 flex-1">
          {prevSection && (
            <Link
              href={`/profile/${prevSection}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-rc-border text-rc-grey hover:border-rc-green hover:text-rc-green transition-colors"
            >
              ← Previous
            </Link>
          )}
          {nextSection && (
            <Link
              href={`/profile/${nextSection}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-rc-border text-rc-grey hover:border-rc-green hover:text-rc-green transition-colors"
            >
              Next →
            </Link>
          )}
          {!nextSection && (
            <Link
              href="/profile"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-rc-green text-rc-green hover:bg-rc-green hover:text-white transition-colors"
            >
              Back to profile →
            </Link>
          )}
        </div>
      </div>

      <SaveToast state={saveState} />
    </AppLayout>
  )
}
