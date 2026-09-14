'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import {
  getPeople, createStaffInvite, revokeStaffInvite,
  removePlatformRole, removeInstitutionAccess, removeEmployerAccess,
  getInstitutions, getEmployers,
  type Person,
} from '@/lib/api/adminApi'
import type { InstitutionSummary, EmployerSummary, StaffRole } from '@/lib/data/types'

// Where an invited person signs in to redeem their invite — copy-pasted into
// the "copy invite" message since no invite email is wired up yet.
const APP_URLS = {
  admin:       'https://polite-moss-07aa8670f.7.azurestaticapps.net',
  institution: 'https://agreeable-plant-0f4c5cd0f.7.azurestaticapps.net',
  employer:    'https://yellow-glacier-02e6c530f.7.azurestaticapps.net',
}

function platformLabel(role: 'admin' | 'coordinator' | null): string {
  if (role === 'admin') return 'Global Admin'
  if (role === 'coordinator') return 'Coordinator'
  return '—'
}

export default function PeoplePage() {
  const { user: me } = useAdminAuth()

  const [people, setPeople] = useState<Person[]>([])
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([])
  const [employers, setEmployers] = useState<EmployerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Add-person form state
  const [email, setEmail]           = useState('')
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [wantsAdmin, setWantsAdmin] = useState(false)
  const [wantsCoordinator, setWantsCoordinator] = useState(false)
  const [wantsInstitution, setWantsInstitution] = useState(false)
  const [institutionId, setInstitutionId]       = useState('')
  const [institutionRole, setInstitutionRole]   = useState<'institution_admin' | 'institution_tutor'>('institution_tutor')
  const [wantsEmployer, setWantsEmployer]       = useState(false)
  const [employerId, setEmployerId]             = useState('')
  const [employerRole, setEmployerRole]         = useState<'employer_admin' | 'employer_recruiter'>('employer_recruiter')
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [copiedFor, setCopiedFor]   = useState<string | null>(null)
  const [rowError, setRowError]     = useState<string | null>(null)
  const [busyKey, setBusyKey]       = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [ppl, insts, emps] = await Promise.all([getPeople(), getInstitutions(), getEmployers()])
    setPeople(ppl)
    setInstitutions(insts)
    setEmployers(emps)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setEmail('')
    setFirstName(''); setLastName('')
    setWantsAdmin(false); setWantsCoordinator(false)
    setWantsInstitution(false); setInstitutionId(''); setInstitutionRole('institution_tutor')
    setWantsEmployer(false); setEmployerId(''); setEmployerRole('employer_recruiter')
    setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) { setFormError('Enter a valid email address.'); return }
    if (!wantsAdmin && !wantsCoordinator && !wantsInstitution && !wantsEmployer) {
      setFormError('Select at least one kind of access.'); return
    }
    if (wantsInstitution && !institutionId) { setFormError('Choose which institution to grant access to.'); return }
    if (wantsEmployer && !employerId) { setFormError('Choose which employer to grant access to.'); return }

    const grants: { role: StaffRole; institutionId?: string; employerId?: string }[] = []
    // Global Admin already sees and can change everything platform-wide —
    // Coordinator is redundant underneath it, so Admin wins if both are
    // somehow checked (shouldn't happen, the UI hides Coordinator once
    // Admin is picked, but stay defensive).
    if (wantsAdmin) grants.push({ role: 'rc_admin' })
    else if (wantsCoordinator) grants.push({ role: 'rc_support' })
    if (wantsInstitution) grants.push({ role: institutionRole, institutionId })
    if (wantsEmployer) grants.push({ role: employerRole, employerId })

    setSaving(true)
    const results = await Promise.all(grants.map(g => createStaffInvite({
      email: cleanEmail,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      ...g,
    })))
    setSaving(false)

    const errors = results.map(r => r.error).filter((e): e is string => !!e)
    if (errors.length === results.length) {
      // Every grant failed — surface it and leave the form open to retry.
      setFormError(errors[0])
      return
    }
    if (errors.length > 0) {
      setFormError(`${results.length - errors.length} of ${results.length} access grants created — one failed: ${errors[0]}`)
    }
    setShowForm(false)
    resetForm()
    load()
  }

  async function handleRevokePending(id: string) {
    if (!confirm('Revoke this invite? They will no longer get this access automatically when they sign in.')) return
    setRowError(null)
    setBusyKey(id)
    const { ok, error } = await revokeStaffInvite(id)
    setBusyKey(null)
    if (!ok) { setRowError(error ?? 'Could not revoke this invite.'); return }
    load()
  }

  async function handleRemove(kind: 'platform' | 'institution' | 'employer', userId: string) {
    if (!confirm('Remove this access? They will lose it immediately — this does not remove their account, just this access.')) return
    setRowError(null)
    setBusyKey(`${kind}:${userId}`)
    const { ok, error } =
      kind === 'platform'    ? await removePlatformRole(userId) :
      kind === 'institution' ? await removeInstitutionAccess(userId) :
                                await removeEmployerAccess(userId)
    setBusyKey(null)
    if (!ok) { setRowError(error ?? 'Could not remove this access.'); return }
    load()
  }

  async function handleCopyInvite(person: Person) {
    const lines: string[] = [`Hi — you've been given access to Renewables Connect:`]
    if (person.platformRole || person.pending.some(p => ['rc_admin', 'rc_analyst', 'rc_support'].includes(p.role))) {
      lines.push(`• Admin app (${APP_URLS.admin}) — sign in with your Microsoft account (${person.email})`)
    }
    if (person.institution || person.pending.some(p => p.institutionName)) {
      lines.push(`• Institution app (${APP_URLS.institution}) — sign in with your Microsoft account (${person.email})`)
    }
    if (person.employer || person.pending.some(p => p.employerName)) {
      lines.push(`• Employer app (${APP_URLS.employer}) — sign in with your Microsoft account (${person.email})`)
    }
    lines.push('', "You'll get access the moment you sign in — nothing else to do.")
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopiedFor(person.email)
      setTimeout(() => setCopiedFor(c => (c === person.email ? null : c)), 2000)
    } catch { /* clipboard access can fail — nothing else to fall back to */ }
  }

  return (
    <AdminLayout
      title="People"
      subtitle="Everyone with staff access to any Renewables Connect app — onboard once, then configure or remove access per app any time, all from here"
      actions={
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ Add person'}
        </button>
      }
    >
      {showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">Add a person</h3>
          <p className="text-xs text-adm-ink-muted mb-4">
            Pick every app they need — they get access to all of it the moment they sign in with that Microsoft account. New here just gets rc-learner (no setup needed, open sign-in) unless you check something below.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Forename (optional)</label>
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Surname (optional)</label>
              <input
                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full max-w-sm border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
            />
          </div>

          <div className="border border-adm-border rounded-lg p-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={wantsAdmin}
                onChange={e => { setWantsAdmin(e.target.checked); if (e.target.checked) setWantsCoordinator(false) }}
              />
              <span className="text-sm font-semibold text-adm-ink">Global Admin</span>
            </label>
            <p className="text-xs text-adm-ink-muted mt-1 ml-6">
              Full read + write access to everything, every institution and employer — reserve this for people like you who need to see and manage the whole platform.
            </p>
          </div>

          {!wantsAdmin && (
            <div className="border border-adm-border rounded-lg p-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={wantsCoordinator} onChange={e => setWantsCoordinator(e.target.checked)} />
                <span className="text-sm font-semibold text-adm-ink">RC Admin app — Coordinator</span>
              </label>
              <p className="text-xs text-adm-ink-muted mt-1 ml-6">
                Can see and check anything platform-wide, but can&apos;t edit, export, or change anything.
              </p>
            </div>
          )}

          <div className="border border-adm-border rounded-lg p-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wantsInstitution} onChange={e => setWantsInstitution(e.target.checked)} />
              <span className="text-sm font-semibold text-adm-ink">Institution app</span>
            </label>
            {wantsInstitution && (
              <div className="grid grid-cols-2 gap-3 mt-3 ml-6">
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Institution</label>
                  <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                    <option value="">Choose one…</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Role</label>
                  <select value={institutionRole} onChange={e => setInstitutionRole(e.target.value as typeof institutionRole)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                    <option value="institution_tutor">Tutor</option>
                    <option value="institution_admin">Admin</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="border border-adm-border rounded-lg p-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wantsEmployer} onChange={e => setWantsEmployer(e.target.checked)} />
              <span className="text-sm font-semibold text-adm-ink">Employer app</span>
            </label>
            {wantsEmployer && (
              <div className="grid grid-cols-2 gap-3 mt-3 ml-6">
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Employer</label>
                  <select value={employerId} onChange={e => setEmployerId(e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                    <option value="">Choose one…</option>
                    {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Role</label>
                  <select value={employerRole} onChange={e => setEmployerRole(e.target.value as typeof employerRole)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink">
                    <option value="employer_recruiter">Recruiter</option>
                    <option value="employer_admin">Admin</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add person'}
          </button>
        </div>
      )}

      {rowError && <p className="text-xs text-red-500 mb-3">{rowError}</p>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : people.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">⚙</p>
            <p className="text-adm-ink-muted text-sm">Nobody&apos;s been added yet — just you, once you sign in for the first time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Person</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Admin app</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Institution app</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Employer app</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {people.map(person => {
                const isMe = !!me && person.userId === me.id
                const pendingPlatform    = person.pending.find(p => ['rc_admin', 'rc_analyst', 'rc_support'].includes(p.role))
                const pendingInstitution = person.pending.find(p => p.institutionName)
                const pendingEmployer    = person.pending.find(p => p.employerName)
                return (
                  <tr key={person.email} className="hover:bg-adm-page/50 transition-colors align-top">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-adm-ink">{person.displayName ?? person.email}</p>
                      <p className="text-xs text-adm-ink-muted">{person.email}{isMe && ' · you'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {person.platformRole ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs">{platformLabel(person.platformRole)}</span>
                          <button
                            onClick={() => handleRemove('platform', person.userId!)}
                            disabled={isMe || busyKey === `platform:${person.userId}`}
                            title={isMe ? "You can't remove your own admin access" : 'Remove access'}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : pendingPlatform ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-adm-ink-muted italic">pending ({pendingPlatform.role === 'rc_admin' ? 'Admin' : 'Coordinator'})</span>
                          <button
                            onClick={() => handleRevokePending(pendingPlatform.id)}
                            disabled={busyKey === pendingPlatform.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : <span className="text-xs text-adm-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {person.institution ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs">{person.institution.name} <span className="text-adm-ink-muted capitalize">({person.institution.role})</span></span>
                          <button
                            onClick={() => handleRemove('institution', person.userId!)}
                            disabled={busyKey === `institution:${person.userId}`}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30"
                          >
                            Remove
                          </button>
                        </div>
                      ) : pendingInstitution ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-adm-ink-muted italic">pending ({pendingInstitution.institutionName})</span>
                          <button
                            onClick={() => handleRevokePending(pendingInstitution.id)}
                            disabled={busyKey === pendingInstitution.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : <span className="text-xs text-adm-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {person.employer ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs">{person.employer.name} <span className="text-adm-ink-muted capitalize">({person.employer.role})</span></span>
                          <button
                            onClick={() => handleRemove('employer', person.userId!)}
                            disabled={busyKey === `employer:${person.userId}`}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30"
                          >
                            Remove
                          </button>
                        </div>
                      ) : pendingEmployer ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-adm-ink-muted italic">pending ({pendingEmployer.employerName})</span>
                          <button
                            onClick={() => handleRevokePending(pendingEmployer.id)}
                            disabled={busyKey === pendingEmployer.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline disabled:opacity-30"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : <span className="text-xs text-adm-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => handleCopyInvite(person)} className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors">
                        {copiedFor === person.email ? 'Copied ✓' : 'Copy invite'}
                      </button>
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
