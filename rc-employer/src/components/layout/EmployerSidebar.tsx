'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '▦' },
  { href: '/candidates', label: 'Talent Pool', icon: '◉' },
  { href: '/shortlist',  label: 'Shortlist',   icon: '★' },
  { href: '/roles',      label: 'Open Roles',  icon: '◈' },
  { href: '/insights',   label: 'Insights',    icon: '⬡' },
]

export function EmployerSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const { user, employer, signOut } = useEmployerAuth()

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <aside className="w-full md:w-60 flex-shrink-0 bg-emp-navy flex flex-col h-full overflow-y-auto overscroll-contain">
      {/* Logo / brand area */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        {employer?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employer.logoUrl} alt={employer.name} className="h-8 w-auto mb-3" />
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emp-accent flex items-center justify-center">
              <span className="text-white font-heading font-bold text-xs">
                {employer?.shortName?.slice(0, 2) ?? 'RC'}
              </span>
            </div>
            <span className="font-heading font-bold text-white text-sm leading-tight">
              {employer?.name ?? 'Employer Portal'}
            </span>
          </div>
        )}
        <p className="text-xs text-white/40">
          Powered by <span className="text-rc-green font-semibold">Renewables Connect</span>
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <div className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer mb-0.5',
              pathname.startsWith(item.href)
                ? 'bg-emp-accent/20 text-emp-accent font-semibold'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            )}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-emp-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs font-heading">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name ?? 'Not signed in'}</p>
            <p className="text-white/40 text-xs capitalize">{user?.role ?? ''}</p>
          </div>
          <button
            onClick={signOut}
            className="text-white/40 hover:text-white transition-colors text-xs"
            title="Sign out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
