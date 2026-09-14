'use client'

// ─────────────────────────────────────────────────────────────────────────────
// DashboardHero — radial progress arc, welcome text, resume CTA, live stats
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { clsx } from 'clsx'

// ── Radial arc ────────────────────────────────────────────────────────────────

function RadialProgress({ pct }: { pct: number }) {
  const R   = 52
  const C   = 2 * Math.PI * R        // ~326.7
  const arc = (pct / 100) * C

  return (
    <div className="relative flex items-center justify-center" style={{ width: 144, height: 144 }}>
      <svg width="144" height="144" viewBox="0 0 144 144" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx="72" cy="72" r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="72" cy="72" r={R}
          fill="none"
          stroke="#82BC00"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`}
          strokeDashoffset="0"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold text-white leading-none" style={{ fontSize: 32 }}>
          {pct}<span style={{ fontSize: 16 }}>%</span>
        </span>
        <span className="text-white/50 mt-1" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
          COMPLETE
        </span>
      </div>
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center sm:items-start gap-0.5">
      <span className={clsx(
        'font-heading font-bold leading-none',
        accent ? 'text-rc-green' : 'text-white',
      )} style={{ fontSize: 26 }}>
        {value}
      </span>
      <span className="text-white/40 uppercase tracking-wider" style={{ fontSize: 10 }}>
        {label}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardHeroProps {
  overallPct:       number
  completedSMs:     number
  totalSMs:         number
  avgQuizScore:     number | null
  quizzesPassed:    number
  resumeHref:       string | null
  isStarted:        boolean
  forename?:        string | null
  isNewUser?:       boolean
  resumeContext?: {
    partNumber:    number
    partTitle:     string
    subModuleTitle: string
    sectionTitle:   string | null
    sectionIndex:   number | null
    sectionTotal:   number
  } | null
}

export function DashboardHero({
  overallPct,
  completedSMs,
  totalSMs,
  avgQuizScore,
  quizzesPassed,
  resumeHref,
  isStarted,
  forename,
  isNewUser,
  resumeContext,
}: DashboardHeroProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2a1a 100%)' }}
    >
      {/* Green accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #82BC00, #5a8400)' }} />

      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-stretch gap-6 sm:gap-10">

        {/* Radial arc */}
        <div className="flex-shrink-0">
          <RadialProgress pct={overallPct} />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-white/10 self-stretch" />

        {/* Text + CTA */}
        <div className="flex-1 flex flex-col justify-center gap-3 text-center sm:text-left">
          <div>
            <p className="text-white/40 uppercase tracking-widest mb-1" style={{ fontSize: 11 }}>
              Module 1 — An Introduction to Renewables &amp; Clean Energy
            </p>
            {forename && (
              <p className="text-white/70 font-heading font-semibold mb-0.5" style={{ fontSize: 14 }}>
                {isNewUser ? `Hello ${forename}, welcome to Renewables Connect.` : `Welcome back, ${forename}.`}
              </p>
            )}
            <h1 className="font-heading font-bold text-white leading-tight" style={{ fontSize: 22 }}>
              {isStarted
                ? overallPct >= 100
                  ? 'Course Complete — Well Done! 🎉'
                  : 'Keep going — you\'re making great progress'
                : 'Ready to begin your journey?'}
            </h1>
            <p className="text-white/50 mt-1.5 text-sm leading-relaxed">
              {completedSMs} of {totalSMs} sub-modules complete
              {quizzesPassed > 0 && ` · ${quizzesPassed} assessment${quizzesPassed !== 1 ? 's' : ''} passed`}
            </p>
          </div>

          {resumeHref && (
            <div>
              {resumeContext && (
                <div className="mb-2.5 rounded-lg bg-white/5 border border-white/10 px-3 py-2 inline-block max-w-full">
                  <div
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-white/45 uppercase tracking-wide"
                    style={{ fontSize: 10 }}
                  >
                    <span>Module 1</span>
                    <span className="text-white/25">›</span>
                    <span>Part {resumeContext.partNumber}</span>
                    <span className="text-white/25">›</span>
                    <span className="text-white/80 normal-case font-semibold">{resumeContext.subModuleTitle}</span>
                  </div>
                  {resumeContext.sectionTitle && resumeContext.sectionIndex && (
                    <div className="flex items-center gap-1.5 text-rc-green mt-1" style={{ fontSize: 12 }}>
                      <span aria-hidden>📍</span>
                      <span className="font-medium">
                        Section {resumeContext.sectionIndex} of {resumeContext.sectionTotal} — {resumeContext.sectionTitle}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <Link
                href={resumeHref}
                className={clsx(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm',
                  'bg-rc-green text-white hover:bg-rc-green-600 transition-colors duration-200',
                )}
              >
                {isStarted && overallPct < 100 ? 'Continue Learning' : 'Start Learning'}
                <span>→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-white/10 self-stretch" />

        {/* Stats */}
        <div className="flex sm:flex-col justify-center gap-6 sm:gap-5 flex-shrink-0">
          <StatChip
            value={`${completedSMs}/${totalSMs}`}
            label="Sub-modules"
            accent={completedSMs > 0}
          />
          <StatChip
            value={avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
            label="Avg Quiz Score"
            accent={(avgQuizScore ?? 0) >= 70}
          />
          <StatChip
            value={String(quizzesPassed)}
            label="Assessments Passed"
            accent={quizzesPassed > 0}
          />
        </div>
      </div>
    </div>
  )
}
