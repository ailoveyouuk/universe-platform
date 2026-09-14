'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import {
  getAccessGrants, createAccessGrant, revokeAccessGrant,
  getInstitutions, getCohorts, searchLearnersByEmail,
  createBulkAccessGrants,
} from '@/lib/api/adminApi'
import type { BulkAccessGrantResult } from '@/lib/api/adminApi'
import type {
  AccessGrant, InstitutionSummary, CohortSummary, LearnerSearchResult,
} from '@/lib/data/types'

type TargetType = 'learner' | 'institution' | 'cohort'

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }

function grantTargetLabel(g: AccessGrant): string {
  if (g.learner)     return g.learner.user.displayName || g.learner.user.email
  if (g.institution) return g.institution.name
  if (g.cohort)      return g.cohort.name
  return '—'
}

function grantScopeLabel(g: AccessGrant): string {
  if (g.learnerId)     return 'Individual'
  if (g.institutionId) return g.institution?.type === 'CORPORATE' ? 'Institution (corporate)' : 'Institution (academic)'
  return 'Cohort'
}

// Bulk import format: one row per line, "email,parts" — parts uses ';' or
// '+' (not ',') so a row stays a two-field CSV line, e.g.:
//   jane@example.com,1;2;3
//   sam@example.com,all
// Blank lines and a header row starting with "email" are skipped.
interface ParsedBulkRow {
  raw: string
  email: string
  parts: number[]
  parseError: string | null
}

function parseBulkCSV(text: string): ParsedBulkRow[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.toLowerCase().startsWith('email,'))
    .map(line => {
      const [emailPart, partsPart] = line.split(',').map(s => s?.trim() ?? '')
      const email = emailPart ?? ''
      if (!email) return { raw: line, email, parts: [], parseError: 'missing email' }
      if (!partsPart) return { raw: line, email, parts: [], parseError: 'missing parts column' }

      if (partsPart.toLowerCase() === 'all') return { raw: line, email, parts: [1, 2, 3], parseError: null }

      const parts = partsPart.split(/[;+]/).map(p => Number(p.trim())).filter(n => !Number.isNaN(n))
      if (parts.length === 0 || !parts.every(p => [1, 2, 3].includes(p))) {
        return { raw: line, email, parts: [], parseError: 'parts must be 1, 2 and/or 3 (separated by ; or +), or "all"' }
      }
      return { raw: line, email, parts, parseError: null }
    })
}

export default function AccessGrantsPage() {
  const [grants, setGrants]   = useState<AccessGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([])
  const [cohorts, setCohorts]           = useState<CohortSummary[]>([])

  const [targetType, setTargetType]         = useState<TargetType>('learner')
  const [institutionId, setInstitutionId]   = useState('')
  const [cohortId, setCohortId]             = useState('')
  const [learnerEmail, setLearnerEmail]     = useState('')
  const [learnerResults, setLearnerResults] = useState<LearnerSearchResult[]>([])
  const [learnerId, setLearnerId]           = useState('')
  const [selectedLearner, setSelectedLearner] = useState<LearnerSearchResult | null>(null)
  const [parts, setParts]     = useState<Set<number>>(new Set())
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [showBulk, setShowBulk]     = useState(false)
  const [bulkText, setBulkText]     = useState('')
  const [bulkNotes, setBulkNotes]   = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkAccessGrantResult | null>(null)
  const [bulkError, setBulkError]   = useState<string | null>(null)

  async function loadGrants() {
    setLoading(true)
    setGrants(await getAccessGrants())
    setLoading(false)
  }

  useEffect(() => {
    loadGrants()
    getInstitutions().then(setInstitutions)
  }, [])

  useEffect(() => {
    if (targetType === 'cohort' && institutionId) {
      getCohorts(institutionId).then(setCohorts)
    } else {
      setCohorts([])
    }
    setCohortId('')
  }, [targetType, institutionId])

  function resetForm() {
    setTargetType('learner')
    setInstitutionId(''); setCohortId('')
    setLearnerEmail(''); setLearnerResults([]); setLearnerId(''); setSelectedLearner(null)
    setParts(new Set()); setNotes(''); setFormError(null)
  }

  function togglePart(p: number) {
    setParts(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  async function handleLearnerSearch() {
    setLearnerResults(await searchLearnersByEmail(learnerEmail))
  }

  async function handleSubmit() {
    setFormError(null)
    if (parts.size === 0) { setFormError('Select at least one part.'); return }

    const target =
      targetType === 'learner'     ? { learnerId } :
      targetType === 'institution' ? { institutionId } :
                                      { cohortId }

    const targetValue = Object.values(target)[0]
    if (!targetValue) { setFormError('Select a target before saving.'); return }

    setSaving(true)
    const created = await createAccessGrant({
      parts: Array.from(parts).sort((a, b) => a - b),
      notes: notes || undefined,
      source: 'manual',
      ...target,
    })
    setSaving(false)

    if (!created) { setFormError('Could not create the grant — check the API and try again.'); return }
    setShowForm(false)
    resetForm()
    loadGrants()
  }

  async function handleBulkSubmit() {
    setBulkError(null)
    setBulkResult(null)

    const parsed = parseBulkCSV(bulkText)
    if (parsed.length === 0) { setBulkError('Paste at least one row of "email,parts" before importing.'); return }
    if (parsed.length > 500) { setBulkError(`${parsed.length} rows — bulk import is capped at 500 rows per request. Split into batches.`); return }

    const badRows = parsed.filter(r => r.parseError)
    if (badRows.length > 0) {
      setBulkError(`${badRows.length} row(s) could not be parsed — fix these before importing: ${badRows.slice(0, 3).map(r => `"${r.raw}" (${r.parseError})`).join('; ')}${badRows.length > 3 ? '…' : ''}`)
      return
    }

    setBulkSaving(true)
    const result = await createBulkAccessGrants(
      parsed.map(r => ({ email: r.email, parts: r.parts })),
      { source: 'bulk-import', notes: bulkNotes || undefined },
    )
    setBulkSaving(false)

    if (!result) { setBulkError('Could not reach the API — check your connection and try again.'); return }
    setBulkResult(result)
    if (result.created > 0) loadGrants()
  }

  function resetBulkForm() {
    setBulkText(''); setBulkNotes(''); setBulkResult(null); setBulkError(null)
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this grant? The learner(s) will lose the parts it covers immediately.')) return
    const ok = await revokeAccessGrant(id)
    if (ok) loadGrants()
  }

  const now = Date.now()

  return (
    <AdminLayout
      title="Access grants"
      subtitle="Curriculum access — individual purchases and sponsored (institution / cohort) access. Institutions cover both academic and corporate sponsors."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowBulk(v => !v); if (showBulk) resetBulkForm(); if (!showBulk) setShowForm(false) }}
            className="inline-flex items-center gap-2 bg-adm-page text-adm-ink text-xs font-semibold px-4 py-2 rounded-lg border border-adm-border hover:bg-adm-border/50 transition-colors"
          >
            {showBulk ? 'Cancel' : 'Bulk import'}
          </button>
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); if (!showForm) setShowBulk(false) }}
            className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : '+ New grant'}
          </button>
        </div>
      }
    >
      {showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-4">New access grant</h3>

          <div className="flex items-center gap-2 mb-4">
            {(['learner', 'institution', 'cohort'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTargetType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  targetType === t ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {targetType === 'learner' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Learner email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={learnerEmail}
                  onChange={e => setLearnerEmail(e.target.value)}
                  placeholder="learner@example.com"
                  className="flex-1 border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
                />
                <button onClick={handleLearnerSearch} className="px-4 py-2 text-xs font-semibold bg-adm-page rounded-lg hover:bg-adm-border/50 transition-colors">
                  Search
                </button>
              </div>
              {learnerResults.length > 0 && (
                <div className="mt-2 border border-adm-border rounded-lg divide-y divide-adm-border">
                  {learnerResults.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setLearnerId(l.id); setSelectedLearner(l) }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-adm-page/70 transition-colors ${learnerId === l.id ? 'bg-rc-green/10' : ''}`}
                    >
                      <span className="font-semibold text-adm-ink">{l.user.displayName || l.user.email}</span>
                      <span className="text-adm-ink-muted"> · {l.user.email}{l.institution ? ` · ${l.institution.name}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedLearner && (
                <p className="text-xs text-rc-green-600 mt-1.5">Selected: {selectedLearner.user.displayName || selectedLearner.user.email}</p>
              )}
            </div>
          )}

          {(targetType === 'institution' || targetType === 'cohort') && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Institution</label>
              <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                <option value="">Select an institution…</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          )}

          {targetType === 'cohort' && institutionId && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Cohort</label>
              <select value={cohortId} onChange={e => setCohortId(e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                <option value="">Select a cohort…</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} ({c._count.learners} learners)</option>)}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Curriculum parts unlocked</label>
            <div className="flex gap-2">
              {[1, 2, 3].map(p => (
                <button
                  key={p}
                  onClick={() => togglePart(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    parts.has(p) ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                  }`}
                >
                  {PART_LABELS[p]}
                </button>
              ))}
              <button
                onClick={() => setParts(new Set([1, 2, 3]))}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-adm-page text-adm-ink-muted hover:text-adm-ink transition-colors"
              >
                All (Full course)
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Notes (optional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. WooCommerce order #1234, or bespoke package reference"
              className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
            />
          </div>

          <p className="text-xs text-adm-ink-muted mb-4">Access expires 365 days from today unless revoked earlier.</p>

          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create grant'}
          </button>
        </div>
      )}

      {showBulk && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">Bulk import access grants</h3>
          <p className="text-xs text-adm-ink-muted mb-4">
            One row per line: <code className="bg-adm-page px-1 py-0.5 rounded">email,parts</code> — parts separated
            by <code className="bg-adm-page px-1 py-0.5 rounded">;</code> or <code className="bg-adm-page px-1 py-0.5 rounded">+</code> (e.g.
            <code className="bg-adm-page px-1 py-0.5 rounded ml-1">1;2;3</code>), or <code className="bg-adm-page px-1 py-0.5 rounded">all</code> for
            the full course. Each learner must already have registered (signed in at least once) — this does not create accounts. Each row is
            independent, so one bad row won&apos;t block the rest. Capped at 500 rows per import.
          </p>

          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={'jane@example.com,1;2;3\nsam@example.com,all\nalex@example.com,1'}
            rows={8}
            className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm font-mono mb-4 text-adm-ink"
          />

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Notes (optional, applied to every row)</label>
            <input
              value={bulkNotes}
              onChange={e => setBulkNotes(e.target.value)}
              placeholder="e.g. 2026 pilot cohort roster import"
              className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
            />
          </div>

          <p className="text-xs text-adm-ink-muted mb-4">Access expires 365 days from today unless revoked earlier.</p>

          {bulkError && <p className="text-xs text-red-500 mb-3 whitespace-pre-wrap">{bulkError}</p>}

          {bulkResult && (
            <div className="mb-4 rounded-lg border border-adm-border overflow-hidden">
              <div className="px-3 py-2 bg-adm-page text-xs font-semibold text-adm-ink">
                {bulkResult.created} grant{bulkResult.created !== 1 ? 's' : ''} created
                {bulkResult.failed.length > 0 ? `, ${bulkResult.failed.length} row${bulkResult.failed.length !== 1 ? 's' : ''} failed` : ''}
              </div>
              {bulkResult.failed.length > 0 && (
                <div className="divide-y divide-adm-border max-h-48 overflow-y-auto">
                  {bulkResult.failed.map((f, i) => (
                    <div key={i} className="px-3 py-1.5 text-xs">
                      <span className="font-semibold text-adm-ink">{f.email || '(blank)'}</span>
                      <span className="text-red-500"> — {f.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleBulkSubmit}
            disabled={bulkSaving}
            className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {bulkSaving ? 'Importing…' : 'Import grants'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : grants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">⚿</p>
            <p className="text-adm-ink-muted text-sm">No access grants yet. Create one to unlock curriculum content for a learner or organisation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Parts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Granted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {grants.map(g => {
                const expired = new Date(g.expiresAt).getTime() <= now
                return (
                  <tr key={g.id} className="hover:bg-adm-page/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-adm-ink">{grantTargetLabel(g)}</td>
                    <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{grantScopeLabel(g)}</td>
                    <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{g.parts.map(p => PART_LABELS[p] ?? p).join(', ')}</td>
                    <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{new Date(g.grantedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{new Date(g.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${expired ? 'bg-slate-100 text-slate-500' : 'bg-rc-green/10 text-rc-green-600'}`}>
                        {expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!expired && (
                        <button onClick={() => handleRevoke(g.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
