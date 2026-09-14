'use client'
import { useEffect, useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'
import { getInstitutionStats } from '@/lib/api/institutionApi'
import { InstitutionLayout } from '@/components/layout/InstitutionLayout'
import { KPICard } from '@/components/dashboard/KPICard'
import { COLScoreChart } from '@/components/dashboard/COLScoreChart'
import { SMPerformanceTable } from '@/components/analytics/SMPerformanceTable'
import { PartSummaryCards } from '@/components/analytics/PartSummaryCards'
import type { InstitutionStats } from '@/lib/data/types'

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

export default function AnalyticsPage() {
  // Sign-in gating now happens once, centrally, in InstitutionLayout (via InstitutionAccessGate).
  const { isAuthenticated, institution } = useInstitutionAuth()
  const [stats, setStats] = useState<InstitutionStats>(EMPTY_STATS)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !institution) return
    setDataLoading(true)
    getInstitutionStats(institution.id)
      .then(s => setStats(s))
      .finally(() => setDataLoading(false))
  }, [isAuthenticated, institution])

  return (
    <InstitutionLayout title="Analytics" subtitle="Deep-dive engagement and performance data">
      {dataLoading && <div className="mb-4 text-xs text-slate-500">Loading data…</div>}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Students"
          value={stats.totalStudents}
          sub="Enrolled"
          icon="◉"
        />
        <KPICard
          label="Active Students"
          value={stats.activeStudents}
          sub="Last 30 days"
          icon="⚡"
          color="green"
        />
        <KPICard
          label="Avg Completion"
          value={`${Math.round(stats.avgCompletionPercent)}%`}
          sub="of 15 sub-modules"
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

      {/* COL chart — reuses dashboard component */}
      <div className="mb-6">
        <COLScoreChart smStats={stats.smStats} />
      </div>

      {/* Part summary cards */}
      <div className="mb-6">
        <PartSummaryCards smStats={stats.smStats} />
      </div>

      {/* SM performance table */}
      <SMPerformanceTable smStats={stats.smStats} />
    </InstitutionLayout>
  )
}
