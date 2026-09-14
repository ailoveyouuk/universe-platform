'use client'
import { useEffect, useState } from 'react'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'
import { exportReport, viewReport, type ReportData } from '@/lib/api/adminApi'
import { AdminLayout } from '@/components/layout/AdminLayout'

const REPORT_TYPES: { value: 'learners' | 'institutions' | 'employers' | 'content'; label: string; description: string }[] = [
  { value: 'learners',     label: 'Learners',     description: 'Every learner — institution, cohort, enrolment date, last active, unlocked parts.' },
  { value: 'institutions', label: 'Institutions',  description: 'Every institution — student counts, 30-day active learners, average completion and CoL score.' },
  { value: 'employers',    label: 'Employers',     description: 'Every employer — open roles, shortlisted candidates, last staff sign-in.' },
  { value: 'content',      label: 'Content performance', description: 'Every sub-module — starts, completions, completion rate, average CoL score, drop-off.' },
]

export default function ReportsPage() {
  // Sign-in / invite gating now happens once, centrally, in AdminLayout (via AdminAccessGate).
  const { isAuthenticated, notInvited } = useAdminAuth()
  const [type, setType] = useState<typeof REPORT_TYPES[number]['value']>('learners')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Loads the same data the export builds, straight into a table — no need
  // to pick a format and download a file just to see what's in a report.
  useEffect(() => {
    if (!isAuthenticated || notInvited) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setExportError(null)
    viewReport(type)
      .then(data => { if (!cancelled) setReport(data) })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load report') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [type, isAuthenticated, notInvited])

  async function handleExport(format: 'csv' | 'xlsx') {
    if (!isAuthenticated || notInvited) return
    setExportingFormat(format)
    setExportError(null)
    const result = await exportReport(type, format)
    setExportingFormat(null)
    if (!result.ok) setExportError(result.message)
  }

  const activeReport = REPORT_TYPES.find(r => r.value === type)

  return (
    <AdminLayout title="Reports" subtitle="Browse or export platform data for stakeholder reporting">
      <div className="card p-6 mb-5">
        <p className="text-xs font-semibold text-adm-ink-muted uppercase tracking-wider mb-2">Report</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => setType(rt.value)}
              className={`text-left px-3.5 py-3 rounded-lg border transition-colors ${
                type === rt.value ? 'border-rc-green bg-rc-green/10' : 'border-adm-cborder bg-white hover:border-adm-bg'
              }`}
            >
              <p className="font-semibold text-sm text-adm-bg">{rt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-adm-border">
          <div>
            <h2 className="font-heading font-bold text-adm-bg text-sm">{activeReport?.label}</h2>
            <p className="text-xs text-adm-ink-muted mt-0.5">
              {report ? `${report.rows.length} row${report.rows.length === 1 ? '' : 's'} · live, generated just now` : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exportingFormat !== null || loading || !isAuthenticated || notInvited}
              className="bg-white text-adm-bg text-xs font-semibold px-3.5 py-2 rounded-lg border border-adm-cborder hover:border-adm-bg transition-colors disabled:opacity-50"
            >
              {exportingFormat === 'csv' ? 'Generating…' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exportingFormat !== null || loading || !isAuthenticated || notInvited}
              className="bg-rc-green text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {exportingFormat === 'xlsx' ? 'Generating…' : 'Export XLSX'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-adm-ink-muted text-sm">Loading…</div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600">Couldn't load this report: {loadError}</p>
          </div>
        ) : !report || report.rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">⊞</p>
            <p className="text-adm-ink-muted text-sm">No rows yet for this report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-adm-border">
                  {report.columns.map(col => (
                    <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-adm-ink-muted uppercase tracking-wider whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-border">
                {report.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-adm-page/50 transition-colors">
                    {report.columns.map((col, j) => (
                      <td key={col.key} className={`px-4 py-3 text-xs whitespace-nowrap ${j === 0 ? 'font-semibold text-adm-ink' : 'text-adm-ink-muted'}`}>
                        {row[col.key] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {exportError && (
        <p className="text-xs text-red-600 mt-3">Export failed: {exportError}</p>
      )}

      <p className="text-xs text-slate-500 mt-4">
        The table above is the same data an export contains — pick CSV or Excel above to download it. Not yet built:
        scheduled/recurring exports and a saved-report history.
      </p>
    </AdminLayout>
  )
}
