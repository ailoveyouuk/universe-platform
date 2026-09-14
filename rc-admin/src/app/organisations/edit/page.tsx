'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams }               from 'next/navigation'
import { AdminLayout }                   from '@/components/layout/AdminLayout'
import { OrgForm }                       from '@/components/organisations/OrgForm'
import { getAdminOrganisation }          from '@/lib/api/adminApi'
import type { Organisation }             from '@/lib/data/types'

function EditOrganisationContent() {
  const searchParams          = useSearchParams()
  const id                    = searchParams.get('id') ?? ''
  const [org, setOrg]         = useState<Organisation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    getAdminOrganisation(id).then(data => {
      setOrg(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <AdminLayout title="Edit organisation">
        <div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div>
      </AdminLayout>
    )
  }

  if (!org) {
    return (
      <AdminLayout title="Edit organisation">
        <div className="card p-10 text-center text-red-500 text-sm">Organisation not found.</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={`Edit: ${org.name}`}
      subtitle={`${org.slug} · ${org.isPublished ? 'Published' : 'Draft'}`}
    >
      <OrgForm mode="edit" initial={org} />
    </AdminLayout>
  )
}

export default function EditOrganisationPage() {
  return (
    <Suspense fallback={
      <AdminLayout title="Edit organisation">
        <div className="card p-10 text-center text-adm-ink-muted text-sm">Loading…</div>
      </AdminLayout>
    }>
      <EditOrganisationContent />
    </Suspense>
  )
}
