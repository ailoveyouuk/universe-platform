'use client'
import { useEffect, useState } from 'react'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import { getPlatformAlerts, dismissAlert } from '@/lib/api/adminApi'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import type { PlatformAlert } from '@/lib/data/types'

const CATEGORIES: PlatformAlert['category'][] = ['engagement', 'performance', 'system', 'commercial']

export default function AlertsPage() {
  // Sign-in / invite gating now happens once, centrally, in AdminLayout (via AdminAccessGate).
  const { isAuthenticated, notInvited } = useAdminAuth()
  const [alerts, setAlerts] = useState<PlatformAlert[]>([])
  const [fetching, setFetching] = useState(false)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [category, setCategory] = useState<PlatformAlert['category'] | ''>('')

  async function load() {
    setFetching(true)
    const data = await getPlatformAlerts()
    setAlerts(data)
    setFetching(false)
  }

  useEffect(() => {
    if (!isAuthenticated || notInvited) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, notInvited])

  async function handleDismiss(alertId: string) {
    setDismissingId(alertId)
    await dismissAlert(alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
    setDismissingId(null)
  }

  const filtered = category ? alerts.filter(a => a.category === category) : alerts

  return (
    <AdminLayout title="Alerts" subtitle="Platform-wide alert history">
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setCategory('')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${category === '' ? 'bg-adm-bg text-white' : 'bg-white text-slate-500 border border-adm-cborder hover:border-adm-bg'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${category === c ? 'bg-adm-bg text-white' : 'bg-white text-slate-500 border border-adm-cborder hover:border-adm-bg'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-rc-green border-t-transparent rounded-full animate-spin" />
          Loading alerts...
        </div>
      )}

      <AlertsPanel alerts={filtered} onDismiss={handleDismiss} dismissingId={dismissingId} />

      <p className="text-xs text-slate-500 mt-4">
        Not yet available here: configurable alert thresholds and assigning alerts to specific RC staff members — dismissing (shown above) is the only resolution action the backend supports today.
      </p>
    </AdminLayout>
  )
}
