'use client'

import Link                        from 'next/link'
import { useProfile }              from '@/lib/profile/useProfile'
import { calcProfileSummary }      from '@/lib/profile/completion'
import { ProfileCompletionRing }   from '@/components/profile/ProfileCompletionRing'

export function ProfileDashboardCard() {
  const { profile, loading } = useProfile()
  const summary = calcProfileSummary(profile)
  const { overallPct, sectionsComplete } = summary
  const optedIn = profile.optInToDiscovery === true

  if (loading) {
    return (
      <div className="bg-white border border-rc-border rounded-2xl px-5 py-5 flex items-center gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-rc-border flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-rc-border rounded w-1/2" />
          <div className="h-3 bg-rc-border rounded w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <Link href="/profile" className="block group">
      <div className="bg-white border border-rc-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
        <ProfileCompletionRing pct={overallPct} size={64} stroke={6} />

        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-rc-dark text-sm">Career Profile</p>
          <p className="text-rc-grey-light text-xs mt-0.5">
            {sectionsComplete} of 9 sections complete
          </p>
          <p className={`text-xs mt-1 ${optedIn ? 'text-rc-green' : 'text-rc-grey-light'}`}>
            {optedIn
              ? '● Profile visible to employers'
              : '○ Profile hidden — opt in to be discovered'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-rc-green font-semibold text-sm group-hover:translate-x-0.5 transition-transform duration-200">
            {overallPct === 100 ? 'View →' : 'Complete →'}
          </span>
        </div>
      </div>
    </Link>
  )
}
