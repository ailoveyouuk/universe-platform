'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { EmployerSidebar } from './EmployerSidebar'
import { EmployerHeader } from './EmployerHeader'
import { EmployerAccessGate } from '../auth/EmployerAccessGate'

interface EmployerLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function EmployerLayout({ children, title, subtitle }: EmployerLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMenuOpen])

  return (
    <EmployerAccessGate>
      <div className="flex h-screen overflow-hidden bg-emp-bg">
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div className={clsx(
          'fixed inset-y-0 left-0 z-50 flex md:relative md:flex-shrink-0',
          'transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}>
          <EmployerSidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EmployerHeader
            title={title}
            subtitle={subtitle}
            onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
          />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </EmployerAccessGate>
  )
}
