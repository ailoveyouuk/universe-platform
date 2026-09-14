'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'

interface EmployerHeaderProps {
  title: string
  subtitle?: string
  onMobileMenuToggle?: () => void
}

export function EmployerHeader({ title, subtitle, onMobileMenuToggle }: EmployerHeaderProps) {
  const {
    employer, user, signOut,
    isGlobalStaff, availableEmployers, selectEmployer,
  } = useEmployerAuth()
  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <header className="min-h-14 bg-white border-b border-emp-border flex items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-2 sm:py-0 flex-wrap sm:flex-nowrap flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden text-emp-navy text-lg leading-none flex-shrink-0"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-bold text-emp-navy text-base leading-tight sm:truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight sm:truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 relative">
        {employer?.partnerTier && !isGlobalStaff && (
          <span className={clsx(
            'text-xs font-semibold px-3 py-1 rounded-full font-heading capitalize hidden sm:inline-block',
            employer.partnerTier === 'enterprise' ? 'bg-amber-100 text-amber-700' :
            employer.partnerTier === 'premium'    ? 'bg-emp-accent/10 text-emp-accent' :
                                                    'bg-slate-100 text-slate-600'
          )}>
            {employer.partnerTier}
          </span>
        )}
        {employer && isGlobalStaff && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="bg-emp-navy text-white text-xs font-semibold px-3 py-1 rounded-full font-heading flex items-center gap-1"
            >
              {employer.shortName}
              <span className="text-[10px]">▾</span>
            </button>
            {switcherOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-emp-border rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto z-20">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Switch employer
                </p>
                {availableEmployers.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => { selectEmployer(emp.id); setSwitcherOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-emp-navy hover:bg-slate-50 transition-colors truncate"
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {user && (
          <span className="text-xs text-slate-500 hidden sm:inline">{user.name}</span>
        )}
        <div className="w-8 h-8 rounded-full bg-emp-navy flex items-center justify-center">
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
