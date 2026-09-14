'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getInstitutionDetail, createCohort, updateInstitution, updateInstitutionSelfService, getStaffInvites } from '@/lib/api/adminApi'
import type { InstitutionProfileInput } from '@/lib/api/adminApi'
import type { InstitutionDetail, StaffInvite } from '@/lib/data/types'

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }
const PARTNER_TIERS = ['standard', 'premium', 'enterprise'] as const

// Where an invited institution staff member actually signs in to redeem
// their invite — there's no invite token/link, redemption just matches
// their Microsoft sign-in email against the StaffInvite row (see rc-api's
// POST /api/auth/register), so what we hand them is instructions, not a
// unique URL. Hardcoded for now; move to an env var alongside the other
// apps' URLs once rc-institution has a custom domain.
const INSTITUTION_APP_URL = 'https://agreeable-plant-0f4c5cd0f.7.azurestaticapps.net'

function partsLabel(parts: number[]): string {
  if (parts.length === 3) return 'Full course'
  return parts.map(p => PART_LABELS[p] ?? p).join(', ')
}

function profileInputFrom(inst: InstitutionDetail): InstitutionProfileInput {
  return {
    name: inst.name, shortName: inst.shortName, type: inst.type,
    sector: inst.sector ?? '', partnerTier: inst.partnerTier,
    website: inst.website ?? '', overview: inst.overview ?? '',
    country: inst.country ?? '', city: inst.city ?? '', sizeBand: inst.sizeBand ?? '',
    contactName: inst.contactName ?? '', contactEmail: inst.contactEmail ?? '', contactPhone: inst.contactPhone ?? '',
  }
}

function InstitutionDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  const [institution, setInstitution] = useState<InstitutionDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [copiedId, setCopiedId]       = useState<string | null>(null)
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm]       = useState<InstitutionProfileInput>({})
  const [profileSaving, setProfileSaving]   = useState(false)
  const [profileError, setProfileError]     = useState<string | null>(null)

  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([])

  const [ssEditing, setSsEditing]   = useState(false)
  const [ssEnabled, setSsEnabled]   = useState(false)
  const [ssParts, setSsParts]       = useState<Set<number>>(new Set())
  const [ssSaving, setSsSaving]     = useState(false)
  const [ssError, setSsError]       = useState<string | null>(null)

  const [cohortName, setCohortName]           = useState('')
  const [parts, setParts]                     = useState<Set<number>>(new Set())
  const [durationDays, setDurationDays]       = useState(365)
  const [seatCap, setSeatCap]                 = useState('') // '' = unlimited
  const [saving, setSaving]                   = useState(false)
  const [formError, setFormError]             = useState<string | null>(null)

  async function load() {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setInstitution(await getInstitutionDetail(id))
    setStaffInvites(await getStaffInvites({ institutionId: id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function togglePart(p: number) {
    setParts(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function resetForm() {
    setCohortName(''); setParts(new Set()); setDurationDays(365); setSeatCap(''); setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!cohortName.trim()) { setFormError('Give the cohort a name — e.g. "2026 Intake" or "Q1 Pilot".'); return }
    if (parts.size === 0) { setFormError('Select at least one part to grant.'); return }
    if (seatCap && (!Number.isInteger(Number(seatCap)) || Number(seatCap) < 1)) {
      setFormError('Seat cap must be a positive whole number, or left blank for unlimited.'); return
    }

    setSaving(true)
    const created = await createCohort({
      institutionId: id,
      name: cohortName.trim(),
      parts: Array.from(parts).sort((a, b) => a - b),
      accessDurationDays: durationDays,
      seatCap: seatCap ? Number(seatCap) : null,
    })
    setSaving(false)

    if (!created) { setFormError('Could not create the cohort — check the API and try again.'); return }
    setShowForm(false)
    resetForm()
    load()
  }

  async function handleCopy(url: string, cohortId: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(cohortId)
      setTimeout(() => setCopiedId(c => (c === cohortId ? null : c)), 2000)
    } catch {
      // Clipboard access can fail (permissions, non-HTTPS context) — the
      // link is still visible and selectable in the UI either way.
    }
  }

  // Staff invites aren't emailed automatically (no email service is wired
  // up yet) — this copies a ready-to-paste message so an admin can send it
  // themselves via email/Teams/Slack until real invite emails exist.
  async function handleCopyInvite(inv: StaffInvite) {
    const roleLabel = inv.role === 'institution_admin' ? 'an Admin' : 'a Tutor'
    const message = `You've been added as ${roleLabel} on Renewables Connect for ${institution?.name ?? 'your institution'}.\n\nSign in at ${INSTITUTION_APP_URL} with your Microsoft account (${inv.email}) to get access.`
    try {
      await navigator.clipboard.writeText(message)
      setCopiedStaffId(inv.id)
      setTimeout(() => setCopiedStaffId(c => (c === inv.id ? null : c)), 2000)
    } catch {
      // Clipboard access can fail — nothing else to fall back to here.
    }
  }

  function setP<K extends keyof InstitutionProfileInput>(key: K, value: InstitutionProfileInput[K]) {
    setProfileForm(prev => ({ ...prev, [key]: value }))
  }

  function startEditProfile() {
    if (!institution) return
    setProfileForm(profileInputFrom(institution))
    setProfileError(null)
    setEditingProfile(true)
  }

  async function handleSaveProfile() {
    if (!institution) return
    setProfileError(null)
    if (!profileForm.name?.trim() || !profileForm.shortName?.trim()) {
      setProfileError('Name and short name are both required.'); return
    }
    setProfileSaving(true)
    const updated = await updateInstitution(institution.id, {
      ...profileForm,
      name: profileForm.name.trim(), shortName: profileForm.shortName.trim(),
    })
    setProfileSaving(false)
    if (!updated) { setProfileError('Could not save the profile — check the API and try again.'); return }
    setInstitution(updated)
    setEditingProfile(false)
  }

  function startEditSelfService() {
    if (!institution) return
    setSsEnabled(institution.selfServiceEnabled)
    setSsParts(new Set(institution.contractedParts))
    setSsError(null)
    setSsEditing(true)
  }

  function toggleSsPart(p: number) {
    setSsParts(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  async function handleSaveSelfService() {
    if (!institution) return
    setSsError(null)
    setSsSaving(true)
    const updated = await updateInstitutionSelfService(institution.id, {
      selfServiceEnabled: ssEnabled,
      contractedParts: Array.from(ssParts).sort((a, b) => a - b),
    })
    setSsSaving(false)
    if (!updated) { setSsError('Could not save — check the API and try again.'); return }
    setInstitution(updated)
    setSsEditing(false)
  }

  if (loading) {
    return <AdminLayout title="Institution"><div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div></AdminLayout>
  }
  if (!institution) {
    return <AdminLayout title="Institution"><div className="card p-10 text-center text-red-500 text-sm">Institution not found.</div></AdminLayout>
  }

  return (
    <AdminLayout
      title={institution.name}
      subtitle={`${institution.type === 'CORPORATE' ? 'Corporate' : 'Academic'} partner${institution.contactEmail ? ` · ${institution.contactEmail}` : ''}`}
      actions={
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ New cohort'}
        </button>
      }
    >
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="font-heading font-bold text-adm-ink text-sm">Profile</h3>
          {!editingProfile && (
            <button onClick={startEditProfile} className="text-xs font-semibold text-rc-green-600 hover:opacity-70 transition-opacity">
              Edit profile
            </button>
          )}
        </div>

        {editingProfile ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Name</label>
                <input value={profileForm.name ?? ''} onChange={e => setP('name', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Short name</label>
                <input value={profileForm.shortName ?? ''} onChange={e => setP('shortName', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Type</label>
              <div className="flex gap-2">
                {(['ACADEMIC', 'CORPORATE'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setP('type', t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      profileForm.type === t ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                    }`}
                  >
                    {t === 'ACADEMIC' ? 'Academic' : 'Corporate'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Sector</label>
                <input value={profileForm.sector ?? ''} onChange={e => setP('sector', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Partner tier</label>
                <select value={profileForm.partnerTier ?? 'standard'} onChange={e => setP('partnerTier', e.target.value as typeof PARTNER_TIERS[number])} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm capitalize text-adm-ink">
                  {PARTNER_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">{profileForm.type === 'ACADEMIC' ? 'Student body size' : 'Employee count'}</label>
                <input value={profileForm.sizeBand ?? ''} onChange={e => setP('sizeBand', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Website</label>
                <input value={profileForm.website ?? ''} onChange={e => setP('website', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Country</label>
                <input value={profileForm.country ?? ''} onChange={e => setP('country', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">City</label>
                <input value={profileForm.city ?? ''} onChange={e => setP('city', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Overview</label>
              <textarea value={profileForm.overview ?? ''} onChange={e => setP('overview', e.target.value)} rows={2} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Contact name</label>
                <input value={profileForm.contactName ?? ''} onChange={e => setP('contactName', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Contact email</label>
                <input type="email" value={profileForm.contactEmail ?? ''} onChange={e => setP('contactEmail', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Contact phone</label>
                <input value={profileForm.contactPhone ?? ''} onChange={e => setP('contactPhone', e.target.value)} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
              </div>
            </div>

            {profileError && <p className="text-xs text-red-500 mb-3">{profileError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="text-xs font-semibold text-adm-ink-muted hover:text-adm-ink px-5 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Type</p><p className="text-adm-ink capitalize">{institution.type === 'ACADEMIC' ? 'Academic' : 'Corporate'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Sector</p><p className="text-adm-ink">{institution.sector || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Partner tier</p><p className="text-adm-ink capitalize">{institution.partnerTier}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">{institution.type === 'ACADEMIC' ? 'Student body size' : 'Employee count'}</p><p className="text-adm-ink">{institution.sizeBand || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Website</p><p className="text-adm-ink truncate">{institution.website || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Location</p><p className="text-adm-ink">{[institution.city, institution.country].filter(Boolean).join(', ') || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Contact</p><p className="text-adm-ink">{institution.contactName || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Contact email</p><p className="text-adm-ink truncate">{institution.contactEmail || '—'}</p></div>
            <div><p className="text-xs text-adm-ink-muted mb-0.5">Contact phone</p><p className="text-adm-ink">{institution.contactPhone || '—'}</p></div>
            {institution.overview && (
              <div className="col-span-3"><p className="text-xs text-adm-ink-muted mb-0.5">Overview</p><p className="text-adm-ink">{institution.overview}</p></div>
            )}
          </div>
        )}
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-bold text-adm-ink text-sm">Institution staff</h3>
            <p className="text-xs text-adm-ink-muted mt-0.5">Access to the institution app, scoped to only this institution.</p>
          </div>
          <Link href="/team" className="text-xs font-semibold text-rc-green-600 hover:opacity-70 transition-opacity shrink-0">
            Manage in People →
          </Link>
        </div>

        {staffInvites.length === 0 ? (
          <p className="text-xs text-adm-ink-muted">No staff yet — add one from the People page.</p>
        ) : (
          <div className="space-y-1.5">
            {staffInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-xs px-3 py-2 bg-adm-page rounded-lg">
                <span className="text-adm-ink font-medium">{inv.email}</span>
                <span className="text-adm-ink-muted capitalize">{inv.role.replace('institution_', '')}</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${inv.redeemedAt ? 'bg-rc-green/10 text-rc-green-600' : 'bg-slate-100 text-slate-500'}`}>
                  {inv.redeemedAt ? 'Active' : 'Pending'}
                </span>
                {!inv.redeemedAt && (
                  <button onClick={() => handleCopyInvite(inv)} className="text-rc-green-600 font-semibold hover:opacity-70 transition-opacity shrink-0">
                    {copiedStaffId === inv.id ? 'Copied ✓' : 'Copy invite'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-bold text-adm-ink text-sm">Self-service learner portal</h3>
            <p className="text-xs text-adm-ink-muted mt-0.5">
              Lets this institution's own admins/tutors bulk-add their learners directly from rc-institution, without you doing it.
            </p>
          </div>
          {!ssEditing && (
            <button onClick={startEditSelfService} className="text-xs font-semibold text-rc-green-600 hover:opacity-70 transition-opacity shrink-0">
              Edit
            </button>
          )}
        </div>

        {ssEditing ? (
          <>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Portal access</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSsEnabled(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    ssEnabled ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                  }`}
                >
                  Enabled
                </button>
                <button
                  onClick={() => setSsEnabled(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    !ssEnabled ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">
                Curriculum parts this institution is entitled to grant themselves
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map(p => (
                  <button
                    key={p}
                    onClick={() => toggleSsPart(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      ssParts.has(p) ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                    }`}
                  >
                    {PART_LABELS[p]}
                  </button>
                ))}
                <button
                  onClick={() => setSsParts(new Set([1, 2, 3]))}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-adm-page text-adm-ink-muted hover:text-adm-ink transition-colors"
                >
                  All (Full course)
                </button>
              </div>
              <p className="text-xs text-adm-ink-muted mt-1.5">
                This is a ceiling, not a default — the institution picks per-batch, up to this. Match it to what they've actually paid for.
              </p>
            </div>

            {ssError && <p className="text-xs text-red-500 mb-3">{ssError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveSelfService}
                disabled={ssSaving}
                className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {ssSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setSsEditing(false)}
                className="text-xs font-semibold text-adm-ink-muted hover:text-adm-ink px-5 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${institution.selfServiceEnabled ? 'bg-rc-green/10 text-rc-green-600' : 'bg-slate-100 text-slate-500'}`}>
              {institution.selfServiceEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className="text-adm-ink-muted text-xs">
              {institution.contractedParts.length > 0
                ? `Can grant: ${institution.contractedParts.map(p => PART_LABELS[p] ?? p).join(', ')}`
                : 'No curriculum access configured yet'}
            </span>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">New cohort</h3>
          <p className="text-xs text-adm-ink-muted mb-4">
            Creates one shareable invite link. Send it to as many or as few students as this cohort should
            cover — the seat cap (if set) enforces the limit, and each student's own access clock starts the
            moment they redeem it, not when the cohort is created.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Cohort name</label>
            <input
              value={cohortName}
              onChange={e => setCohortName(e.target.value)}
              placeholder="e.g. 2026 Intake, Q1 Pilot, Engineering Faculty"
              className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Curriculum parts granted</label>
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

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Access duration (days from redemption)</label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={e => setDurationDays(Number(e.target.value))}
                className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Seat cap (blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={seatCap}
                onChange={e => setSeatCap(e.target.value)}
                placeholder="e.g. 100"
                className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink"
              />
            </div>
          </div>

          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create cohort & generate link'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {institution.cohorts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-3xl mb-3">🔗</p>
            <p className="text-adm-ink-muted text-sm">No cohorts yet. Create one to generate an invite link for students.</p>
          </div>
        ) : institution.cohorts.map(c => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h4 className="font-heading font-bold text-adm-ink text-sm">{c.name}</h4>
                <p className="text-xs text-adm-ink-muted mt-0.5">
                  {partsLabel(c.parts)} · {c.accessDurationDays}-day access from redemption
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-adm-ink">
                  {c.learnersRedeemed}{c.seatCap != null ? ` / ${c.seatCap}` : ''}
                </p>
                <p className="text-xs text-adm-ink-muted">{c.seatCap != null ? 'seats redeemed' : 'redeemed (unlimited)'}</p>
              </div>
            </div>

            {c.seatCap != null && (
              <div className="w-full h-1.5 bg-adm-page rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-rc-green rounded-full"
                  style={{ width: `${Math.min(100, (c.learnersRedeemed / c.seatCap) * 100)}%` }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 bg-adm-page rounded-lg px-3 py-2">
              <code className="flex-1 text-xs text-adm-ink truncate">{c.inviteUrl}</code>
              <button
                onClick={() => handleCopy(c.inviteUrl, c.id)}
                className="text-xs font-semibold text-rc-green-600 hover:opacity-70 transition-opacity shrink-0"
              >
                {copiedId === c.id ? 'Copied ✓' : 'Copy link'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}

export default function InstitutionDetailPage() {
  return (
    <Suspense fallback={<AdminLayout title="Institution"><div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div></AdminLayout>}>
      <InstitutionDetailContent />
    </Suspense>
  )
}
