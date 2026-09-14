'use client'
import { useEffect, useState } from 'react'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'
import { getAllRoles, createRole, updateRoleStatus } from '@/lib/api/employerApi'
import { EmployerLayout } from '@/components/layout/EmployerLayout'
import type { JobRole } from '@/lib/data/types'

const STATUS_STYLES: Record<JobRole['status'], { label: string; className: string }> = {
  open:   { label: 'Open',   className: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
  filled: { label: 'Filled', className: 'bg-slate-100 text-slate-500' },
}

const ALL_SMS = Array.from({ length: 15 }, (_, i) => i + 1)

type FormState = {
  title: string
  department: string
  minCOLPercent: string
  minSMsCompleted: string
  requiredSMs: number[]
}

const EMPTY_FORM: FormState = { title: '', department: '', minCOLPercent: '', minSMsCompleted: '', requiredSMs: [] }

export default function RolesPage() {
  // Sign-in gating now happens once, centrally, in EmployerLayout (via EmployerAccessGate).
  const { isAuthenticated, employer } = useEmployerAuth()
  const [roles, setRoles] = useState<JobRole[]>([])
  const [fetching, setFetching] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function loadRoles() {
    if (!employer) return
    setFetching(true)
    const data = await getAllRoles(employer.id)
    setRoles(data)
    setFetching(false)
  }

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, employer])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!employer || !form.title.trim() || !form.department.trim()) return
    setSaving(true)
    const created = await createRole(employer.id, {
      title: form.title.trim(),
      department: form.department.trim(),
      requiredSMs: form.requiredSMs,
      minCOLPercent: form.minCOLPercent ? Number(form.minCOLPercent) : null,
      minSMsCompleted: form.minSMsCompleted ? Number(form.minSMsCompleted) : 0,
    })
    if (created) {
      setRoles(prev => [created, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
    }
    setSaving(false)
  }

  async function handleStatusChange(roleId: string, status: JobRole['status']) {
    if (!employer) return
    setUpdatingId(roleId)
    const updated = await updateRoleStatus(employer.id, roleId, status)
    if (updated) setRoles(prev => prev.map(r => (r.id === roleId ? updated : r)))
    setUpdatingId(null)
  }

  function toggleSM(sm: number) {
    setForm(prev => ({
      ...prev,
      requiredSMs: prev.requiredSMs.includes(sm) ? prev.requiredSMs.filter(x => x !== sm) : [...prev.requiredSMs, sm].sort((a, b) => a - b),
    }))
  }

  return (
    <EmployerLayout title="Open Roles" subtitle="Manage roles and see which candidates in your talent pool best fit them">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          {fetching ? 'Loading roles…' : `${roles.length} role${roles.length === 1 ? '' : 's'} posted`}
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emp-navy text-white hover:bg-emp-slate transition-colors"
        >
          {showForm ? 'Cancel' : '+ Post a role'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role title</label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="emp-field" placeholder="e.g. Solar Installation Technician" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Department</label>
              <input type="text" required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="emp-field" placeholder="e.g. Field Operations" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Minimum avg COL score (%)</label>
              <input type="number" min={0} max={100} value={form.minCOLPercent} onChange={e => setForm(f => ({ ...f, minCOLPercent: e.target.value }))}
                className="emp-field" placeholder="Optional — e.g. 75" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Minimum sub-modules completed</label>
              <input type="number" min={0} max={15} value={form.minSMsCompleted} onChange={e => setForm(f => ({ ...f, minSMsCompleted: e.target.value }))}
                className="emp-field" placeholder="Optional — e.g. 5" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Relevant sub-modules</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SMS.map(sm => (
                <button type="button" key={sm} onClick={() => toggleSM(sm)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    form.requiredSMs.includes(sm)
                      ? 'bg-emp-navy text-white border-emp-navy'
                      : 'bg-white text-slate-500 border-emp-border hover:border-emp-navy'
                  }`}
                >
                  SM {sm}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold rounded-lg bg-emp-accent text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
              {saving ? 'Posting…' : 'Post role'}
            </button>
          </div>
        </form>
      )}

      {!fetching && roles.length === 0 && !showForm ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">◈</p>
          <h2 className="font-heading font-bold text-emp-navy text-lg mb-2">No roles posted yet</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Post an open role with the sub-module expertise and COL threshold you need, then browse the Talent Pool filtered to match.
          </p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-emp-navy text-white hover:bg-emp-slate transition-colors">
            + Post your first role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map(role => {
            const { label, className } = STATUS_STYLES[role.status]
            const matchQuery = new URLSearchParams()
            if (role.minCOLPercent != null) matchQuery.set('minCOL', String(role.minCOLPercent))
            return (
              <div key={role.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-emp-navy">{role.title}</p>
                    <p className="text-xs text-slate-500">{role.department}</p>
                  </div>
                  <span className={`badge ${className}`}>{label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 my-3">
                  {role.minCOLPercent != null && <span>Min COL {role.minCOLPercent}%</span>}
                  {role.minSMsCompleted > 0 && <span>· Min {role.minSMsCompleted} SMs completed</span>}
                  {role.requiredSMs.length > 0 && <span>· {role.requiredSMs.length} relevant SM{role.requiredSMs.length === 1 ? '' : 's'}</span>}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-emp-border">
                  <a
                    href={`/candidates${matchQuery.toString() ? `?${matchQuery}` : ''}`}
                    className="text-xs font-semibold text-emp-accent hover:opacity-70 transition-opacity"
                  >
                    View matching candidates →
                  </a>
                  <div className="ml-auto flex items-center gap-1.5">
                    {role.status !== 'open' && (
                      <button disabled={updatingId === role.id} onClick={() => handleStatusChange(role.id, 'open')}
                        className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors disabled:opacity-50">Reopen</button>
                    )}
                    {role.status === 'open' && (
                      <button disabled={updatingId === role.id} onClick={() => handleStatusChange(role.id, 'paused')}
                        className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors disabled:opacity-50">Pause</button>
                    )}
                    {role.status !== 'filled' && (
                      <button disabled={updatingId === role.id} onClick={() => handleStatusChange(role.id, 'filled')}
                        className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors disabled:opacity-50">Mark filled</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </EmployerLayout>
  )
}
