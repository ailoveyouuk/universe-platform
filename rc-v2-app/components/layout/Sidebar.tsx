'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx }        from 'clsx'
import { useAuth }     from '@/lib/auth/useAuth'
import { Button }      from '@/components/ui/Button'
import { useProgress } from '@/lib/progress/useProgress'
import { PARTS }       from '@/lib/curriculum'

// ── Part accent colours in sidebar ───────────────────────────────────────────

const PART_BAR_COLOR: Record<number, string> = {
  1: 'bg-rc-green',
  2: 'bg-blue-500',
  3: 'bg-purple-500',
}

export function Sidebar() {
  const pathname  = usePathname()
  const { isAuthenticated, user, signIn, signOut } = useAuth()
  const { partPercent } = useProgress()

  return (
    <aside className="rc-sidebar scrollbar-hidden">

      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-white/10 flex-shrink-0">
        {/* White bg panel so the logo reads clearly on the dark sidebar */}
        <div className="bg-white rounded-lg px-3 py-2 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/rc-logo-small.png"
            alt="Renewables Connect"
            className="h-7 w-auto"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overscroll-contain scrollbar-hidden">

        {/* Main */}
        <div className="mb-2">
          <p className="nav-label">Main</p>
          <Link
            href="/dashboard"
            className={clsx('nav-item', pathname === '/dashboard' && 'active')}
          >
            <span className="text-base w-5 text-center">▦</span>
            Dashboard
          </Link>
          <Link
            href="/overview"
            className={clsx('nav-item', pathname === '/overview' && 'active')}
          >
            <span className="text-base w-5 text-center">◈</span>
            Programme Overview
          </Link>
          <Link
            href="/certificates"
            className={clsx('nav-item', pathname === '/certificates' && 'active')}
          >
            <span className="text-base w-5 text-center">◎</span>
            My Certificates
          </Link>
          <Link
            href="/profile"
            className={clsx('nav-item', pathname.startsWith('/profile') && 'active')}
          >
            <span className="text-base w-5 text-center">◉</span>
            Career Profile
          </Link>
          <Link
            href="/partners"
            className={clsx('nav-item', pathname.startsWith('/partners') && 'active')}
          >
            <span className="text-base w-5 text-center">🏢</span>
            Company Profiles
          </Link>
        </div>

        {/* Curriculum — Parts with live progress */}
        <div className="mb-2">
          <p className="nav-label">Curriculum</p>

          {PARTS.map(part => {
            const progress   = partPercent(part.number)
            const partPath   = `/learn/module-1/part/${part.number}`
            const isActive   = pathname.startsWith(partPath) ||
                               pathname.includes(`/part/${part.number}`)
            const barColor   = PART_BAR_COLOR[part.number] ?? 'bg-rc-green'

            return (
              <Link key={part.number} href={partPath}>
                <div className={clsx(
                  'flex flex-col gap-1.5 px-4 py-3 rounded-md cursor-pointer mb-1',
                  'transition-colors duration-200',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10',
                )}>
                  <div className="flex items-center gap-3">
                    <span className="text-base w-5 text-center flex-shrink-0">
                      {part.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate">
                        {part.title}: {part.subtitle}
                      </p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0 tabular-nums opacity-70">
                      {progress}%
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  <div className="ml-8 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', barColor)}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

      </nav>

      {/* User / Auth section */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10 flex-shrink-0">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-rc-green flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs font-heading">
                {user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.displayName}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="text-white/40 hover:text-white transition-colors text-xs"
              title="Sign out"
            >
              ↩
            </button>
          </div>
        ) : (
          <div className="px-1">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={signIn}
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            >
              <span>Ⓜ</span> Sign in with Microsoft
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
