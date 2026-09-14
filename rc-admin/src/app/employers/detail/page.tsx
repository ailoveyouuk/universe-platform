'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { getEmployerDetail, getStaffInvites } from '@/lib/api/adminApi'
import type { EmployerDetail } from '@/lib/api/adminApi'
import type { StaffInvite } from '@/lib/data/types'

// Where an invited employer staff member actually signs in to redeem their
// invite — see the matching comment in institutions/detail/page.tsx.
const EMPLOYER_APP_URL = 'https://yellow-glacier-02e6c530f.7.azurestaticapps.net'

function EmployerDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  const [employer, setEmployer] = useState<EmployerDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [invites, setInvites]   = useState<StaffInvite[]>([])

  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null)

  async function load() {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setEmployer(await getEmployerDetail(id))
    setInvites(await getStaffInvites({ employerId: id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Staff invites aren't emailed automatically (no email service is wired
  // up yet) — this copies a ready-to-paste message so an admin can send it
  // themselves via email/Teams/Slack until real invite emails exist.
  async function handleCopyInvite(inv: StaffInvite) {
    const roleLabel = inv.role === 'employer_admin' ? 'an Admin' : 'a Recruiter'
    const message = `You've been added as ${roleLabel} on Renewables Connect for ${employer?.name ?? 'your organisation'}.\n\nSign in at ${EMPLOYER_APP_URL} with your Microsoft account (${inv.email}) to get access.`
    try {
      await navigator.clipboard.writeText(message)
      setCopiedStaffId(inv.id)
      setTimeout(() => setCopiedStaffId(c => (c === inv.id ? null : c)), 2000)
    } catch {
      // Clipboard access can fail — nothing else to fall back to here.
    }
  }

  if (loading) {
    return <AdminLayout title="Employer"><div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div></AdminLayout>
  }
  if (!employer) {
    return <AdminLayout title="Employer"><div className="card p-10 text-center text-red-500 text-sm">Employer not found.</div></AdminLayout>
  }

  return (
    <AdminLayout title={employer.name} subtitle={`${employer.sector} · ${employer.partnerTier} partner`}>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-bold text-adm-ink text-sm">Employer staff</h3>
            <p className="text-xs text-adm-ink-muted mt-0.5">Access to the employer app, scoped to only this employer.</p>
          </div>
          <Link href="/team" className="text-xs font-semibold text-rc-green-600 hover:opacity-70 transition-opacity shrink-0">
            Manage in People →
          </Link>
        </div>

        {invites.length === 0 ? (
          <p className="text-xs text-adm-ink-muted">No staff yet — add one from the People page.</p>
        ) : (
          <div className="space-y-1.5">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-xs px-3 py-2 bg-adm-page rounded-lg">
                <span className="text-adm-ink font-medium">{inv.email}</span>
                <span className="text-adm-ink-muted capitalize">{inv.role.replace('employer_', '')}</span>
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
    </AdminLayout>
  )
}

export default function EmployerDetailPage() {
  return (
    <Suspense fallback={<AdminLayout title="Employer"><div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div></AdminLayout>}>
      <EmployerDetailContent />
    </Suspense>
  )
}
