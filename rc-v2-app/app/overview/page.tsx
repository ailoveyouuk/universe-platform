'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Programme Overview Page
//
// Route: /overview
//
// Covers:
//   1. Welcome — what the course is and who it's for
//   2. The Complete Programme — all 10 elective modules
//   3. Module 1 Structure — all 15 sub-modules grouped by part
//   4. How It's Delivered — study format and hours
//
// Content sourced from the introductory pages of the SM1 PDF.
// ─────────────────────────────────────────────────────────────────────────────

import Link  from 'next/link'
import { clsx } from 'clsx'
import { AppLayout } from '@/components/layout/AppLayout'
import { PARTS }     from '@/lib/curriculum'

// ── All 10 elective modules ───────────────────────────────────────────────────

const ELECTIVE_MODULES = [
  {
    number:      1,
    title:       'An Introduction to the World of Renewable Energy',
    topics:      'GHG emissions · Net zero · Energy transition · Offshore & onshore wind · Nuclear · Solar · Hydrogen & more',
    current:     true,
    href:        '/dashboard',
  },
  {
    number:      2,
    title:       'Net Zero & the Energy Transition',
    topics:      'Decarbonisation strategy · Carbon markets · Policy frameworks · Transition pathways',
    current:     false,
  },
  {
    number:      3,
    title:       'The Economics of Renewable Energy',
    topics:      'LCOE · Investment structures · Market design · Project finance',
    current:     false,
  },
  {
    number:      4,
    title:       'Energy Policy & Energy Security',
    topics:      'Government strategy · Geopolitics of energy · Regulatory frameworks · Energy independence',
    current:     false,
  },
  {
    number:      5,
    title:       'Wind Energy — Onshore & Offshore',
    topics:      'Fixed & floating offshore wind · Onshore wind · Turbine technology · Market growth',
    current:     false,
  },
  {
    number:      6,
    title:       'Onshore Renewables',
    topics:      'Solar PV · Biomass · Hydropower · Geothermal energy',
    current:     false,
  },
  {
    number:      7,
    title:       'Marine Renewables & Carbon Storage',
    topics:      'Wave & tidal · Lagoon energy · Carbon capture & storage · CCUS',
    current:     false,
  },
  {
    number:      8,
    title:       'Nuclear Energy',
    topics:      'Fission & fusion · Reactor types · SMRs · Nuclear policy & safety',
    current:     false,
  },
  {
    number:      9,
    title:       'Power Networks & Energy Storage',
    topics:      'Grid architecture · Battery storage · Gravity storage · Smart grids',
    current:     false,
  },
  {
    number:      10,
    title:       'Preparing for a Renewable Future',
    topics:      'Post-climate change scenarios · Emerging technologies · AI & energy · The road ahead',
    current:     false,
  },
]

// ── Delivery format facts ─────────────────────────────────────────────────────

const DELIVERY_FACTS = [
  {
    icon:  '📖',
    stat:  '15',
    unit:  'Sub-Modules',
    detail: 'per elective module, each covering a distinct topic',
  },
  {
    icon:  '💻',
    stat:  '2h',
    unit:  'Study Daily',
    detail: 'structured computer-based learning per sub-module',
  },
  {
    icon:  '🔬',
    stat:  '2h',
    unit:  'Research Daily',
    detail: 'self-led follow-up reading and deeper exploration',
  },
  {
    icon:  '📅',
    stat:  '15',
    unit:  'Days / Module',
    detail: '3 working weeks · 30h study + 30h research = 60h total',
  },
]

// ── Part accent config ────────────────────────────────────────────────────────

const PART_CFG: Record<number, {
  badge:  string
  text:   string
  bar:    string
  numBg:  string
}> = {
  1: { badge: 'bg-rc-green-50 text-rc-green',   text: 'text-rc-green',   bar: 'bg-rc-green',   numBg: 'bg-rc-green' },
  2: { badge: 'bg-blue-50 text-blue-600',        text: 'text-blue-600',   bar: 'bg-blue-500',   numBg: 'bg-blue-500' },
  3: { badge: 'bg-purple-50 text-purple-600',    text: 'text-purple-600', bar: 'bg-purple-500', numBg: 'bg-purple-500' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const allSMs = PARTS.flatMap(p => p.subModules)

  return (
    <AppLayout breadcrumbs={[{ label: 'Programme Overview' }]}>

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-10"
        style={{ background: 'linear-gradient(135deg, #111827 0%, #1a2a1a 100%)' }}
      >
        {/* Green accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #82BC00, #5a8400)' }} />

        <div className="px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-white/40 uppercase tracking-widest text-xs mb-3">
            Renewables Connect · Module 1
          </p>
          <h1 className="font-heading font-bold text-white text-2xl sm:text-3xl lg:text-4xl leading-tight mb-4 max-w-2xl">
            An Introduction to the World of Renewables &amp; Clean Energy
          </h1>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
            This module opens your journey into renewable energy — from the science of greenhouse
            gases to the cutting edge of floating offshore wind. Across 15 sub-modules and 30 hours
            of guided study, you will build a comprehensive foundation in every major clean energy
            technology and the global forces driving the transition.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-5 sm:gap-8">
            {[
              { value: '15',   label: 'Sub-Modules' },
              { value: '30h',  label: 'Study Time' },
              { value: '30h',  label: 'Research Time' },
              { value: '3',    label: 'Parts' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center sm:text-left">
                <div className="font-heading font-bold text-rc-green text-2xl leading-none">{value}</div>
                <div className="text-white/40 text-xs mt-0.5 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. FULL COURSE STRUCTURE ─────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="font-heading font-bold text-rc-dark text-xl mb-1">The Complete Programme</h2>
          <p className="text-rc-grey text-sm">
            Renewables Connect comprises 10 elective modules. You are currently studying Module 1.
            Future modules will unlock as the programme expands.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {ELECTIVE_MODULES.map(mod => (
            <div
              key={mod.number}
              className={clsx(
                'relative bg-white rounded-2xl border p-5 flex flex-col gap-3',
                mod.current
                  ? 'border-rc-green/40 shadow-green'
                  : 'border-rc-border opacity-70',
              )}
            >
              {/* Current badge */}
              {mod.current && (
                <span className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rc-green text-white">
                  Current
                </span>
              )}

              {/* Module number */}
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-sm flex-shrink-0',
                mod.current ? 'bg-rc-green text-white' : 'bg-rc-bg-main text-rc-grey',
              )}>
                {mod.number}
              </div>

              {/* Title */}
              <h3 className={clsx(
                'font-heading font-semibold text-sm leading-snug',
                mod.current ? 'text-rc-dark' : 'text-rc-grey',
              )}>
                {mod.title}
              </h3>

              {/* Topics */}
              <p className="text-xs text-rc-grey-light leading-relaxed flex-1">
                {mod.topics}
              </p>

              {/* CTA or Coming Soon */}
              {mod.current && mod.href ? (
                <Link
                  href={mod.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rc-green hover:text-rc-green-600 transition-colors"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <span className="text-xs text-rc-grey-light font-medium">Coming soon</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. MODULE 1 STRUCTURE ────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="font-heading font-bold text-rc-dark text-xl mb-1">Module 1 — What You'll Learn</h2>
          <p className="text-rc-grey text-sm">
            All 15 sub-modules grouped by part. Click any available sub-module to jump straight in.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {PARTS.map(part => {
            const cfg = PART_CFG[part.number] ?? PART_CFG[1]
            return (
              <div key={part.number}>

                {/* Part header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">{part.icon}</span>
                  <div>
                    <span className={clsx('rc-tag text-xs font-semibold mb-0.5 inline-block', cfg.badge)}>
                      {part.title} · {part.subtitle}
                    </span>
                    <p className="text-xs text-rc-grey-light">{part.description}</p>
                  </div>
                </div>

                {/* Sub-module cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {part.subModules.map(sm => {
                    const card = (
                      <div className={clsx(
                        'bg-white rounded-xl border border-rc-border p-4 flex flex-col gap-2.5 h-full',
                        sm.available && 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
                        !sm.available && 'opacity-55',
                      )}>
                        {/* Number badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center font-heading font-bold text-white flex-shrink-0',
                            cfg.numBg,
                          )} style={{ fontSize: 12 }}>
                            {sm.id}
                          </span>
                          <span className="text-rc-grey-light" style={{ fontSize: 11 }}>
                            {sm.estimatedHours}h · {sm.sectionCount} sections
                          </span>
                        </div>

                        {/* Title */}
                        <p className="font-heading font-semibold text-rc-dark leading-snug line-clamp-2" style={{ fontSize: 13 }}>
                          {sm.title}
                        </p>

                        {/* Description */}
                        <p className="text-rc-grey leading-relaxed line-clamp-3" style={{ fontSize: 12 }}>
                          {sm.shortDescription}
                        </p>

                        {/* Key topics */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-1">
                          {sm.keyTopics.slice(0, 3).map(t => (
                            <span
                              key={t}
                              className="text-xs px-1.5 py-0.5 rounded bg-rc-bg-main text-rc-grey border border-rc-border"
                              style={{ fontSize: 10 }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Part accent bar */}
                        <div className={clsx('h-0.5 rounded-full -mx-4 -mb-4', cfg.bar)} />
                      </div>
                    )

                    return sm.available ? (
                      <Link key={sm.id} href={`/learn/module-1/${sm.slug}`} className="flex flex-col">
                        {card}
                      </Link>
                    ) : (
                      <div key={sm.id} className="flex flex-col">
                        {card}
                      </div>
                    )
                  })}
                </div>

              </div>
            )
          })}
        </div>
      </section>

      {/* ── 4. HOW IT'S DELIVERED ────────────────────────────────────────────── */}
      <section className="mb-4">
        <div className="mb-6">
          <h2 className="font-heading font-bold text-rc-dark text-xl mb-1">How It's Delivered</h2>
          <p className="text-rc-grey text-sm">
            Each elective module is structured as a 15-day, self-paced programme — one sub-module per day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {DELIVERY_FACTS.map(({ icon, stat, unit, detail }) => (
            <div
              key={unit}
              className="bg-white rounded-2xl border border-rc-border p-6 flex flex-col gap-2 shadow-card"
            >
              <span className="text-2xl">{icon}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading font-bold text-rc-green text-3xl leading-none">{stat}</span>
                <span className="font-heading font-semibold text-rc-dark text-base">{unit}</span>
              </div>
              <p className="text-rc-grey text-xs leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>

        {/* Summary callout */}
        <div className="bg-rc-green-50 border border-rc-green/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rc-green flex items-center justify-center flex-shrink-0 text-white text-lg">
            🎓
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-rc-dark text-sm mb-1">
              60 hours of study per elective module
            </p>
            <p className="text-rc-grey text-sm leading-relaxed">
              Each module combines 30 hours of structured computer-based learning with 30 hours of
              guided research and self-led exploration — giving you both the core knowledge and the
              depth to apply it in the real world.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm bg-rc-green text-white hover:bg-rc-green-600 transition-colors"
          >
            Start Module 1 →
          </Link>
        </div>
      </section>

    </AppLayout>
  )
}
