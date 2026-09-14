'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getInstitutions, createInstitution } from '@/lib/api/adminApi'
import type { CreateInstitutionInput } from '@/lib/api/adminApi'
import type { InstitutionSummary } from '@/lib/data/types'

const PARTNER_TIERS = ['standard', 'premium', 'enterprise'] as const

const emptyForm: CreateInstitutionInput = {
  name: '', shortName: '', type: 'ACADEMIC', partnerTier: 'standard',
  sector: '', website: '', overview: '', country: '', city: '', sizeBand: '',
  contactName: '', contactEmail: '', contactPhone: '', logoUrl: '', primaryColor: '',
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)

  const [form, setForm]           = useState<CreateInstitutionInput>(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function set<K extends keyof CreateInstitutionInput>(key: K, value: CreateInstitutionInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function load() {
    setLoading(true)
    setInstitutions(await getInstitutions())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!form.name.trim() || !form.shortName.trim()) { setFormError('Name and short name are both required.'); return }

    setSaving(true)
    const created = await createInstitution({
      ...form,
      name: form.name.trim(), shortName: form.shortName.trim(),
      sector: form.sector?.trim() || undefined,
      website: form.website?.trim() || undefined,
      overview: form.overview?.trim() || undefined,
      country: form.country?.trim() || undefined,
      city: form.city?.trim() || undefined,
      sizeBand: form.sizeBand?.trim() || undefined,
      contactName: form.contactName?.trim() || undefined,
      contactEmail: form.contactEmail?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      logoUrl: form.logoUrl?.trim() || undefined,
      primaryColor: form.primaryColor?.trim() || undefined,
    })
    setSaving(false)

    if (created.error || !created.data) {
      setFormError(created.error ?? 'Could not create the institution — check the API and try again.')
      return
    }
    setShowForm(false)
    resetForm()
    load()
  }

  const sizeLabel = form.type === 'ACADEMIC' ? 'Student body size (optional)' : 'Employee count (optional)'
  const sectorPlaceholder = form.type === 'ACADEMIC' ? 'e.g. Higher Education' : 'e.g. Renewable Energy, Manufacturing'

  return (
    <AdminLayout
      title="Institutions"
      subtitle="Academic and corporate sponsors — onboard a partner, then set up cohorts and invite links under each one"
      actions={
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ New institution'}
        </button>
      }
    >
      {showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-1">New institution</h3>
          <p className="text-xs text-adm-ink-muted mb-4">Only name, short name and type are required — everything else can be filled in now or added later from the institution's profile.</p>

          <p className="text-xs font-bold text-adm-ink-muted uppercase tracking-wider mb-2">Identity</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. University of Leeds" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Short name</label>
              <input value={form.shortName} onChange={e => set('shortName', e.target.value)} placeholder="e.g. Leeds" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['ACADEMIC', 'CORPORATE'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                    form.type === t ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
                  }`}
                >
                  {t === 'ACADEMIC' ? 'Academic' : 'Corporate'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Sector (optional)</label>
              <input value={form.sector} onChange={e => set('sector', e.target.value)} placeholder={sectorPlaceholder} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Partner tier</label>
              <select value={form.partnerTier} onChange={e => set('partnerTier', e.target.value as typeof PARTNER_TIERS[number])} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm capitalize text-adm-ink">
                {PARTNER_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">{sizeLabel}</label>
              <input value={form.sizeBand} onChange={e => set('sizeBand', e.target.value)} placeholder="e.g. 1,000-5,000" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
          </div>

          <p className="text-xs font-bold text-adm-ink-muted uppercase tracking-wider mb-2">Profile</p>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Website (optional)</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Country (optional)</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. United Kingdom" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">City (optional)</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Leeds" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Overview (optional)</label>
            <textarea value={form.overview} onChange={e => set('overview', e.target.value)} placeholder="A short description of the institution and why it's partnering with Renewables Connect…" rows={2} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
          </div>

          <p className="text-xs font-bold text-adm-ink-muted uppercase tracking-wider mb-2">Primary contact</p>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Name (optional)</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="e.g. Priya Shah" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Email (optional)</label>
              <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="admissions@institution.example" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Phone (optional)</label>
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="e.g. +44 113 000 0000" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
          </div>

          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create institution'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">⊞</p>
            <p className="text-adm-ink-muted text-sm">No institutions yet. Create one to start setting up cohorts and invite links.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Institution</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Type / sector</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Students</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Active (30d)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Avg completion</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-adm-page/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-adm-ink">{inst.name}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">
                    <span className="capitalize">{inst.type === 'ACADEMIC' ? 'Academic' : 'Corporate'}</span>
                    {inst.sector && <span className="text-adm-ink-muted/70"> · {inst.sector}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{inst.studentCount}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{inst.activeStudents30d}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{Math.round(inst.avgCompletionPercent)}%</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                      inst.status === 'active' ? 'bg-rc-green/10 text-rc-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/institutions/detail?id=${inst.id}`} className="text-xs text-rc-green-600 hover:opacity-70 transition-opacity px-2 py-1">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
