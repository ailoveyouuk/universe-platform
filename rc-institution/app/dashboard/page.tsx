'use client'
import { useEffect, useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'
import { getInstitutionStats, getCohorts, getStudents } from '@/lib/api/institutionApi'
import { InstitutionLayout } from '@/components/layout/InstitutionLayout'
import { KPICard } from '@/components/dashboard/KPICard'
import { COLScoreChart } from '@/components/dashboard/COLScoreChart'
import { TopBottomSMs } from '@/components/dashboard/TopBottomSMs'
import { CohortProgressTable } from '@/components/dashboard/CohortProgressTable'
import { CompletionHeatmap } from '@/components/dashboard/CompletionHeatmap'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import type { InstitutionStats, Cohort, Student } from '@/lib/data/types'

function colScoreColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 80) return 'green'
  if (pct >= 60) return 'amber'
  return 'red'
}

const EMPTY_STATS: InstitutionStats = {
  totalStudents: 0,
  activeStudents: 0,
  avgCompletionPercent: 0,
  avgCOLPercent: 0,
  smStats: [],
}

export default function DashboardPage() {
  // Sign-in / invite gating now happens once, centrally, in InstitutionLayout
  // (via InstitutionAccessGate) — every institution page gets it, not just this one.
  const { isAuthenticated, institution } = useInstitutionAuth()
  const [stats, setStats] = useState<InstitutionStats>(EMPTY_STATS)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !institution) return
    setDataLoading(true)
    Promise.all([
      getInstitutionStats(institution.id),
      getCohorts(institution.id),
      getStudents(institution.id),
    ]).then(([s, c, st]) => {
      setStats(s)
      setCohorts(c)
      setStudents(st)
    }).finally(() => setDataLoading(false))
  }, [isAuthenticated, institution])

  return (
    <InstitutionLayout
      title="Dashboard"
      subtitle={institution ? `${institution.name} · Live overview` : 'Live overview'}
    >
      {dataLoading && (
        <div className="mb-4 text-xs text-slate-500">Loading data…</div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Students"
          value={stats.totalStudents}
          sub={`Across ${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}`}
          icon="◉"
        />
        <KPICard
          label="Active Learners"
          value={stats.activeStudents}
          sub={stats.totalStudents > 0
            ? `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}% of enrolled · last 30 days`
            : 'last 30 days'}
          icon="⚡"
          color="green"
        />
        <KPICard
          label="Avg Completion"
          value={`${Math.round(stats.avgCompletionPercent)}%`}
          sub="of 15 sub-modules completed"
          icon="▦"
        />
        <KPICard
          label="Avg COL Score"
          value={`${Math.round(stats.avgCOLPercent)}%`}
          sub="Confirmation of Learning"
          icon="◎"
          color={colScoreColor(stats.avgCOLPercent)}
        />
      </div>

      {/* COL chart + Top/Bottom */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        <div className="xl:col-span-3">
          <COLScoreChart smStats={stats.smStats} />
        </div>
        <div className="xl:col-span-2">
          <TopBottomSMs smStats={stats.smStats} />
        </div>
      </div>

      {/* Cohort table */}
      <div className="mb-6">
        <CohortProgressTable cohorts={cohorts} students={students} />
      </div>

      {/* Heatmap + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <CompletionHeatmap cohorts={cohorts} students={students} />
        </div>
        <div className="xl:col-span-1">
          <RecentActivityFeed students={students} />
        </div>
      </div>
    </InstitutionLayout>
  )
}
