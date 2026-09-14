'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getAdminOrganisations, toggleOrgPublish, deleteOrganisation } from '@/lib/api/adminApi'
import type { OrgListItem } from '@/lib/data/types'

const TIER_LABELS: Record<string, string> = {
  STANDARD:         'Standard',
  PARTNER:          'Partner',
  GOLD_PARTNER:     'Gold',
  PLATINUM_PARTNER: 'Platinum',
}

const TIER_COLOURS: Record<string, string> = {
  STANDARD:         'bg-slate-100 text-slate-500',
  PARTNER:          'bg-blue-50 text-blue-600',
  GOLD_PARTNER:     'bg-amber-50 text-amber-600',
  PLATINUM_PARTNER: 'bg-purple-50 text-purple-600',
}

export default function OrganisationsPage() {
  const [orgs, setOrgs]       = useState<OrgListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EMPLOYER' | 'INSTITUTION'>('ALL')

  async function load() {
    setLoading(true)
    const result = await getAdminOrganisations({ type: typeFilter === 'ALL' ? undefined : typeFilter })
    setOrgs(result.orgs)
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTogglePublish(id: string, current: boolean) {
    await toggleOrgPublish(id, !current)
    setOrgs(prev => prev.map(o => o.id === id ? { ...o, isPublished: !current } : o))
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const ok = await deleteOrganisation(id)
    if (ok) setOrgs(prev => prev.filter(o => o.id !== id))
  }

  return (
    <AdminLayout
      title="Organisations"
      subtitle="Manage employer and institution partner profiles"
      actions={
        <Link href="/organisations/new"
          className="inline-flex items-center gap-2 bg-rc-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          + New organisation
        </Link>
      }
    >
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5">
        {(['ALL', 'EMPLOYER', 'INSTITUTION'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === t ? 'bg-rc-green text-white' : 'bg-adm-page text-adm-ink-muted hover:text-adm-ink'
            }`}
          >
            {t === 'ALL' ? 'All' : t === 'EMPLOYER' ? 'Employers' : 'Institutions'}
          </button>
        ))}
        <span className="ml-auto text-xs text-adm-ink-muted">{orgs.length} organisation{orgs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : orgs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">◭</p>
            <p className="text-adm-ink-muted text-sm">No organisations yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-adm-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-adm-page/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {org.brandColour && (
                        <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: org.brandColour }} />
                      )}
                      <div>
                        <Link href={`/organisations/edit?id=${org.id}`}
                          className="font-semibold text-adm-ink hover:text-rc-green transition-colors">
                          {org.name}
                        </Link>
                        <p className="text-xs text-adm-ink-muted">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${org.type === 'EMPLOYER' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {org.type === 'EMPLOYER' ? 'Employer' : 'Institution'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TIER_COLOURS[org.partnershipTier] ?? ''}`}>
                      {TIER_LABELS[org.partnershipTier] ?? org.partnershipTier}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">
                    {[org.city, org.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleTogglePublish(org.id, org.isPublished)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        org.isPublished ? 'bg-rc-green/10 text-rc-green-600 hover:bg-rc-green/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {org.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-adm-ink-muted">
                    {new Date(org.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/organisations/edit?id=${org.id}`}
                        className="text-xs text-adm-ink-muted hover:text-adm-ink transition-colors px-2 py-1">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">
                        Delete
                      </button>
                    </div>
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
