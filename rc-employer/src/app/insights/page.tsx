'use client'
import { useEffect, useState } from 'react'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'
import { getTalentPoolStats, getShortlist, getProfileStats } from '@/lib/api/employerApi'
import { EmployerLayout } from '@/components/layout/EmployerLayout'
import { TalentKPICard } from '@/components/dashboard/TalentKPICard'
import { SMCoverageChart } from '@/components/dashboard/SMCoverageChart'
import { ShortlistSummary } from '@/components/dashboard/ShortlistSummary'
import { ProfileBreakdownCard } from '@/components/dashboard/ProfileBreakdownCard'
import type { TalentPoolStats, ShortlistedCandidate, ProfileStats } from '@/lib/data/types'

const EMPTY_STATS: TalentPoolStats = {
  totalAvailable: 0, newThisMonth: 0, moduleComplete: 0, partComplete: 0, avgCOLPercent: null, smCoverage: [],
}

// Section groupings for the "Candidate Profile Insights" area below the
// curriculum-progress charts -- one card per breakdown, organised under the
// same 8 sections learners fill in on their rc-v2-app profile, so an
// employer can jump straight to "sector specialism" or "qualifications"
// without hunting through a flat wall of charts.
const PROFILE_SECTIONS: { heading: string; blurb: string }[] = [
  { heading: 'Right to Work & Location', blurb: 'Where the talent pool is based and able to work' },
  { heading: 'Interests', blurb: 'Technology areas and role types candidates are targeting' },
  { heading: 'Experience & Availability', blurb: 'Seniority, employment status and notice periods' },
  { heading: 'Qualifications', blurb: 'Highest qualification and professional body membership' },
  { heading: 'Technical Skills', blurb: 'Engineering, regulatory and grid-knowledge tooling' },
  { heading: 'Sector Specialism', blurb: 'Deep experience by technology sub-sector' },
  { heading: 'Professional Track Record', blurb: 'Leadership, client-facing and delivery experience' },
  { heading: 'Career Aspirations', blurb: "What's motivating the talent pool's next move" },
]

export default function InsightsPage() {
  // Sign-in gating now happens once, centrally, in EmployerLayout (via EmployerAccessGate).
  const { isAuthenticated, employer } = useEmployerAuth()
  const [stats, setStats] = useState<TalentPoolStats>(EMPTY_STATS)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [shortlist, setShortlist] = useState<ShortlistedCandidate[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    setFetching(true)
    Promise.all([
      getTalentPoolStats(employer.id),
      getShortlist(employer.id),
      getProfileStats(employer.id),
    ]).then(([s, sl, ps]) => { setStats(s); setShortlist(sl); setProfileStats(ps) })
      .finally(() => setFetching(false))
  }, [isAuthenticated, employer])



  // Per-part rollup of the SM coverage data, for a quick "which part is the
  // talent pool strongest in" read alongside the detailed chart.
  const byPart = ([1, 2, 3] as const).map(part => {
    const rows = stats.smCoverage.filter(sm => sm.partNumber === part)
    const totalCompletions = rows.reduce((sum, sm) => sum + sm.candidatesCompleted, 0)
    const scored = rows.map(sm => sm.avgCOLPercent).filter((p): p is number => p != null)
    const avgCOL = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null
    return { part, totalCompletions, avgCOL }
  })

  const total = profileStats?.totalAvailable ?? 0

  return (
    <EmployerLayout
      title="Insights"
      subtitle={`${employer?.name ?? 'Your organisation'} · Talent pool analytics`}
    >
      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-emp-accent border-t-transparent rounded-full animate-spin" />
          Refreshing data...
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <TalentKPICard
          label="Available Candidates"
          value={stats.totalAvailable}
          sub="Opted in to employer discovery"
          icon="◉"
          accent="blue"
        />
        <TalentKPICard
          label="Part Complete"
          value={stats.partComplete}
          sub="Finished at least one full part"
          icon="◒"
          accent="green"
        />
        <TalentKPICard
          label="Module Complete"
          value={stats.moduleComplete}
          sub="All 15 sub-modules finished"
          icon="◎"
          accent="amber"
        />
        <TalentKPICard
          label="Avg COL Score"
          value={stats.avgCOLPercent != null ? `${Math.round(stats.avgCOLPercent)}%` : '—'}
          sub="Confirmation of Learning · talent pool"
          icon="▦"
          accent={stats.avgCOLPercent == null ? 'default' : stats.avgCOLPercent >= 80 ? 'green' : stats.avgCOLPercent >= 60 ? 'amber' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <SMCoverageChart smCoverage={stats.smCoverage} />
        </div>
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-emp-navy text-sm mb-4">Coverage by Part</h3>
          <div className="space-y-3">
            {byPart.map(({ part, totalCompletions, avgCOL }) => (
              <div key={part} className="flex items-center justify-between py-2 border-b border-emp-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-emp-navy">Part {part}</p>
                  <p className="text-xs text-slate-500">{totalCompletions} sub-module completion{totalCompletions === 1 ? '' : 's'}</p>
                </div>
                <p className="text-sm font-semibold text-emp-navy">{avgCOL != null ? `${Math.round(avgCOL)}%` : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ShortlistSummary shortlisted={shortlist} />

      {/* ── Candidate Profile Insights ──────────────────────────────────── */}
      <div className="mt-8 mb-5">
        <h2 className="font-heading font-bold text-emp-navy text-lg">Candidate Profile Insights</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {profileStats
            ? `${profileStats.profilesCompleted} of ${profileStats.totalAvailable} available candidates have completed their profile`
            : 'Breakdowns across everything candidates fill in on their profile — right to work, experience, qualifications, sector specialism and more.'}
        </p>
      </div>

      {profileStats && (
        <div className="space-y-8">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[0].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Right to work (UK)" tally={profileStats.rightToWork.rightToWorkUK} total={total} accent="blue" />
              <ProfileBreakdownCard title="Willing to relocate" tally={profileStats.rightToWork.willingToRelocate} total={total} accent="blue" />
              <ProfileBreakdownCard title="UK region" tally={profileStats.rightToWork.ukRegion} total={total} accent="blue" maxRows={8} />
              <ProfileBreakdownCard title="Open to international roles" tally={profileStats.rightToWork.openToInternational} total={total} accent="blue" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[1].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Primary technology area" tally={profileStats.interests.primaryTechArea} total={total} accent="green" />
              <ProfileBreakdownCard title="Target role types" tally={profileStats.interests.targetRoleTypes} total={total} accent="green" />
              <ProfileBreakdownCard title="Preferred employer types" tally={profileStats.interests.preferredEmployerTypes} total={total} accent="green" />
              <ProfileBreakdownCard title="Climate policy interests" tally={profileStats.interests.climatePolicyInterests} total={total} accent="green" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[2].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Experience level" tally={profileStats.experience.experienceLevel} total={total} accent="amber" />
              <ProfileBreakdownCard title="Employment status" tally={profileStats.experience.employmentStatus} total={total} accent="amber" />
              <ProfileBreakdownCard title="Availability" tally={profileStats.experience.availability} total={total} accent="amber" />
              <ProfileBreakdownCard title="Years in renewables" tally={profileStats.experience.yearsInRenewables} total={total} accent="amber" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[3].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Highest qualification" tally={profileStats.qualifications.highestQualification} total={total} accent="purple" />
              <ProfileBreakdownCard title="Professional bodies" tally={profileStats.qualifications.professionalBodies} total={total} accent="purple" />
              <ProfileBreakdownCard title="Chartered status" tally={profileStats.qualifications.charteredStatus} total={total} accent="purple" />
              <ProfileBreakdownCard title="Safety certifications" tally={profileStats.qualifications.safetyCertifications} total={total} accent="purple" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[4].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ProfileBreakdownCard title="Engineering tools" tally={profileStats.technicalSkills.engineeringTools} total={total} accent="blue" maxRows={8} />
              <ProfileBreakdownCard title="Regulatory knowledge" tally={profileStats.technicalSkills.regulatoryKnowledge} total={total} accent="blue" maxRows={8} />
              <ProfileBreakdownCard title="Grid knowledge" tally={profileStats.technicalSkills.gridKnowledge} total={total} accent="blue" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[5].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ProfileBreakdownCard title="Offshore experience" tally={profileStats.sectorSpecialism.offshoreExpTypes} total={total} accent="green" />
              <ProfileBreakdownCard title="Turbine OEM experience" tally={profileStats.sectorSpecialism.turbineOEMExp} total={total} accent="green" />
              <ProfileBreakdownCard title="Battery chemistry" tally={profileStats.sectorSpecialism.batteryChemistry} total={total} accent="green" />
              <ProfileBreakdownCard title="Solar scale experience" tally={profileStats.sectorSpecialism.solarScaleExp} total={total} accent="green" />
              <ProfileBreakdownCard title="Marine energy" tally={profileStats.sectorSpecialism.marineEnergyTypes} total={total} accent="green" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[6].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Client management level" tally={profileStats.trackRecord.clientManagementLevel} total={total} accent="amber" />
              <ProfileBreakdownCard title="Team leadership level" tally={profileStats.trackRecord.teamLeadershipLevel} total={total} accent="amber" />
              <ProfileBreakdownCard title="Technical report writer" tally={profileStats.trackRecord.technicalReportWriter} total={total} accent="amber" />
              <ProfileBreakdownCard title="Bid management experience" tally={profileStats.trackRecord.bidManagement} total={total} accent="amber" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{PROFILE_SECTIONS[7].heading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <ProfileBreakdownCard title="Career motivations" tally={profileStats.careerAspirations.careerMotivations} total={total} accent="purple" maxRows={8} />
            </div>
          </section>
        </div>
      )}
    </EmployerLayout>
  )
}
