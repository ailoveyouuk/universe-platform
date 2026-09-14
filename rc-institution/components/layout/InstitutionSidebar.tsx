'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',     icon: '▦' },
  { href: '/students',      label: 'Students',      icon: '◉' },
  { href: '/cohorts',       label: 'Cohorts',        icon: '⊞' },
  { href: '/add-learners',  label: 'Add learners',  icon: '+' },
  { href: '/analytics',     label: 'Analytics',      icon: '◈' },
]

export function InstitutionSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const { user, institution, signOut } = useInstitutionAuth()

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <aside className="w-full md:w-60 flex-shrink-0 bg-white border-r border-inst-border flex flex-col h-full overflow-y-auto overscroll-contain">
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-inst-border flex-shrink-0">
        {institution?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={institution.logoUrl} alt={institution.name} className="h-8 w-auto mb-3" />
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rc-green flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xs">{institution?.shortName?.slice(0,2) ?? 'RC'}</span>
            </div>
            <span className="font-heading font-bold text-inst-slate text-sm leading-tight">{institution?.shortName ?? 'Institution'}</span>
          </div>
        )}
        <p className="text-xs text-slate-500">Powered by <span className="text-rc-green font-semibold">Renewables Connect</span></p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <div className={clsx('nav-item mb-0.5', pathname.startsWith(item.href) && 'active')}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-5 pt-3 border-t border-inst-border flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-rc-green flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs font-heading">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-inst-slate text-xs font-medium truncate">{user?.name}</p>
            <span className="inline-block text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 capitalize">{user?.role}</span>
          </div>
          <button onClick={signOut} className="text-slate-500 hover:text-inst-slate transition-colors text-xs" title="Sign out">↩</button>
        </div>
      </div>
    </aside>
  )
}
