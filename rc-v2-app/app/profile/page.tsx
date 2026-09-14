'use client'

import Link                       from 'next/link'
import { AppLayout }              from '@/components/layout/AppLayout'
import { ProfileCompletionRing }  from '@/components/profile/ProfileCompletionRing'
import { SectionCard }            from '@/components/profile/SectionCard'
import { useProfile }             from '@/lib/profile/useProfile'
import { calcProfileSummary }     from '@/lib/profile/completion'

export default function ProfileHubPage() {
  // Sign-in gating now happens once, centrally, in AppLayout.
  const { profile, loading } = useProfile()

  const summary = calcProfileSummary(profile)
  const { overallPct, sectionsComplete, sections } = summary
  const optedIn = profile.optInToDiscovery === true

  return (
    <AppLayout breadcrumbs={[{ label: 'Career Profile' }]}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2a1a 100%)' }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #82BC00, #5a8400)' }} />
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-stretch gap-6 sm:gap-10">

          <div className="flex-shrink-0">
            <ProfileCompletionRing pct={overallPct} size={144} stroke={10} dark />
          </div>

          <div className="hidden sm:block w-px bg-white/10 self-stretch" />

          <div className="flex-1 flex flex-col justify-center gap-3 text-center sm:text-left">
            <div>
              <p className="text-white/40 uppercase tracking-widest mb-1" style={{ fontSize: 11 }}>
                Renewables Connect — Talent Platform
              </p>
              <h1 className="font-heading font-bold text-white leading-tight" style={{ fontSize: 22 }}>
                {overallPct === 100
                  ? 'Profile complete — you\'re discoverable!'
                  : sectionsComplete === 0
                    ? 'Build your Career Profile'
                    : 'Keep building your profile'}
              </h1>
              <p className="text-white/50 mt-1.5 text-sm leading-relaxed">
                {sectionsComplete} of 9 sections complete
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <Link
                href="/profile/1"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm bg-rc-green text-white hover:bg-rc-green-600 transition-colors duration-200"
              >
                {sectionsComplete === 0 ? 'Start profile' : 'Continue editing'}
                <span>→</span>
              </Link>
              <Link
                href="/profile/preview"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm border border-white/20 text-white hover:bg-white/10 transition-colors duration-200"
              >
                Preview profile
              </Link>
            </div>
          </div>

          <div className="hidden sm:block w-px bg-white/10 self-stretch" />

          <div className="flex sm:flex-col justify-center gap-6 sm:gap-5 flex-shrink-0">
            <div className="flex flex-col items-center sm:items-start gap-0.5">
              <span className="font-heading font-bold text-white leading-none" style={{ fontSize: 26 }}>
                {sectionsComplete}/9
              </span>
              <span className="text-white/40 uppercase tracking-wider" style={{ fontSize: 10 }}>
                Sections done
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start gap-0.5">
              <span className={`font-heading font-bold leading-none ${optedIn ? 'text-rc-green' : 'text-white'}`} style={{ fontSize: 26 }}>
                {optedIn ? 'On' : 'Off'}
              </span>
              <span className="text-white/40 uppercase tracking-wider" style={{ fontSize: 10 }}>
                Discoverable
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Opt-in notice ─────────────────────────────────────────────────────── */}
      {!optedIn && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">ℹ</span>
          <p className="text-sm text-amber-800">
            Your profile is currently hidden from employers.{' '}
            <Link href="/profile/9" className="font-semibold underline hover:no-underline">
              Go to Visibility &amp; Consent
            </Link>{' '}
            to opt in and be discovered.
          </p>
        </div>
      )}

      {/* ── Section grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-rc-border p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(s => (
            <SectionCard key={s.section} completion={s} />
          ))}
        </div>
      )}

      {/* ── How employers see you ─────────────────────────────────────────────── */}
      <div className="mt-10 p-5 rounded-2xl bg-white border border-rc-border">
        <h2 className="font-heading font-semibold text-rc-dark mb-3">What employers can see</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-rc-grey">
          <div className="flex items-start gap-2">
            <span className="text-rc-green mt-0.5">✓</span>
            <span>Your skills, qualifications, and experience level</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rc-green mt-0.5">✓</span>
            <span>Tech areas of interest and preferred employer types</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rc-green mt-0.5">✓</span>
            <span>Availability and work arrangement preferences</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rc-green mt-0.5">✓</span>
            <span>Personal statement and career aspirations</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✗</span>
            <span>Your name and contact details (unless you choose to share)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✗</span>
            <span>Your specific salary expectation</span>
          </div>
        </div>
        <p className="text-xs text-rc-grey-light mt-4">
          Control exactly who can see your profile in{' '}
          <Link href="/profile/9" className="text-rc-green hover:underline font-medium">
            Section 9 — Visibility &amp; Consent
          </Link>.
        </p>
      </div>

    </AppLayout>
  )
}
