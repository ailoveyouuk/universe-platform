'use client'
import { useEffect, useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'
import { getCohorts, getStudents } from '@/lib/api/institutionApi'
import { InstitutionLayout } from '@/components/layout/InstitutionLayout'
import { CohortList } from '@/components/cohorts/CohortList'
import type { Cohort, Student } from '@/lib/data/types'

export default function CohortsPage() {
  // Sign-in gating now happens once, centrally, in InstitutionLayout (via InstitutionAccessGate).
  const { isAuthenticated, institution } = useInstitutionAuth()
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !institution) return
    setDataLoading(true)
    Promise.all([
      getCohorts(institution.id),
      getStudents(institution.id),
    ]).then(([c, s]) => {
      setCohorts(c)
      setStudents(s)
    }).finally(() => setDataLoading(false))
  }, [isAuthenticated, institution])

  return (
    <InstitutionLayout title="Cohorts" subtitle="Manage cohort groups and compare performance">
      {dataLoading && <div className="mb-4 text-xs text-slate-500">Loading data…</div>}
      <CohortList cohorts={cohorts} students={students} loading={dataLoading} />
    </InstitutionLayout>
  )
}
