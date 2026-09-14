'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getOrganisations } from '@/lib/api/organisationsApi'
import type { OrganisationListItem } from '@rc/types'

const TIER_LABELS: Record<string, string> = {
  STANDARD:         'Partner',
  PARTNER:          'Partner',
  GOLD_PARTNER:     'Gold Partner',
  PLATINUM_PARTNER: 'Platinum Partner',
}

const TIER_ORDER: Record<string, number> = {
  PLATINUM_PARTNER: 0,
  GOLD_PARTNER:     1,
  PARTNER:          2,
  STANDARD:         3,
}

const SECTORS = [
  'EV Charging', 'Solar Power', 'Wind Energy', 'Home Battery Storage',
  'Home Energy Management', 'Offshore Wind', 'Green Hydrogen',
  'Smart Home Technology', 'Renewable Energy Products',
]

export default function PartnersPage() {
  const [orgs, setOrgs] = useState<OrganisationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EMPLOYER' | 'INSTITUTION'>('ALL')
  const [sectorFilter, setSectorFilter] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getOrganisations({
      type:   typeFilter === 'ALL' ? undefined : typeFilter,
      sector: sectorFilter || undefined,
    })
    setOrgs(result.orgs)
    setLoading(false)
  }, [typeFilter, sectorFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen" style={{ background: '#111827' }}>
      {/* Top nav */}
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#82BC00' }}>
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>RC</span>
            </div>
            <span className="font-bold text-white text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Renewables Connect
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            ← Back to platform
          </Link>
        </div>
      </header>

      {/* Hero banner */}
      <div className="py-16 px-6" style={{ background: 'linear-gradient(180deg, #0f1623 0%, #111827 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(130,188,0,0.15)', color: '#82BC00', border: '1px solid rgba(130,188,0,0.3)' }}>
            🏢 Company Profiles
          </div>
          <h1 className="font-bold text-4xl md:text-5xl text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Company Profiles
          </h1>
          <p className="text-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Browse employers and institutions partnered with Renewables Connect — explore who they are, what they do, and the opportunities they&apos;re hiring for.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Type filter */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {(['ALL', 'EMPLOYER', 'INSTITUTION'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
                style={typeFilter === t
                  ? { background: '#82BC00', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.5)', background: 'transparent' }
                }
              >
                {t === 'ALL' ? 'All' : t === 'EMPLOYER' ? 'Employers' : 'Institutions'}
              </button>
            ))}
          </div>

          {/* Sector filter */}
          <select
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="text-xs font-medium rounded-lg px-3 py-2 outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color:      sectorFilter ? '#fff' : 'rgba(255,255,255,0.4)',
              border:     '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <option value="">All sectors</option>
            {SECTORS.map(s => (
              <option key={s} value={s} style={{ background: '#1f2937' }}>{s}</option>
            ))}
          </select>

          {sectorFilter && (
            <button
              onClick={() => setSectorFilter('')}
              className="text-xs transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Clear ×
            </button>
          )}

          <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {loading ? 'Loading…' : `${orgs.length} organisation${orgs.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: 'rgba(255,255,255,0.05)', height: 200 }} />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-white font-semibold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>No partners found</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...orgs].sort((a, b) => (TIER_ORDER[a.partnershipTier] ?? 9) - (TIER_ORDER[b.partnershipTier] ?? 9)).map(org => (
              <PartnerCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <div className="border-t mt-16" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-14 text-center">
          <p className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Interested in partnering with Renewables Connect?
          </p>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Connect your organisation with the next generation of clean energy talent.
          </p>
          <Link
            href="mailto:registrations@renewablesconnect.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
            style={{ background: '#82BC00', color: '#fff' }}
          >
            Get in touch →
          </Link>
        </div>
      </div>
    </div>
  )
}

function PartnerCard({ org }: { org: OrganisationListItem }) {
  const accent    = org.brandColour ?? '#82BC00'
  const tierLabel = TIER_LABELS[org.partnershipTier] ?? 'Partner'
  const isPremium = org.partnershipTier === 'PLATINUM_PARTNER' || org.partnershipTier === 'GOLD_PARTNER'

  return (
    <Link href={`/partners/profile?slug=${org.slug}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 group-hover:-translate-y-1"
        style={{
          background:  'rgba(255,255,255,0.05)',
          border:      '1px solid rgba(255,255,255,0.08)',
          boxShadow:   'group-hover:0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Accent bar */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: accent }} />

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1">
          {/* Logo + tier badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {isPremium && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
                {tierLabel}
              </span>
            )}
          </div>

          {/* Name + location */}
          <p className="font-bold text-white text-sm mb-0.5 group-hover:text-white/90 transition-colors"
            style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {org.name}
          </p>

          {(org.city || org.country) && (
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {[org.city, org.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Tagline */}
          {org.tagline && (
            <p className="text-xs leading-relaxed mb-4 flex-1"
              style={{ color: 'rgba(255,255,255,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {org.tagline}
            </p>
          )}

          {/* Sector tags */}
          {org.sectors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {org.sectors.slice(0, 3).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                  {s}
                </span>
              ))}
              {org.sectors.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  +{org.sectors.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
