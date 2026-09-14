'use client'
import { useEffect, useState } from 'react'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'
import { getDashboardSummary } from '@/lib/api/employerApi'
import { EmployerLayout } from '@/components/layout/EmployerLayout'
import { TalentKPICard } from '@/components/dashboard/TalentKPICard'
import { SMCoverageChart } from '@/components/dashboard/SMCoverageChart'
import { RecentlyQualifiedFeed } from '@/components/dashboard/RecentlyQualifiedFeed'
import { ShortlistSummary } from '@/components/dashboard/ShortlistSummary'
import { ActiveRolesList } from '@/components/dashboard/ActiveRolesList'
import type { EmployerDashboardData } from '@/lib/data/types'

export default function DashboardPage() {
  // Sign-in / invite gating now happens once, centrally, in EmployerLayout
  // (via EmployerAccessGate) — every employer page gets it, not just this one.
  const { isAuthenticated, employer } = useEmployerAuth()
  const [data, setData] = useState<EmployerDashboardData | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    setFetching(true)
    getDashboardSummary(employer.id)
      .then(setData)
      .finally(() => setFetching(false))
  }, [isAuthenticated, employer])

  const stats = data?.stats
  const avgCOL = stats?.avgCOLPercent

  return (
    <EmployerLayout
      title="Dashboard"
      subtitle={`${employer?.name ?? 'Your organisation'} · Talent overview`}
    >
      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-emp-accent border-t-transparent rounded-full animate-spin" />
          Refreshing data...
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <TalentKPICard
          label="Available Candidates"
          value={stats?.totalAvailable ?? 0}
          sub="Opted in to employer discovery"
          icon="◉"
          accent="blue"
        />
        <TalentKPICard
          label="New This Month"
          value={stats?.newThisMonth ?? 0}
          sub="Newly qualified in last 30 days"
          icon="⚡"
          accent="green"
        />
        <TalentKPICard
          label="Module Complete"
          value={stats?.moduleComplete ?? 0}
          sub="All 15 sub-modules finished"
          icon="◎"
          accent="amber"
        />
        <TalentKPICard
          label="Avg COL Score"
          value={avgCOL != null ? `${Math.round(avgCOL)}%` : '—'}
          sub="Confirmation of Learning · talent pool"
          icon="▦"
          accent={avgCOL == null ? 'default' : avgCOL >= 80 ? 'green' : avgCOL >= 60 ? 'amber' : 'default'}
        />
      </div>

      {/* Coverage chart + Recently qualified */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        <div className="xl:col-span-3">
          <SMCoverageChart smCoverage={stats?.smCoverage ?? []} />
        </div>
        <div className="xl:col-span-2">
          <RecentlyQualifiedFeed candidates={data?.recentlyQualified ?? []} />
        </div>
      </div>

      {/* Pipeline + Roles */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ShortlistSummary shortlisted={data?.shortlisted ?? []} />
        <ActiveRolesList roles={data?.activeRoles ?? []} />
      </div>
    </EmployerLayout>
  )
}
