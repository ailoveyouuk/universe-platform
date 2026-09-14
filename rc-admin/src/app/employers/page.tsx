'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getEmployers, createEmployer } from '@/lib/api/adminApi'
import type { EmployerSummary } from '@/lib/data/types'

const PARTNER_TIERS = ['standard', 'premium', 'enterprise'] as const

export default function EmployersPage() {
  const [employers, setEmployers] = useState<EmployerSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)

  const [name, setName]           = useState('')
  const [shortName, setShortName] = useState('')
  const [sector, setSector]       = useState('')
  const [partnerTier, setPartnerTier] = useState<typeof PARTNER_TIERS[number]>('standard')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setEmployers(await getEmployers())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setName(''); setShortName(''); setSector(''); setPartnerTier('standard'); setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!name.trim() || !shortName.trim() || !sector.trim()) { setFormError('Name, short name, and sector are all required.'); return }
    setSaving(true)
    const created = await createEmployer({ name: name.trim(), shortName: shortName.trim(), sector: sector.trim(), partnerTier })
    setSaving(false)
    if (!created) { setFormError('Could not create the employer — check the API and try again.'); return }
    setShowForm(false)
    resetForm()
    load()
  }

  return (
    <AdminLayout
      title="Employers"
      subtitle="Recruiting partners — onboard a company, then invite their hiring team into the employer app"
      actions={
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
          className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ New employer'}
        </button>
      }
    >
      {showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-heading font-bold text-adm-ink text-sm mb-4">New employer</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Company name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ørsted UK" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Short name</label>
              <input value={shortName} onChange={e => setShortName(e.target.value)} placeholder="e.g. Ørsted" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Sector</label>
              <input value={sector} onChange={e => setSector(e.target.value)} placeholder="e.g. Offshore Wind" className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm text-adm-ink" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">Partner tier</label>
              <select value={partnerTier} onChange={e => setPartnerTier(e.target.value as typeof PARTNER_TIERS[number])} className="w-full border border-adm-border rounded-lg px-3 py-2 text-sm capitalize text-adm-ink">
                {PARTNER_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
          <button onClick={handleSubmit} disabled={saving} className="bg-rc-green text-white text-xs font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Creating…' : 'Create employer'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : employers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">◈</p>
            <p className="text-adm-ink-muted text-sm">No employers yet. Create one to start inviting their hiring team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Employer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Sector</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Open roles</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Shortlisted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {employers.map(emp => (
                <tr key={emp.id} className="hover:bg-adm-page/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-adm-ink">{emp.name}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{emp.sector}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{emp.openRoles}</td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">{emp.shortlistedCandidates}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                      emp.status === 'active' ? 'bg-rc-green/10 text-rc-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/employers/detail?id=${emp.id}`} className="text-xs text-rc-green-600 hover:opacity-70 transition-opacity px-2 py-1">
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
