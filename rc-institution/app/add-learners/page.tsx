'use client'
import { useEffect, useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'
import { getCohorts, createCohort, bulkAddLearners } from '@/lib/api/institutionApi'
import type { BulkAddLearnersResult } from '@/lib/api/institutionApi'
import { InstitutionLayout } from '@/components/layout/InstitutionLayout'
import type { Cohort } from '@/lib/data/types'

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }

function partsLabel(parts: number[]): string {
  if (parts.length === 3) return 'Full course'
  return parts.map(p => PART_LABELS[p] ?? p).join(', ')
}

export default function AddLearnersPage() {
  // Sign-in gating now happens once, centrally, in InstitutionLayout (via InstitutionAccessGate).
  const { isAuthenticated, institution } = useInstitutionAuth()

  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [cohortId, setCohortId] = useState('')
  const [parts, setParts] = useState<Set<number>>(new Set())
  const [emailText, setEmailText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkAddLearnersResult | null>(null)

  // Inline "+ Create a new cohort" — lets an institution set up its own
  // cohort (name, duration, optional seat cap) right here, instead of
  // asking Renewables Connect to do it first. The curriculum access a new
  // cohort can be given is still capped by contractedParts, same as the
  // no-cohort path below — see rc-api's POST /api/institutions/:id/cohorts.
  const [showNewCohort, setShowNewCohort]         = useState(false)
  const [newCohortName, setNewCohortName]         = useState('')
  const [newCohortParts, setNewCohortParts]       = useState<Set<number>>(new Set())
  const [newCohortDuration, setNewCohortDuration] = useState(365)
  const [newCohortSeatCap, setNewCohortSeatCap]   = useState('')
  const [newCohortSaving, setNewCohortSaving]     = useState(false)
  const [newCohortError, setNewCohortError]       = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !institution) return
    getCohorts(institution.id).then(setCohorts)
  }, [isAuthenticated, institution])

  function togglePart(p: number) {
    setParts(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function toggleNewCohortPart(p: number) {
    setNewCohortParts(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function resetNewCohortForm() {
    setShowNewCohort(false)
    setNewCohortName(''); setNewCohortParts(new Set()); setNewCohortDuration(365); setNewCohortSeatCap(''); setNewCohortError(null)
  }

  async function handleCreateCohort() {
    if (!institution) return
    setNewCohortError(null)
    if (!newCohortName.trim()) { setNewCohortError('Give the cohort a name.'); return }
    if (newCohortParts.size === 0) { setNewCohortError('Select at least one part to grant.'); return }
    if (newCohortSeatCap && (!Number.isInteger(Number(newCohortSeatCap)) || Number(newCohortSeatCap) < 1)) {
      setNewCohortError('Seat cap must be a positive whole number, or left blank for unlimited.'); return
    }

    setNewCohortSaving(true)
    const { data, error: err } = await createCohort(institution.id, {
      name: newCohortName.trim(),
      parts: Array.from(newCohortParts).sort((a, b) => a - b),
      accessDurationDays: newCohortDuration,
      seatCap: newCohortSeatCap ? Number(newCohortSeatCap) : null,
    })
    setNewCohortSaving(false)

    if (!data) { setNewCohortError(err ?? 'Could not create the cohort — check your connection and try again.'); return }
    setCohorts(prev => [data, ...prev])
    setCohortId(data.id)
    resetNewCohortForm()
  }

  async function handleSubmit() {
    if (!institution) return
    setError(null)
    setResult(null)

    const lines = emailText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setError('Paste at least one email address, one per line.'); return }
    if (lines.length > 500) { setError(`${lines.length} rows — this is capped at 500 at a time. Split into batches.`); return }

    // Each line is "email" or "email, forename, surname" — names are
    // optional, but capturing them here personalises the welcome email
    // that goes out the moment each person signs in.
    const rows = lines.map(line => {
      const [email, firstName, lastName] = line.split(',').map(p => p.trim())
      return { email, firstName: firstName || undefined, lastName: lastName || undefined }
    })

    setSaving(true)
    const { data, error: err } = await bulkAddLearners(institution.id, {
      rows,
      cohortId: cohortId || undefined,
      parts: cohortId ? undefined : Array.from(parts).sort((a, b) => a - b),
    })
    setSaving(false)

    if (!data) { setError(err ?? 'Could not reach the API — check your connection and try again.'); return }
    setResult(data)
    if (data.created > 0) { setEmailText('') }
  }

  if (institution && !institution.selfServiceEnabled) {
    return (
      <InstitutionLayout title="Add learners" subtitle="Bulk-add learners to your own institution">
        <div className="card p-8 text-center max-w-xl mx-auto">
          <p className="text-3xl mb-3">🔒</p>
          <p className="text-sm font-semibold text-inst-slate mb-1">This isn&apos;t switched on for {institution.name} yet</p>
          <p className="text-sm text-slate-500">
            Ask your Renewables Connect contact to enable self-service learner adding for your institution — once they do, you&apos;ll
            be able to add learners here yourself, in bulk, with no back-and-forth needed.
          </p>
        </div>
      </InstitutionLayout>
    )
  }

  const availableParts = institution?.contractedParts ?? []
  const selectedCohort = cohortId ? cohorts.find(c => c.id === cohortId) : undefined

  return (
    <InstitutionLayout title="Add learners" subtitle="Bulk-add learners to your own institution — no RC involvement needed">
      <div className="card p-5 mb-5 max-w-2xl">
        <p className="text-xs text-slate-500 mb-4">
          One line per learner: email, or &quot;email, forename, surname&quot; to personalise their welcome email. Each becomes a
          pending invite — the real learner account, with whatever cohort and curriculum access you set below, is created
          automatically the moment that person signs in with their Microsoft account.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-inst-slate mb-1.5">Emails</label>
          <textarea
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            placeholder={'jane.doe@example.com, Jane, Doe\nsam.smith@example.com'}
            rows={8}
            className="w-full border border-inst-border rounded-lg px-3 py-2 text-sm font-mono text-inst-slate"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-inst-slate mb-1.5">Cohort (optional)</label>
          <select
            value={showNewCohort ? '__new__' : cohortId}
            onChange={e => {
              if (e.target.value === '__new__') { setShowNewCohort(true); return }
              setCohortId(e.target.value)
              if (showNewCohort) resetNewCohortForm()
            }}
            className="w-full border border-inst-border rounded-lg px-3 py-2 text-sm text-inst-slate"
          >
            <option value="">No cohort</option>
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            {availableParts.length > 0 && <option value="__new__">+ Create a new cohort…</option>}
          </select>

          {showNewCohort && (
            <div className="mt-3 p-3 rounded-lg border border-inst-border bg-inst-bg/60">
              <div className="mb-3">
                <label className="block text-xs font-semibold text-inst-slate mb-1.5">New cohort name</label>
                <input
                  type="text"
                  value={newCohortName}
                  onChange={e => setNewCohortName(e.target.value)}
                  placeholder="e.g. 2026 Intake"
                  className="w-full border border-inst-border rounded-lg px-3 py-2 text-sm text-inst-slate bg-white"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-inst-slate mb-1.5">Curriculum access this cohort grants</label>
                <div className="flex gap-2">
                  {availableParts.map(p => (
                    <button
                      key={p}
                      onClick={() => toggleNewCohortPart(p)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        newCohortParts.has(p) ? 'bg-rc-green text-white' : 'bg-white text-slate-500 hover:text-inst-slate border border-inst-border'
                      }`}
                    >
                      {PART_LABELS[p]}
                    </button>
                  ))}
                  {availableParts.length > 1 && (
                    <button
                      onClick={() => setNewCohortParts(new Set(availableParts))}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-500 hover:text-inst-slate border border-inst-border transition-colors"
                    >
                      All
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Capped at what your institution is contracted for: {partsLabel(availableParts)}.</p>
              </div>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-inst-slate mb-1.5">Access duration (days from redemption)</label>
                  <input
                    type="number"
                    min={1}
                    value={newCohortDuration}
                    onChange={e => setNewCohortDuration(Number(e.target.value) || 365)}
                    className="w-full border border-inst-border rounded-lg px-3 py-2 text-sm text-inst-slate bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-inst-slate mb-1.5">Seat cap (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={newCohortSeatCap}
                    onChange={e => setNewCohortSeatCap(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full border border-inst-border rounded-lg px-3 py-2 text-sm text-inst-slate bg-white"
                  />
                </div>
              </div>
              {newCohortError && <p className="text-xs text-red-500 mb-2">{newCohortError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateCohort}
                  disabled={newCohortSaving}
                  className="bg-rc-green text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {newCohortSaving ? 'Creating…' : 'Create cohort'}
                </button>
                <button onClick={resetNewCohortForm} className="text-xs text-slate-500 hover:text-inst-slate transition-colors px-2 py-1.5">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedCohort ? (
          <div className="mb-5 text-xs text-slate-500 bg-inst-bg rounded-lg px-3 py-2">
            <span className="font-semibold text-inst-slate">Access: </span>
            {partsLabel(selectedCohort.parts)} · {selectedCohort.accessDurationDays} days from sign-in — set by the &quot;{selectedCohort.name}&quot; cohort.
          </div>
        ) : (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-inst-slate mb-1.5">Curriculum access to grant</label>
            {availableParts.length === 0 ? (
              <p className="text-xs text-slate-500">No curriculum access is configured for your institution yet — ask your Renewables Connect contact.</p>
            ) : (
              <div className="flex gap-2">
                {availableParts.map(p => (
                  <button
                    key={p}
                    onClick={() => togglePart(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      parts.has(p) ? 'bg-rc-green text-white' : 'bg-inst-bg text-slate-500 hover:text-inst-slate'
                    }`}
                  >
                    {PART_LABELS[p]}
                  </button>
                ))}
                {availableParts.length > 1 && (
                  <button
                    onClick={() => setParts(new Set(availableParts))}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-inst-bg text-slate-500 hover:text-inst-slate transition-colors"
                  >
                    All
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1.5">
              Access from here lasts the platform default (365 days). For a defined intake with its own duration or seat limit, pick or create a cohort above instead.
              You can also leave this unselected to add them with no access yet.
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3 whitespace-pre-wrap">{error}</p>}

        {result && (
          <div className="mb-4 rounded-lg border border-inst-border overflow-hidden">
            <div className="px-3 py-2 bg-inst-bg text-xs font-semibold text-inst-slate">
              {result.created} learner{result.created !== 1 ? 's' : ''} added
              {result.failed.length > 0 ? `, ${result.failed.length} row${result.failed.length !== 1 ? 's' : ''} skipped` : ''}
            </div>
            {result.failed.length > 0 && (
              <div className="divide-y divide-inst-border max-h-48 overflow-y-auto">
                {result.failed.map((f, i) => (
                  <div key={i} className="px-3 py-1.5 text-xs">
                    <span className="font-semibold text-inst-slate">{f.email || '(blank)'}</span>
                    <span className="text-red-500"> — {f.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add learners'}
        </button>
      </div>
    </InstitutionLayout>
  )
}
