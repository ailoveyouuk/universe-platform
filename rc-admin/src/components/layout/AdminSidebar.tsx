'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useAdminAuth } from '@/lib/auth/useAdminAuth'

const NAV = [
  { href: '/dashboard',       label: 'Overview',        icon: '▦', group: 'Platform' },
  { href: '/learners',        label: 'Learners',         icon: '◉', group: 'Platform' },
  { href: '/institutions',    label: 'Institutions',     icon: '⊞', group: 'Partners' },
  { href: '/employers',       label: 'Employers',        icon: '◈', group: 'Partners' },
  { href: '/organisations',   label: 'Organisations',    icon: '◭', group: 'Partners' },
  { href: '/access-grants',   label: 'Access grants',    icon: '⚿', group: 'Partners' },
  { href: '/content',         label: 'Content',          icon: '⬡', group: 'Content' },
  { href: '/alerts',          label: 'Alerts',           icon: '⚑', group: 'System' },
  { href: '/reports',         label: 'Reports',          icon: '↓', group: 'System' },
  { href: '/team',            label: 'People',           icon: '⚙', group: 'System' },
]

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const { user, signOut } = useAdminAuth()
  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'RC'

  const groups = Array.from(new Set(NAV.map(n => n.group)))

  return (
    <aside className="w-full md:w-56 flex-shrink-0 bg-adm-bg flex flex-col h-full border-r border-adm-border overflow-y-auto overscroll-contain">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-adm-border flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-rc-green flex items-center justify-center flex-shrink-0">
            <span className="text-white font-heading font-bold text-xs">RC</span>
          </div>
          <span className="font-heading font-bold text-adm-text text-sm">Admin</span>
        </div>
        <p className="text-xs text-adm-muted">Renewables Connect · Internal</p>
      </div>

      {/* Navigation — grouped */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {groups.map(group => (
          <div key={group} className="mb-4">
            <p className="text-xs font-semibold text-adm-muted uppercase tracking-wider px-3 mb-1">{group}</p>
            {NAV.filter(n => n.group === group).map(item => (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <div className={clsx('nav-item mb-0.5', pathname.startsWith(item.href) && 'active')}>
                  <span className="text-sm w-4 text-center">{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t border-adm-border flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-rc-green flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs font-heading">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-adm-text text-xs font-medium truncate">{user?.name ?? 'RC Staff'}</p>
            <p className="text-adm-muted text-xs capitalize">{user?.role?.replace('rc_', '') ?? ''}</p>
          </div>
          <button onClick={signOut} className="text-adm-muted hover:text-adm-text transition-colors text-xs" title="Sign out">↩</button>
        </div>
      </div>
    </aside>
  )
}
