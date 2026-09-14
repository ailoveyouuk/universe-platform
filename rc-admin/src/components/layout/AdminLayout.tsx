'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import { AdminAccessGate } from '../auth/AdminAccessGate'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

// Every admin page renders through here, so gating access once at this
// level (rather than repeating a sign-in/notInvited check in each page)
// means EVERY page — not just the dashboard — gets the same on-brand
// "not set up yet" screen instead of silently rendering empty.
export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Lock background scroll while the mobile sidebar drawer is open —
  // otherwise iOS Safari lets a touch-drag inside the drawer scroll the
  // page underneath it instead of the drawer's own nav list.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMenuOpen])

  return (
    <AdminAccessGate>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar — slide-out drawer on mobile, static on desktop */}
        <div className={clsx(
          'fixed inset-y-0 left-0 z-50 flex md:relative md:flex-shrink-0',
          'transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}>
          <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-adm-page">
          <AdminHeader
            title={title}
            subtitle={subtitle}
            actions={actions}
            onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
          />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </AdminAccessGate>
  )
}
