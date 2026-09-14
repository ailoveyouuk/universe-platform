'use client'
import { useEffect, useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'
import { getStudents, getCohorts } from '@/lib/api/institutionApi'
import { InstitutionLayout } from '@/components/layout/InstitutionLayout'
import { StudentRoster } from '@/components/students/StudentRoster'
import type { Student, Cohort } from '@/lib/data/types'

export default function StudentsPage() {
  // Sign-in gating now happens once, centrally, in InstitutionLayout (via InstitutionAccessGate).
  const { isAuthenticated, institution } = useInstitutionAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !institution) return
    setDataLoading(true)
    Promise.all([
      getStudents(institution.id),
      getCohorts(institution.id),
    ]).then(([s, c]) => {
      setStudents(s)
      setCohorts(c)
    }).finally(() => setDataLoading(false))
  }, [isAuthenticated, institution])

  return (
    <InstitutionLayout title="Students" subtitle="Individual learner records & progress">
      {dataLoading && <div className="mb-4 text-xs text-slate-500">Loading data…</div>}
      <StudentRoster students={students} cohorts={cohorts} loading={dataLoading} />
    </InstitutionLayout>
  )
}
