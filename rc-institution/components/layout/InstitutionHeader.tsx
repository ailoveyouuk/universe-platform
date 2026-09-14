'use client'
import { useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'

interface InstitutionHeaderProps {
  title: string
  subtitle?: string
  onMobileMenuToggle?: () => void
}

export function InstitutionHeader({ title, subtitle, onMobileMenuToggle }: InstitutionHeaderProps) {
  const {
    institution, user, signOut,
    isGlobalStaff, availableInstitutions, selectInstitution,
  } = useInstitutionAuth()
  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <header className="min-h-14 bg-white border-b border-inst-border flex items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-2 sm:py-0 flex-wrap sm:flex-nowrap flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden text-inst-slate text-lg leading-none flex-shrink-0"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-bold text-inst-slate text-base leading-tight sm:truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight sm:truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 relative">
        {institution && !isGlobalStaff && (
          <span className="bg-rc-green text-white text-xs font-semibold px-3 py-1 rounded-full font-heading hidden sm:inline-block">
            {institution.shortName}
          </span>
        )}
        {institution && isGlobalStaff && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="bg-rc-green text-white text-xs font-semibold px-3 py-1 rounded-full font-heading flex items-center gap-1"
            >
              {institution.shortName}
              <span className="text-[10px]">▾</span>
            </button>
            {switcherOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-inst-border rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto z-20">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Switch institution
                </p>
                {availableInstitutions.map(inst => (
                  <button
                    key={inst.id}
                    onClick={() => { selectInstitution(inst.id); setSwitcherOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-inst-slate hover:bg-slate-50 transition-colors truncate"
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {user && (
          <span className="text-xs text-slate-500 hidden sm:inline">{user.name}</span>
        )}
        <div className="w-8 h-8 rounded-full bg-inst-slate flex items-center justify-center">
          <span className="text-white font-semibold text-xs font-heading">{initials}</span>
        </div>
        {user && (
          <button
            onClick={signOut}
            className="text-xs text-slate-500 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
