'use client'
import { useEffect, useState } from 'react'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import { getDashboard, deleteActivityEvent } from '@/lib/api/adminApi'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PlatformKPICard } from '@/components/dashboard/PlatformKPICard'
import { LearnerFunnelChart } from '@/components/dashboard/LearnerFunnelChart'
import { ContentPerformanceTable } from '@/components/dashboard/ContentPerformanceTable'
import { InstitutionOverviewTable } from '@/components/dashboard/InstitutionOverviewTable'
import { EmployerOverviewTable } from '@/components/dashboard/EmployerOverviewTable'
import { PlatformActivityFeed } from '@/components/dashboard/PlatformActivityFeed'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import type { AdminDashboardData } from '@/lib/data/types'

export default function AdminDashboardPage() {
  // Sign-in / invite gating now happens once, centrally, in AdminLayout
  // (via AdminAccessGate) — every admin page gets it, not just this one.
  const { isAuthenticated, notInvited } = useAdminAuth()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [fetching, setFetching] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [removingActivityId, setRemovingActivityId] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  async function handleRemoveActivity(eventId: string) {
    setRemovingActivityId(eventId)
    setActivityError(null)
    const { ok, error } = await deleteActivityEvent(eventId)
    if (ok) {
      setData(prev => prev && { ...prev, recentActivity: prev.recentActivity.filter(e => e.id !== eventId) })
    } else {
      setActivityError(error ?? 'Could not remove that event.')
    }
    setRemovingActivityId(null)
  }

  useEffect(() => {
    if (!isAuthenticated || notInvited) return
    setFetching(true)
    setLoadError(null)
    getDashboard()
      .then(setData)
      .catch(() => setLoadError('Could not load dashboard data — check your connection and try refreshing. If this keeps happening, try signing out and back in.'))
      .finally(() => setFetching(false))
  }, [isAuthenticated, notInvited])

  const stats = data?.stats
  const alerts = data?.alerts ?? []
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

  return (
    <AdminLayout
      title="Platform Overview"
      subtitle={`Renewables Connect · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={
        criticalAlerts > 0 ? (
          <span className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200">
            <span>⚑</span> {criticalAlerts} critical alert{criticalAlerts > 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-rc-green border-t-transparent rounded-full animate-spin" />
          Refreshing data...
        </div>
      )}

      {loadError && !fetching && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">
          <span>⚑ {loadError}</span>
          <button
            onClick={() => { setFetching(true); setLoadError(null); getDashboard().then(setData).catch(() => setLoadError('Still could not load dashboard data.')).finally(() => setFetching(false)) }}
            className="text-red-700 underline hover:opacity-70 transition-opacity shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Learner KPIs */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Learners</p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <PlatformKPICard label="Total Learners"     value={stats?.totalLearners ?? 0}      sub="Registered on platform"           accent="green" icon="◉" />
        <PlatformKPICard label="Active (30 days)"   value={stats?.activeLearners30d ?? 0}   sub="Engaged in last 30 days"          accent="green" icon="⚡" />
        <PlatformKPICard label="New This Month"     value={stats?.newLearners30d ?? 0}      sub="Recent registrations"             icon="+" />
        <PlatformKPICard
          label="Avg COL Score"
          value={stats?.avgCOLPercent != null ? `${Math.round(stats.avgCOLPercent)}%` : '—'}
          sub="Platform-wide average"
          accent={stats?.avgCOLPercent == null ? 'default' : stats.avgCOLPercent >= 80 ? 'green' : stats.avgCOLPercent >= 60 ? 'gold' : 'red'}
          icon="◎"
        />
      </div>

      {/* Partner KPIs */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Partners</p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <PlatformKPICard label="Institutions"           value={stats?.totalInstitutions ?? 0}        sub="Education partners"         accent="blue"  icon="⊞" />
        <PlatformKPICard label="Institution Students"   value={stats?.totalInstitutionStudents ?? 0} sub="Via institution cohorts"     icon="◉" />
        <PlatformKPICard label="Employer Partners"      value={stats?.totalEmployers ?? 0}           sub="Renewable energy companies" accent="blue"  icon="◈" />
        <PlatformKPICard label="Active Employers (30d)" value={stats?.activeEmployers30d ?? 0}       sub="Accessed platform recently" icon="◈" />
      </div>

      {/* Funnel + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <LearnerFunnelChart funnel={data?.funnel ?? { registered: 0, startedSM1: 0, completedPart1: 0, completedModule: 0 }} />
        </div>
        <div className="xl:col-span-1">
          <AlertsPanel alerts={data?.alerts ?? []} />
        </div>
      </div>

      {/* Content performance */}
      <div className="mb-6">
        <ContentPerformanceTable smStats={data?.smPerformance ?? []} />
      </div>

      {/* Institutions + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <InstitutionOverviewTable institutions={data?.institutions ?? []} />
        </div>
        <div className="xl:col-span-1">
          {activityError && <p className="text-xs text-red-600 mb-2">{activityError}</p>}
          <PlatformActivityFeed
            events={data?.recentActivity ?? []}
            onRemove={handleRemoveActivity}
            removingId={removingActivityId}
          />
        </div>
      </div>

      {/* Employers */}
      <EmployerOverviewTable employers={data?.employers ?? []} />
    </AdminLayout>
  )
}
