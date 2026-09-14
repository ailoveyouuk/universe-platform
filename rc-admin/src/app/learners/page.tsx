'use client'
import { useEffect, useState } from 'react'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import {
  getLearners, getLearnerDetail, deleteLearnerAccount,
  getInstitutions, getCohorts, createCohort,
  getLearnerInvites, createLearnerInvite, createBulkLearnerInvites, revokeLearnerInvite,
  importPeople,
} from '@/lib/api/adminApi'
import type { BulkLearnerInviteResult, ImportRow, ImportResult } from '@/lib/api/adminApi'
import * as XLSX from 'xlsx'
import { AdminLayout } from '@/components/layout/AdminLayout'
import type {
  LearnerListRow, LearnerDetail, InstitutionSummary, CohortSummary, LearnerInvite,
} from '@/lib/data/types'

const STATUS_STYLES: Record<string, string> = {
  completed:   'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-sky-50 text-sky-700',
  not_started: 'bg-slate-100 text-slate-500',
}

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }

const PAGE_SIZE = 25

// Where an invited learner signs in to redeem their invite — copy-pasted
// into the "copy invite" message since no invite email is wired up yet.
const LEARNER_APP_URL = 'https://brave-mushroom-0dc7bbe0f.7.azurestaticapps.net'

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export default function LearnersPage() {
  // Sign-in / invite gating now happens once, centrally, in AdminLayout (via AdminAccessGate).
  const { isAuthenticated, notInvited } = useAdminAuth()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<LearnerListRow[]>([])
  const [total, setTotal] = useState(0)
  const [listPage, setListPage] = useState(1)
  const [loadingList, setLoadingList] = useState(true)
  const [detail, setDetail] = useState<LearnerDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ── Add learner(s) ──────────────────────────────────────────────────────
  const [invites, setInvites] = useState<LearnerInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([])
  const [cohorts, setCohorts] = useState<CohortSummary[]>([])
  const [institutionId, setInstitutionId] = useState('')
  const [cohortId, setCohortId] = useState('')
  const [parts, setParts] = useState<Set<number>>(new Set())

  // Inline "+ Create a new cohort" — a cohort now defines its own access and
  // duration (see rc-api's provisionLearner), so this is how staff set that
  // up right here instead of first visiting the institution's own page.
  const [showNewCohort, setShowNewCohort]         = useState(false)
  const [newCohortName, setNewCohortName]         = useState('')
  const [newCohortParts, setNewCohortParts]       = useState<Set<number>>(new Set())
  const [newCohortDuration, setNewCohortDuration] = useState(365)
  const [newCohortSeatCap, setNewCohortSeatCap]   = useState('')
  const [newCohortSaving, setNewCohortSaving]     = useState(false)
  const [newCohortError, setNewCohortError]       = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [copiedFor, setCopiedFor] = useState<string | null>(null)

  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkLearnerInviteResult | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // ── Import spreadsheet (RC staff upload the bulk-add Excel template) ────
  const [showImport, setShowImport] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importParseError, setImportParseError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null)
  const [importPreviewing, setImportPreviewing] = useState(false)
  const [importCommitting, setImportCommitting] = useState(false)
  const [importCommitResult, setImportCommitResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function loadInvites() {
    setLoadingInvites(true)
    setInvites(await getLearnerInvites())
    setLoadingInvites(false)
  }

  useEffect(() => {
    loadInvites()
    getInstitutions().then(setInstitutions)
  }, [])

  useEffect(() => {
    if (institutionId) {
      getCohorts(institutionId).then(setCohorts)
    } else {
      setCohorts([])
    }
    setCohortId('')
  }, [institutionId])

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
    setNewCohortError(null)
    if (!institutionId) { setNewCohortError('Pick an institution first.'); return }
    if (!newCohortName.trim()) { setNewCohortError('Give the cohort a name.'); return }
    if (newCohortParts.size === 0) { setNewCohortError('Select at least one part to grant.'); return }
    if (newCohortSeatCap && (!Number.isInteger(Number(newCohortSeatCap)) || Number(newCohortSeatCap) < 1)) {
      setNewCohortError('Seat cap must be a positive whole number, or left blank for unlimited.'); return
    }

    setNewCohortSaving(true)
    const created = await createCohort({
      institutionId,
      name: newCohortName.trim(),
      parts: Array.from(newCohortParts).sort((a, b) => a - b),
      accessDurationDays: newCohortDuration,
      seatCap: newCohortSeatCap ? Number(newCohortSeatCap) : null,
    })
    setNewCohortSaving(false)

    if (!created) { setNewCohortError('Could not create the cohort — check the API and try again.'); return }
    setCohorts(prev => [created, ...prev])
    setCohortId(created.id)
    resetNewCohortForm()
  }

  function resetForm() {
    setInviteEmail(''); setInviteFirstName(''); setInviteLastName(''); setFormError(null)
  }

  function resetBulkForm() {
    setBulkText(''); setBulkResult(null); setBulkError(null)
  }

  function resetImportForm() {
    setImportFileName(''); setImportRows([]); setImportParseError(null)
    setImportPreview(null); setImportCommitResult(null); setImportError(null)
  }

  const IMPORT_COLUMNS: (keyof ImportRow)[] = [
    'email', 'firstName', 'surname', 'role', 'institution', 'newInstitutionName',
    'cohort', 'newCohortName', 'newCohortDurationDays', 'curriculumAccess', 'notes',
  ]

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a fix
    if (!file) return
    resetImportForm()
    setImportFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets['Add People'] ?? wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('Could not find an "Add People" sheet in this file.')
      // Matches RC_Bulk_Add_People_Template.xlsx: header row 3, example row 4, data from row 5.
      const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 4, blankrows: false })
      const rows: ImportRow[] = grid.map((r, i) => {
        const cell = (idx: number) => {
          const v = r[idx]
          return v === undefined || v === null ? '' : String(v).trim()
        }
        const row: ImportRow = { rowNumber: i + 5 }
        IMPORT_COLUMNS.forEach((key, idx) => {
          const raw = cell(idx)
          if (!raw) return
          if (key === 'newCohortDurationDays') {
            const n = Number(raw)
            if (!Number.isNaN(n)) row.newCohortDurationDays = n
          } else {
            ;(row as unknown as Record<string, string>)[key] = raw
          }
        })
        return row
      }).filter(row => row.email || row.institution || row.newInstitutionName)

      if (rows.length === 0) { setImportParseError('No usable rows found — check the file matches the bulk-add template.'); return }
      if (rows.length > 500) { setImportParseError(`${rows.length} rows — import is capped at 500 at a time. Split into batches.`); return }
      setImportRows(rows)
    } catch (err) {
      setImportParseError(err instanceof Error ? err.message : 'Could not read this file — make sure it is a .xlsx matching the bulk-add template.')
    }
  }

  async function handlePreviewImport() {
    setImportError(null)
    setImportPreviewing(true)
    const { data, error } = await importPeople(importRows, true)
    setImportPreviewing(false)
    if (!data) { setImportError(error ?? 'Could not preview this import — check the API and try again.'); return }
    setImportPreview(data)
  }

  async function handleConfirmImport() {
    setImportError(null)
    setImportCommitting(true)
    const { data, error } = await importPeople(importRows, false)
    setImportCommitting(false)
    if (!data) { setImportError(error ?? 'Could not complete this import — check the API and try again.'); return }
    setImportCommitResult(data)
    setImportPreview(null)
    if (data.learnerInvitesCreated > 0 || data.staffInvitesCreated > 0) loadInvites()
  }

  async function handleAddLearner() {
    setFormError(null)
    const trimmed = inviteEmail.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setFormError('Enter a valid email address.'); return }

    setSaving(true)
    const { data, error } = await createLearnerInvite({
      email: trimmed,
      firstName: inviteFirstName.trim() || undefined,
      lastName: inviteLastName.trim() || undefined,
      institutionId: institutionId || undefined,
      cohortId: cohortId || undefined,
      parts: (!cohortId && parts.size > 0) ? Array.from(parts).sort((a, b) => a - b) : undefined,
    })
    setSaving(false)

    if (!data) { setFormError(error ?? 'Could not add this learner — check the API and try again.'); return }
    setShowForm(false)
    resetForm()
    loadInvites()
  }

  async function handleBulkAdd() {
    setBulkError(null)
    setBulkResult(null)

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setBulkError('Paste at least one email address before adding.'); return }
    if (lines.length > 500) { setBulkError(`${lines.length} rows — bulk add is capped at 500 per request. Split into batches.`); return }

    // Each line is "email" or "email, forename, surname" — names are
    // optional, but capturing them here (not just via Excel import) is
    // what makes every welcome/update email properly personalised.
    const rows = lines.map(line => {
      const [email, firstName, lastName] = line.split(',').map(p => p.trim())
      return { email, firstName: firstName || undefined, lastName: lastName || undefined }
    })

    setBulkSaving(true)
    const result = await createBulkLearnerInvites(rows, {
      institutionId: institutionId || undefined,
      cohortId: cohortId || undefined,
      parts: (!cohortId && parts.size > 0) ? Array.from(parts).sort((a, b) => a - b) : undefined,
    })
    setBulkSaving(false)

    if (!result) { setBulkError('Could not reach the API — check your connection and try again.'); return }
    setBulkResult(result)
    if (result.created > 0) loadInvites()
  }

  async function handleRevokeInvite(id: string) {
    if (!confirm('Revoke this invite? They will no longer get access automatically when they sign in.')) return
    const { ok } = await revokeLearnerInvite(id)
    if (ok) loadInvites()
  }

  async function handleCopyInvite(inv: LearnerInvite) {
    const lines = [
      `Hi — you've been given access to Renewables Connect:`,
      `• Learner app (${LEARNER_APP_URL}) — sign in with your Microsoft account (${inv.email})`,
      '',
      "You'll get access the moment you sign in — nothing else to do.",
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopiedFor(inv.id)
      setTimeout(() => setCopiedFor(null), 2000)
    } catch {
      setFormError('Could not copy to clipboard.')
    }
  }

  async function loadListPage(targetPage: number, query: string) {
    if (!isAuthenticated || notInvited) return
    setLoadingList(true)
    const result = await getLearners({ page: targetPage, pageSize: PAGE_SIZE, q: query })
    if (result) {
      setRows(result.learners)
      setTotal(result.total)
      setListPage(result.page)
    }
    setLoadingList(false)
  }

  useEffect(() => {
    loadListPage(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, notInvited])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setDetail(null)
    await loadListPage(1, q)
  }

  async function openDetail(id: string) {
    setLoadingDetail(true)
    const data = await getLearnerDetail(id)
    setDetail(data)
    setLoadingDetail(false)
  }

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDeleteAccount() {
    if (!detail) return
    const confirmed = confirm(
      `Permanently delete ${detail.user.displayName}'s (${detail.user.email}) account? ` +
      `This removes their progress, certificates and access grants and cannot be undone — ` +
      `use this only for a genuine mistake, not to revoke someone's current access. ` +
      `A record that they registered stays in the Activity feed.`
    )
    if (!confirmed) return
    setDeleting(true)
    setDeleteError(null)
    const { ok, error } = await deleteLearnerAccount(detail.id)
    setDeleting(false)
    if (!ok) { setDeleteError(error ?? 'Could not delete this account.'); return }
    setDetail(null)
    await loadListPage(listPage, q)
  }

  const pendingInvites = invites.filter(i => !i.redeemedAt)

  return (
    <AdminLayout
      title="Learners"
      subtitle="Browse the learner directory, search by name or email, or add new learners"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowImport(v => !v); if (showImport) resetImportForm(); if (!showImport) { setShowForm(false); setShowBulk(false) } }}
            className="inline-flex items-center gap-2 bg-adm-page text-adm-ink text-xs font-semibold px-4 py-2 rounded-lg border border-adm-border hover:bg-adm-border/50 transition-colors"
          >
            {showImport ? 'Cancel' : 'Import spreadsheet'}
          </button>
          <button
            onClick={() => { setShowBulk(v => !v); if (showBulk) resetBulkForm(); if (!showBulk) { setShowForm(false); setShowImport(false) } }}
            className="inline-flex items-center gap-2 bg-adm-page text-adm-ink text-xs font-semibold px-4 py-2 rounded-lg border border-adm-border hover:bg-adm-border/50 transition-colors"
          >
            {showBulk ? 'Cancel' : 'Bulk add'}
          </button>
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); if (!showForm) { setShowBulk(false); setShowImport(false) } }}
            className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : '+ Add learner'}
          </button>
        </div>
      }
    >
      {showImport && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">Import from spreadsheet</h3>
          <p className="text-xs text-adm-ink-muted mb-4">
            Upload a completed copy of the bulk-add Excel template. Nothing is created until you review a preview and confirm —
            institutions and cohorts marked "new" are created first, then each row becomes a pending learner or staff invite,
            exactly like Add learner / Bulk add above.
          </p>

          {!importPreview && !importCommitResult && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Spreadsheet (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleImportFileChange}
                className="block w-full text-xs text-adm-ink file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-adm-page file:text-adm-ink hover:file:bg-adm-border/50 file:cursor-pointer cursor-pointer"
              />
              {importFileName && !importParseError && importRows.length > 0 && (
                <p className="text-xs text-adm-ink-muted mt-2">
                  <span className="font-semibold text-adm-ink">{importFileName}</span> — {importRows.length} row{importRows.length !== 1 ? 's' : ''} read.
                </p>
              )}
            </div>
          )}

          {importParseError && <p className="text-xs text-red-500 mb-3 whitespace-pre-wrap">{importParseError}</p>}
          {importError && <p className="text-xs text-red-500 mb-3 whitespace-pre-wrap">{importError}</p>}

          {importRows.length > 0 && !importPreview && !importCommitResult && (
            <button
              onClick={handlePreviewImport}
              disabled={importPreviewing}
              className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {importPreviewing ? 'Checking…' : 'Preview import'}
            </button>
          )}

          {importPreview && (
            <div>
              <div className="mb-4 rounded-lg border border-adm-border overflow-hidden">
                <div className="px-3 py-2 bg-adm-page text-xs font-semibold text-adm-ink">
                  Preview — nothing has been created yet
                </div>
                <div className="px-3 py-2.5 text-xs text-adm-ink-muted space-y-1">
                  <p>{importPreview.institutionsCreated.length} new institution{importPreview.institutionsCreated.length !== 1 ? 's' : ''}
                    {importPreview.institutionsCreated.length > 0 ? `: ${importPreview.institutionsCreated.map(i => i.name).join(', ')}` : ''}</p>
                  <p>{importPreview.cohortsCreated.length} new cohort{importPreview.cohortsCreated.length !== 1 ? 's' : ''}
                    {importPreview.cohortsCreated.length > 0 ? `: ${importPreview.cohortsCreated.map(c => `${c.name} (${c.institutionName})`).join(', ')}` : ''}</p>
                  <p>{importPreview.learnerInvitesCreated} learner invite{importPreview.learnerInvitesCreated !== 1 ? 's' : ''} to be created</p>
                  <p>{importPreview.staffInvitesCreated} staff invite{importPreview.staffInvitesCreated !== 1 ? 's' : ''} to be created</p>
                  {importPreview.failed.length > 0 && (
                    <p className="text-red-500 font-semibold pt-1">{importPreview.failed.length} row{importPreview.failed.length !== 1 ? 's' : ''} will be skipped</p>
                  )}
                </div>
                {importPreview.failed.length > 0 && (
                  <div className="divide-y divide-adm-border max-h-48 overflow-y-auto border-t border-adm-border">
                    {importPreview.failed.map((f, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs">
                        <span className="text-adm-ink-muted">Row {f.row}</span>{' '}
                        <span className="font-semibold text-adm-ink">{f.email || '(blank)'}</span>
                        <span className="text-red-500"> — {f.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmImport}
                  disabled={importCommitting || (importPreview.learnerInvitesCreated === 0 && importPreview.staffInvitesCreated === 0)}
                  className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {importCommitting ? 'Creating…' : 'Confirm import'}
                </button>
                <button onClick={resetImportForm} className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors px-2 py-2">
                  Start over
                </button>
              </div>
            </div>
          )}

          {importCommitResult && (
            <div>
              <div className="mb-4 rounded-lg border border-adm-border overflow-hidden">
                <div className="px-3 py-2 bg-emerald-50 text-xs font-semibold text-emerald-700">
                  Import complete
                </div>
                <div className="px-3 py-2.5 text-xs text-adm-ink-muted space-y-1">
                  <p>{importCommitResult.institutionsCreated.length} institution{importCommitResult.institutionsCreated.length !== 1 ? 's' : ''} created</p>
                  <p>{importCommitResult.cohortsCreated.length} cohort{importCommitResult.cohortsCreated.length !== 1 ? 's' : ''} created</p>
                  <p>{importCommitResult.learnerInvitesCreated} learner invite{importCommitResult.learnerInvitesCreated !== 1 ? 's' : ''} created</p>
                  <p>{importCommitResult.staffInvitesCreated} staff invite{importCommitResult.staffInvitesCreated !== 1 ? 's' : ''} created</p>
                  {importCommitResult.failed.length > 0 && (
                    <p className="text-red-500 font-semibold pt-1">{importCommitResult.failed.length} row{importCommitResult.failed.length !== 1 ? 's' : ''} skipped</p>
                  )}
                </div>
                {importCommitResult.failed.length > 0 && (
                  <div className="divide-y divide-adm-border max-h-48 overflow-y-auto border-t border-adm-border">
                    {importCommitResult.failed.map((f, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs">
                        <span className="text-adm-ink-muted">Row {f.row}</span>{' '}
                        <span className="font-semibold text-adm-ink">{f.email || '(blank)'}</span>
                        <span className="text-red-500"> — {f.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={resetImportForm} className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors px-2 py-2">
                Import another file
              </button>
            </div>
          )}
        </div>
      )}

      {(showForm || showBulk) && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">{showBulk ? 'Add multiple learners' : 'Add a learner'}</h3>
          <p className="text-xs text-adm-ink-muted mb-4">
            {showBulk
              ? 'One line per learner: email, or "email, forename, surname" to personalise their welcome email. Each becomes a pending invite that turns into a real learner account — with the institution, cohort and access below applied automatically — the moment that person signs in to the learner app. This does not create accounts directly.'
              : "This creates a pending invite, not an account directly — a real learner account only exists once they actually sign in with Microsoft. The institution, cohort and access below apply automatically the moment they do."}
          </p>

          {showBulk ? (
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'jane@example.com, Jane, Smith\nsam@example.com, Sam, Patel\nalex@example.com'}
              rows={8}
              className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm font-mono mb-4 text-adm-ink"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Forename (optional)</label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={e => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Surname (optional)</label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={e => setInviteLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="learner@example.com"
                  className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
                />
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Institution (optional)</label>
            <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
              <option value="">No institution — unsponsored</option>
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {institutionId && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Cohort (optional)</label>
              <select
                value={showNewCohort ? '__new__' : cohortId}
                onChange={e => {
                  if (e.target.value === '__new__') { setShowNewCohort(true); return }
                  setCohortId(e.target.value)
                  if (showNewCohort) resetNewCohortForm()
                }}
                className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
              >
                <option value="">No cohort</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.learnersRedeemed} learners)</option>)}
                <option value="__new__">+ Create a new cohort…</option>
              </select>

              {showNewCohort && (
                <div className="mt-3 p-3 rounded-lg border border-adm-border bg-adm-page/40">
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">New cohort name</label>
                    <input
                      type="text"
                      value={newCohortName}
                      onChange={e => setNewCohortName(e.target.value)}
                      placeholder="e.g. 2026 Intake"
                      className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink bg-white"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Curriculum access this cohort grants</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(p => (
                        <button
                          key={p}
                          onClick={() => toggleNewCohortPart(p)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            newCohortParts.has(p) ? 'bg-rc-green text-white' : 'bg-white text-adm-ink-muted hover:text-adm-ink border border-adm-border'
                          }`}
                        >
                          {PART_LABELS[p]}
                        </button>
                      ))}
                      <button
                        onClick={() => setNewCohortParts(new Set([1, 2, 3]))}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-adm-ink-muted hover:text-adm-ink border border-adm-border transition-colors"
                      >
                        All (Full course)
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Access duration (days from redemption)</label>
                      <input
                        type="number"
                        min={1}
                        value={newCohortDuration}
                        onChange={e => setNewCohortDuration(Number(e.target.value) || 365)}
                        className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Seat cap (optional)</label>
                      <input
                        type="number"
                        min={1}
                        value={newCohortSeatCap}
                        onChange={e => setNewCohortSeatCap(e.target.value)}
                        placeholder="Unlimited"
                        className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink bg-white"
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
                    <button onClick={resetNewCohortForm} className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors px-2 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(() => {
            const selectedCohort = cohortId ? cohorts.find(c => c.id === cohortId) : undefined
            if (selectedCohort) {
              return (
                <div className="mb-4 text-xs text-adm-ink-muted bg-adm-page/60 rounded-lg px-3 py-2">
                  <span className="font-semibold text-adm-ink">Access: </span>
                  {selectedCohort.parts.length === 3 ? 'Full course' : selectedCohort.parts.map(p => PART_LABELS[p] ?? p).join(', ')}
                  {' · '}{selectedCohort.accessDurationDays} days from sign-in — set by the "{selectedCohort.name}" cohort.
                </div>
              )
            }
            return (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Curriculum access to grant on sign-in (optional)</label>
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
                <p className="text-xs text-adm-ink-muted mt-1.5">Leave unselected to add them with no curriculum access yet — you can grant it later from Access Grants.</p>
              </div>
            )
          })()}

          {showBulk ? (
            <>
              {bulkError && <p className="text-xs text-red-500 mb-3 whitespace-pre-wrap">{bulkError}</p>}
              {bulkResult && (
                <div className="mb-4 rounded-lg border border-adm-border overflow-hidden">
                  <div className="px-3 py-2 bg-adm-page text-xs font-semibold text-adm-ink">
                    {bulkResult.created} invite{bulkResult.created !== 1 ? 's' : ''} created
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
                onClick={handleBulkAdd}
                disabled={bulkSaving}
                className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {bulkSaving ? 'Adding…' : 'Add learners'}
              </button>
            </>
          ) : (
            <>
              {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
              <button
                onClick={handleAddLearner}
                disabled={saving}
                className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add learner'}
              </button>
            </>
          )}
        </div>
      )}

      {!loadingInvites && pendingInvites.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 pt-4 pb-2">
            Pending invites ({pendingInvites.length})
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-2 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Institution / Cohort</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Access on sign-in</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Added</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {pendingInvites.map(inv => (
                <tr key={inv.id} className="hover:bg-adm-page/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-adm-ink">
                    {inv.email}
                    {inv.firstName && (
                      <div className="text-xs font-normal text-adm-ink-muted">
                        {inv.firstName}{inv.lastName ? ` ${inv.lastName}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-adm-ink-muted">
                    {inv.institutionName ? `${inv.institutionName}${inv.cohortName ? ` · ${inv.cohortName}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-adm-ink-muted">
                    {inv.parts.length > 0 ? inv.parts.map(p => PART_LABELS[p] ?? p).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-adm-ink-muted">{fmtDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => handleCopyInvite(inv)} className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors px-2 py-1">
                      {copiedFor === inv.id ? 'Copied ✓' : 'Copy invite'}
                    </button>
                    <button onClick={() => handleRevokeInvite(inv.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="card p-4 mb-5 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Name or email</label>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Filter by name, email, or part of either… (leave blank to see everyone)"
            className="w-full border border-adm-cborder rounded-lg px-3 py-2 text-sm text-adm-ink"
          />
        </div>
        <button type="submit" disabled={loadingList}
          className="px-5 py-2 text-xs font-semibold rounded-lg bg-adm-bg text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loadingList ? 'Loading…' : 'Search'}
        </button>
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setDetail(null); loadListPage(1, '') }}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-adm-cborder text-adm-ink hover:bg-adm-page transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {loadingList
              ? 'Loading…'
              : total === 0
                ? 'No learners found'
                : `Showing ${(listPage - 1) * PAGE_SIZE + 1}–${Math.min(listPage * PAGE_SIZE, total)} of ${total}`}
          </p>
          {total > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loadingList || listPage <= 1}
                onClick={() => loadListPage(listPage - 1, q)}
                className="px-3 py-1 text-xs font-medium rounded-md border border-adm-cborder text-adm-ink hover:bg-adm-page disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {listPage} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
              <button
                type="button"
                disabled={loadingList || listPage >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => loadListPage(listPage + 1, q)}
                className="px-3 py-1 text-xs font-medium rounded-md border border-adm-cborder text-adm-ink hover:bg-adm-page disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {!loadingList && rows.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            {q ? 'No learners matched that search.' : 'No learners have registered yet.'}
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-adm-cborder">
                  {['Name', 'Email', 'Institution / cohort', 'Enrolled', 'Last active', 'Access'].map(h => (
                    <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-cborder">
                {rows.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => openDetail(r.id)}
                    className={`cursor-pointer hover:bg-adm-page transition-colors ${detail?.id === r.id ? 'bg-adm-page' : ''}`}
                  >
                    <td className="py-2.5 pr-4 font-semibold text-adm-bg whitespace-nowrap">{r.user.displayName}</td>
                    <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">{r.user.email}</td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                      {r.institution?.name ?? 'No institution'}{r.cohort ? ` · ${r.cohort.name}` : ''}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">{fmtDate(r.enrolledAt)}</td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">{fmtDate(r.lastActiveAt)}</td>
                    <td className="py-2.5 text-slate-500 whitespace-nowrap">
                      {r.unlockedParts.length === 0 ? '—' : `Part${r.unlockedParts.length === 1 ? '' : 's'} ${r.unlockedParts.join(', ')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loadingDetail && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-rc-green border-t-transparent rounded-full animate-spin" />
          Loading learner detail...
        </div>
      )}

      {detail && !loadingDetail && (
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-adm-cborder">
            <div>
              <h3 className="font-heading font-semibold text-adm-bg text-base">{detail.user.displayName}</h3>
              <p className="text-xs text-slate-500">{detail.user.email}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{detail.institution?.name ?? 'No institution'}{detail.cohort ? ` · ${detail.cohort.name}` : ''}</p>
              <p className="text-slate-500 mt-0.5">Enrolled {fmtDate(detail.enrolledAt)} · Last active {fmtDate(detail.lastActiveAt)}</p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
          {deleteError && <p className="text-xs text-red-600 mb-4">{deleteError}</p>}

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sub-module progress</p>
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-adm-cborder">
                  {['SM', 'Title', 'Status', 'COL Score', 'Completed'].map(h => (
                    <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-cborder">
                {detail.smProgress.map(sm => (
                  <tr key={sm.id}>
                    <td className="py-2 pr-4 font-mono font-medium text-adm-bg">SM{sm.smId}</td>
                    <td className="py-2 pr-4 text-adm-bg max-w-56 truncate">{sm.smTitle}</td>
                    <td className="py-2 pr-4">
                      <span className={`stat-pill font-semibold capitalize ${STATUS_STYLES[sm.status]}`}>{sm.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{sm.colScore ? `${Math.round(sm.colScore.percent)}% (${sm.colScore.attempts} attempt${sm.colScore.attempts === 1 ? '' : 's'})` : '—'}</td>
                    <td className="py-2 text-slate-500">{fmtDate(sm.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Certificates ({detail.certificates.length})</p>
              {detail.certificates.length === 0 ? (
                <p className="text-xs text-slate-500">None earned yet</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.certificates.map(c => (
                    <div key={c.id} className="text-xs text-slate-600">{c.title} · {fmtDate(c.completedAt)}</div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Access grants ({detail.accessGrants.length})</p>
              {detail.accessGrants.length === 0 ? (
                <p className="text-xs text-slate-500">None</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.accessGrants.map(g => (
                    <div key={g.id} className="text-xs text-slate-600">
                      Part{g.parts.length === 1 ? '' : 's'} {g.parts.join(', ')} · {g.source} · expires {fmtDate(g.expiresAt)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Manual progress adjustments aren't available here — this is a view/search tool, not an editor.
      </p>
    </AdminLayout>
  )
}
