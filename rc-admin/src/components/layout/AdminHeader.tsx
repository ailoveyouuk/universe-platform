'use client'

import { useAdminAuth } from '@/lib/auth/useAdminAuth'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onMobileMenuToggle?: () => void
}

export function AdminHeader({ title, subtitle, actions, onMobileMenuToggle }: AdminHeaderProps) {
  const { user, signOut } = useAdminAuth()

  return (
    <header className="min-h-14 bg-white border-b border-adm-cborder flex items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-2 sm:py-0 flex-wrap sm:flex-nowrap flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden text-adm-bg text-lg leading-none flex-shrink-0"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-bold text-adm-bg text-base leading-tight sm:truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight sm:truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {user && (
          <>
            <span className="text-xs text-slate-500 hidden sm:inline">{user.name}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-rc-green bg-rc-green/10 px-2 py-0.5 rounded-full">
              {user.role.replace('rc_', '')}
            </span>
            <button
              onClick={signOut}
              className="text-xs text-slate-500 hover:text-slate-600 transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
