'use client'

import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams }      from 'next/navigation'
import Link                     from 'next/link'
import { getOrganisationBySlug } from '@/lib/api/organisationsApi'
import type { Organisation, OrgSocialLinks, Opportunity } from '@rc/types'

const TIER_LABELS: Record<string, { label: string; icon: string }> = {
  STANDARD:         { label: 'Partner',          icon: '◆' },
  PARTNER:          { label: 'Partner',           icon: '◆' },
  GOLD_PARTNER:     { label: 'Gold Partner',      icon: '★' },
  PLATINUM_PARTNER: { label: 'Platinum Partner',  icon: '✦' },
}

function PartnerProfileContent() {
  const searchParams            = useSearchParams()
  const slug                    = searchParams.get('slug') ?? ''
  const [org, setOrg]           = useState<Organisation | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return }
    getOrganisationBySlug(slug).then(data => {
      if (!data) setNotFound(true)
      else setOrg(data)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <LoadingScreen />
  if (notFound || !org) return <NotFoundScreen />

  const brand   = org.brandColour ?? '#82BC00'
  const tier    = TIER_LABELS[org.partnershipTier] ?? TIER_LABELS['STANDARD']
  const socials = (org.socialLinks ?? {}) as OrgSocialLinks
  const activeOpps = org.opportunities.filter((o: Opportunity) => o.isActive)

  return (
    <div style={{ background: '#111827', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .partner-overview-grid { display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: start; }
        .partner-overview-details { min-width: 240px; position: sticky; top: 80px; }
        @media (max-width: 768px) {
          .partner-overview-grid { grid-template-columns: 1fr; gap: 24px; }
          .partner-overview-details { position: static; min-width: 0; width: 100%; }
        }
      `}</style>

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/partners" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#82BC00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: 'Montserrat, sans-serif' }}>RC</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>← Company Profiles</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>{tier.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: brand }}>{tier.label}</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
      <section style={{ position: 'relative', height: '60vh', minHeight: 400, overflow: 'hidden' }}>
        {/* Background image */}
        {org.heroImageUrl ? (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:    `url(${org.heroImageUrl})`,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #1a2535 0%, #0f1623 100%)` }} />
        )}

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(17,24,39,0.3) 0%, rgba(17,24,39,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(17,24,39,0.5) 0%, transparent 60%)' }} />

        {/* Brand colour left border */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: brand }} />

        {/* Tier badge top-right */}
        <div style={{ position: 'absolute', top: 28, right: 32 }}>
          <span style={{
            display:      'inline-flex', alignItems: 'center', gap: 6,
            padding:      '6px 14px', borderRadius: 999,
            background:   `${brand}22`, border: `1px solid ${brand}55`,
            color:        brand, fontWeight: 700, fontSize: 12,
            fontFamily:   'Montserrat, sans-serif',
          }}>
            {tier.icon} {tier.label}
          </span>
        </div>

        {/* Content positioned at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 60px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <p style={{ color: brand, fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              {org.type === 'EMPLOYER' ? 'Employer Partner' : 'Institution Partner'}
            </p>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, marginBottom: 14, color: '#fff' }}>
              {org.name}
            </h1>
            {org.tagline && (
              <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.75)', maxWidth: 640, lineHeight: 1.5 }}>
                {org.tagline}
              </p>
            )}
          </div>
        </div>

      </section>

        {/* Logo pill — overlaps into the stats bar below. Deliberately moved
            OUTSIDE the hero <section>: that section needs overflow:hidden to
            crop its own background/gradient layers to the 60vh box, but that
            same overflow:hidden was clipping the bottom half of this pill,
            which is positioned to hang past the hero's bottom edge on
            purpose. Sitting in this unclipped wrapper instead, it can bleed
            into the stats bar's paddingTop (below) without being cut off. */}
        {org.logoUrl && (
          <div style={{
            position:   'absolute', bottom: -28, left: 40,
            background: '#fff', borderRadius: 16,
            padding:    '10px 20px',
            boxShadow:  '0 8px 32px rgba(0,0,0,0.4)',
            display:    'flex', alignItems: 'center',
            zIndex:     10,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.logoUrl} alt={org.name} style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
          </div>
        )}
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingTop: org.logoUrl ? 52 : 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1 }}>
            {org.city && (
              <StatItem icon="📍" label="Location" value={[org.city, org.country].filter(Boolean).join(', ')} brand={brand} />
            )}
            {org.yearFounded && (
              <StatItem icon="🏢" label="Founded" value={String(org.yearFounded)} brand={brand} />
            )}
            {org.employeeCount && (
              <StatItem icon="👥" label="Team size" value={`${org.employeeCount} employees`} brand={brand} />
            )}
            {org.sectors.length > 0 && (
              <StatItem icon="⚡" label="Sector focus" value={`${org.sectors.length} specialisation${org.sectors.length !== 1 ? 's' : ''}`} brand={brand} />
            )}
          </div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 40px' }}>

        {/* Overview + Key details */}
        {(org.overview || org.website || Object.values(socials).some(Boolean)) && (
          <section className="partner-overview-grid" style={{ marginBottom: 64 }}>
            {/* Overview text */}
            {org.overview && (
              <div>
                <SectionHeading label="About" brand={brand} />
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.85 }}>
                  {org.overview.split('\n\n').map((para, i) => (
                    <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Key details card */}
            <div className="partner-overview-details" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
              padding: 24,
            }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>
                Quick facts
              </p>

              {org.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: brand, textDecoration: 'none', marginBottom: 12, wordBreak: 'break-all' }}>
                  🔗 {org.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {Object.values(socials).some(Boolean) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {socials.linkedin  && <SocialLink href={socials.linkedin}  icon={<LinkedInGlyph />}  label="LinkedIn"  brand={brand} />}
                  {socials.twitter   && <SocialLink href={socials.twitter}   icon={<XGlyph />}         label="X/Twitter" brand={brand} />}
                  {socials.instagram && <SocialLink href={socials.instagram} icon={<InstagramGlyph />} label="Instagram" brand={brand} />}
                  {socials.facebook  && <SocialLink href={socials.facebook}  icon={<FacebookGlyph />}  label="Facebook"  brand={brand} />}
                  {socials.youtube   && <SocialLink href={socials.youtube}   icon={<YouTubeGlyph />}   label="YouTube"   brand={brand} />}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sectors */}
        {org.sectors.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeading label="Areas of Expertise" brand={brand} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {org.sectors.map(s => (
                <span key={s} style={{
                  padding:      '8px 18px', borderRadius: 999,
                  background:   brand, color: '#fff',
                  fontWeight:   600, fontSize: 13,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {org.galleryImages.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeading label="Gallery" brand={brand} />
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {org.galleryImages.map((url, i) => (
                <div key={i} style={{
                  borderRadius: 16, overflow: 'hidden',
                  aspectRatio:  i === 0 ? '16/9' : '4/3',
                  gridColumn:   i === 0 ? 'span 2' : undefined,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${org.name} gallery ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Video */}
        {org.videoUrl && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeading label="Watch" brand={brand} />
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 20, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={org.videoUrl}
                title={`${org.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </section>
        )}

        {/* Testimonial */}
        {org.testimonial && (
          <section style={{ marginBottom: 64 }}>
            <div style={{
              position:     'relative',
              background:   `linear-gradient(135deg, ${brand}0d 0%, rgba(255,255,255,0.03) 100%)`,
              border:       `1px solid ${brand}33`,
              borderRadius: 24, padding: '40px 48px',
            }}>
              <span style={{ position: 'absolute', top: 20, left: 32, fontSize: 80, lineHeight: 1, color: brand, opacity: 0.3, fontFamily: 'Georgia, serif' }}>"</span>
              <blockquote style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 24 }}>
                  {org.testimonial.quote}
                </p>
                <footer style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {org.testimonial.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.testimonial.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand}` }} />
                  )}
                  <div>
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: 14, fontFamily: 'Montserrat, sans-serif' }}>
                      {org.testimonial.authorName}
                    </p>
                    <p style={{ color: brand, fontSize: 12, marginTop: 2 }}>
                      {org.testimonial.authorRole}
                    </p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </section>
        )}

        {/* Opportunities */}
        {activeOpps.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeading label={`Work with ${org.name}`} brand={brand} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {activeOpps.map((opp: Opportunity) => (
                <OpportunityCard key={opp.id} opp={opp} brand={brand} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: brand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>RC</span>
          </div>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            Interested in partnering with Renewables Connect?
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
            Connect your organisation with the next generation of clean energy talent.
          </p>
          <Link
            href="mailto:registrations@renewablesconnect.com"
            style={{
              display:       'inline-flex', alignItems: 'center', gap: 8,
              padding:       '12px 28px', borderRadius: 12,
              background:    brand, color: '#fff',
              fontWeight:    700, fontSize: 14, textDecoration: 'none',
              fontFamily:    'Montserrat, sans-serif',
            }}
          >
            Get in touch →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ label, brand }: { label: string; brand: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{ width: 4, height: 24, borderRadius: 2, background: brand, flexShrink: 0 }} />
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>
        {label}
      </h2>
    </div>
  )
}

function StatItem({ icon, label, value, brand }: { icon: string; label: string; value: string; brand: string }) {
  return (
    <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 20, color: brand }}>{icon}</span>
      <div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function SocialLink({ href, icon, label, brand }: { href: string; icon: ReactNode; label: string; brand: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      style={{
        width: 34, height: 34, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${brand}22`, color: brand,
        textDecoration: 'none',
        border: `1px solid ${brand}33`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${brand}44`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${brand}22`)}
    >
      {icon}
    </a>
  )
}

// Same 16x16, single-colour (currentColor) treatment for every network so
// none of them reads as visually heavier/lighter than the rest - previously
// YouTube used a plain Unicode "▶" glyph which rendered in the system's
// symbol font rather than matching the others' weight.
function SocialGlyph({ viewBox = '0 0 448 512', d }: { viewBox?: string; d: string }) {
  return (
    <svg width={16} height={16} viewBox={viewBox} fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function LinkedInGlyph() {
  return <SocialGlyph d="M100.28 448H7.4V148.9h92.88zm-46.44-341.7C24.09 106.3 0 82.1 0 52.3a53.79 53.79 0 0 1 107.58 0c0 29.8-24.1 54-53.74 54zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
}

function XGlyph() {
  return <SocialGlyph viewBox="0 0 512 512" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
}

function InstagramGlyph() {
  return <SocialGlyph viewBox="0 0 448 512" d="M224 141.4c-63.6 0-114.6 51-114.6 114.6S160.4 370.6 224 370.6 338.6 319.6 338.6 256 287.6 141.4 224 141.4zm0 189.2c-41.2 0-74.6-33.4-74.6-74.6s33.4-74.6 74.6-74.6 74.6 33.4 74.6 74.6-33.4 74.6-74.6 74.6zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zM443.9 145.6c-1.6-33.7-9.2-63.6-33.7-88s-54.3-32.1-88-33.7C287.9 22 224 22 224 22s-63.9 0-98.2 1.9c-33.7 1.6-63.6 9.2-88 33.7S5.7 111.9 4.1 145.6C2.2 179.9 2.2 224 2.2 224s0 63.9 1.9 98.2c1.6 33.7 9.2 63.6 33.7 88s54.3 32.1 88 33.7C160.1 445.8 224 445.8 224 445.8s63.9 0 98.2-1.9c33.7-1.6 63.6-9.2 88-33.7s32.1-54.3 33.7-88c1.9-34.3 1.9-98.2 1.9-98.2s0-64.1-1.9-98.4zM398.8 388c-7.3 18.4-21.5 32.6-39.9 39.9-27.6 11-93.2 8.5-118.9 8.5s-91.3 2.4-118.9-8.5c-18.4-7.3-32.6-21.5-39.9-39.9-11-27.6-8.5-93.2-8.5-118.9s-2.4-91.3 8.5-118.9c7.3-18.4 21.5-32.6 39.9-39.9 27.6-11 93.2-8.5 118.9-8.5s91.3-2.4 118.9 8.5c18.4 7.3 32.6 21.5 39.9 39.9 11 27.6 8.5 93.2 8.5 118.9s2.5 91.3-8.5 118.9z" />
}

function FacebookGlyph() {
  return <SocialGlyph viewBox="0 0 320 512" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
}

function YouTubeGlyph() {
  return <SocialGlyph viewBox="0 0 576 512" d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zm-317.5 213.5V175.2l142.7 81.2-142.7 81.2z" />
}

function OpportunityCard({ opp, brand }: { opp: Opportunity; brand: string }) {
  return (
    <div style={{
      background:   'rgba(255,255,255,0.05)',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 24,
      display:      'flex', flexDirection: 'column', gap: 10,
    }}>
      {opp.type && (
        <span style={{
          display:    'inline-block', fontSize: 11, fontWeight: 700,
          padding:    '3px 10px', borderRadius: 999,
          background: `${brand}22`, color: brand,
          border:     `1px solid ${brand}33`,
          alignSelf:  'flex-start',
        }}>
          {opp.type}
        </span>
      )}
      <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>
        {opp.title}
      </h3>
      {opp.description && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
          {opp.description}
        </p>
      )}
      {opp.url && (
        <a
          href={opp.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:    'inline-flex', alignItems: 'center', gap: 4,
            fontSize:   13, fontWeight: 600, color: brand,
            textDecoration: 'none', marginTop: 4,
          }}
        >
          Find out more →
        </a>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(130,188,0,0.3)', borderTopColor: '#82BC00', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading partner profile…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function PartnerProfilePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PartnerProfileContent />
    </Suspense>
  )
}

function NotFoundScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 48 }}>🔍</p>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, fontFamily: 'Montserrat, sans-serif' }}>Partner not found</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>This organisation may not be published yet.</p>
      <Link href="/partners" style={{ color: '#82BC00', fontSize: 14, textDecoration: 'none', marginTop: 8 }}>← Back to partners</Link>
    </div>
  )
}
