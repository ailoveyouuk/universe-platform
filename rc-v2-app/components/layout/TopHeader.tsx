'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

interface TopHeaderProps {
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  onMobileMenuToggle?: () => void
  /** Compact two-line heading shown only below sm:. Used by the module
   *  viewer, where the sub-module title and section title together are too
   *  long for the single-line breadcrumb trail to show without both ends
   *  being truncated into illegibility. The full breadcrumb trail still
   *  renders from sm: up. */
  mobileHeading?: {
    badge: string
    title: string
    subtitle?: string
  }
}

export function TopHeader({ breadcrumbs = [], actions, onMobileMenuToggle, mobileHeading }: TopHeaderProps) {
  const { isAuthenticated, user, signIn } = useAuth()

  return (
    <header className="rc-header sticky top-0 z-30">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden flex flex-col gap-1.5 p-1 text-rc-grey flex-shrink-0"
          aria-label="Open menu"
        >
          <span className="block w-5 h-0.5 bg-current rounded" />
          <span className="block w-5 h-0.5 bg-current rounded" />
          <span className="block w-5 h-0.5 bg-current rounded" />
        </button>

        {/* Compact heading — mobile only */}
        {mobileHeading && (
          <div className="flex sm:hidden flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="rc-tag bg-rc-green-50 text-rc-green text-[11px] px-2 py-0.5 flex-shrink-0">
                {mobileHeading.badge}
              </span>
              <span className="text-sm font-semibold text-rc-dark truncate">
                {mobileHeading.title}
              </span>
            </div>
            {mobileHeading.subtitle && (
              <span className="text-xs text-rc-grey-light truncate">
                {mobileHeading.subtitle}
              </span>
            )}
          </div>
        )}

        {/* Breadcrumb
            Desktop (sm: and up): always shown, full trail.
            Mobile: shows only the last 2 segments — unless a dedicated
            mobileHeading is supplied, in which case that replaces it
            entirely on mobile (the breadcrumb trail is hidden below sm:).
            The separator before the second-to-last segment is also hidden on
            mobile so the first visible item has no leading ›.
        */}
        {breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className={clsx(
              'items-center gap-2 text-sm text-rc-grey min-w-0',
              mobileHeading ? 'hidden sm:flex' : 'flex',
            )}
          >
            {breadcrumbs.map((crumb, i) => {
              // Hide all items except the last two on mobile
              const hiddenOnMobile = i < breadcrumbs.length - 2
              // Hide separator on mobile for the first visible item (length-2)
              const separatorHiddenOnMobile = i > 0 && i < breadcrumbs.length - 1
              return (
                <span
                  key={i}
                  className={clsx(
                    'flex items-center gap-2 min-w-0',
                    hiddenOnMobile && 'hidden sm:flex',
                  )}
                >
                  {i > 0 && (
                    <span className={clsx(
                      'text-rc-border flex-shrink-0',
                      separatorHiddenOnMobile && 'hidden sm:inline',
                    )}>›</span>
                  )}
                  {crumb.href ? (
                    <a href={crumb.href} className="block min-w-0 hover:text-rc-dark transition-colors truncate">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="block min-w-0 text-rc-dark font-medium truncate">{crumb.label}</span>
                  )}
                </span>
              )
            })}
          </nav>
        )}
      </div>

      {/* Right: actions + user avatar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}
        {isAuthenticated && user ? (
          <div className="w-9 h-9 rounded-full bg-rc-green flex items-center justify-center cursor-pointer flex-shrink-0"
               title={user.displayName}>
            <span className="text-white font-semibold text-xs font-heading">
              {user.displayName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </span>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={signIn}>
            Sign In
          </Button>
        )}
      </div>

    </header>
  )
}
