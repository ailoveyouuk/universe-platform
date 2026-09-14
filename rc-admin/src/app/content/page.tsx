'use client'
import { useEffect, useState } from 'react'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import { getSMPerformance } from '@/lib/api/adminApi'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ContentPerformanceTable } from '@/components/dashboard/ContentPerformanceTable'
import type { SMPerformanceStat } from '@/lib/data/types'

export default function ContentPage() {
  // Sign-in / invite gating now happens once, centrally, in AdminLayout (via AdminAccessGate).
  const { isAuthenticated, notInvited } = useAdminAuth()
  const [smStats, setSmStats] = useState<SMPerformanceStat[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || notInvited) return
    setFetching(true)
    getSMPerformance()
      .then(setSmStats)
      .finally(() => setFetching(false))
  }, [isAuthenticated, notInvited])

  const worstDropoff = [...smStats].sort((a, b) => b.dropoffRate - a.dropoffRate).slice(0, 3)

  return (
    <AdminLayout title="Content" subtitle="Sub-module performance across the curriculum">
      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-rc-green border-t-transparent rounded-full animate-spin" />
          Loading content performance...
        </div>
      )}

      {!fetching && smStats.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">⬡</p>
          <h2 className="font-heading font-bold text-adm-bg text-lg mb-2">No performance data yet</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Data will appear here once learners start progressing through sub-modules.
          </p>
        </div>
      ) : (
        <>
          {worstDropoff.length > 0 && worstDropoff[0].dropoffRate > 0 && (
            <div className="card p-5 mb-5">
              <h3 className="font-heading font-semibold text-adm-bg text-sm mb-3">Highest drop-off</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {worstDropoff.map(sm => (
                  <div key={sm.smId} className="p-3 rounded-lg border border-adm-cborder">
                    <p className="text-xs font-mono font-semibold text-adm-bg mb-0.5">SM{sm.smId}</p>
                    <p className="text-xs text-slate-500 truncate mb-1.5">{sm.smTitle}</p>
                    <p className={`text-sm font-semibold ${sm.dropoffRate > 30 ? 'text-red-600' : 'text-adm-bg'}`}>
                      {Math.round(sm.dropoffRate)}% drop-off
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ContentPerformanceTable smStats={smStats} />

          <p className="text-xs text-slate-500 mt-4">
            Not yet available here: editing COL questions, flagging individual low-performing questions, and managing SM release schedules — these need dedicated content-management routes that don't exist yet.
          </p>
        </>
      )}
    </AdminLayout>
  )
}
