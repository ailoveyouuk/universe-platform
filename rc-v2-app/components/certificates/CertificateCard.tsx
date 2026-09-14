'use client'

import type { CertificateRecord } from '@/lib/certificates/types'

interface CertificateCardProps {
  cert:   CertificateRecord
  onView: () => void
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(new Date(iso))
}

function getLevelBadge(cert: CertificateRecord): { label: string; color: string; bg: string; border: string } {
  if (cert.level === 'module') {
    return { label: 'Module', color: '#DAA520', bg: 'rgba(218,165,32,0.1)', border: 'rgba(218,165,32,0.3)' }
  }
  if (cert.level === 'part') {
    switch (cert.partAccent) {
      case 'blue-500':   return { label: 'Part',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)' }
      case 'purple-500': return { label: 'Part',    color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' }
      default:           return { label: 'Part',    color: '#82BC00', bg: 'rgba(130,188,0,0.1)',   border: 'rgba(130,188,0,0.3)' }
    }
  }
  return { label: 'Sub-Module', color: '#82BC00', bg: 'rgba(130,188,0,0.1)', border: 'rgba(130,188,0,0.3)' }
}

function getAccentColor(cert: CertificateRecord): string {
  if (cert.level === 'module') return '#DAA520'
  switch (cert.partAccent) {
    case 'blue-500':   return '#3b82f6'
    case 'purple-500': return '#a855f7'
    default:           return '#82BC00'
  }
}

export function CertificateCard({ cert, onView }: CertificateCardProps) {
  const badge  = getLevelBadge(cert)
  const accent = getAccentColor(cert)

  return (
    <div
      className="bg-white rounded-2xl border border-rc-border shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden flex flex-col"
      style={{ cursor: 'default' }}
    >
      {/* Mini preview */}
      <div style={{
        background:    '#111827',
        height:        '100px',
        position:      'relative',
        overflow:      'hidden',
        fontFamily:    "'Montserrat', sans-serif",
      }}>
        {/* Top accent */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '4px',
          background: cert.level === 'module'
            ? 'linear-gradient(90deg, #DAA520, #82BC00, #DAA520)'
            : `linear-gradient(90deg, ${accent}, ${accent}aa)`,
        }} />

        {/* RC branding */}
        <div style={{
          position: 'absolute',
          left:     '12px',
          top:      '14px',
          display:  'flex',
          flexDirection: 'column',
          gap:      '2px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: accent, lineHeight: 1 }}>RC</div>
          <div style={{ fontSize: '5px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            RENEWABLES
          </div>
        </div>

        {/* Cert title preview */}
        <div style={{
          position:  'absolute',
          right:     '12px',
          top:       '14px',
          left:      '52px',
          textAlign: 'right',
        }}>
          <div style={{
            fontSize:  '7px',
            color:     accent,
            letterSpacing:'0.1em',
            textTransform:'uppercase',
            marginBottom:'4px',
          }}>
            {cert.level === 'module' ? 'Module' : cert.level === 'part' ? 'Part' : 'Sub-Module'} Certificate
          </div>
          <div style={{
            fontSize:     '9px',
            fontWeight:   700,
            color:        '#ffffff',
            lineHeight:   1.3,
            overflow:     'hidden',
            display:      '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {cert.title}
          </div>
        </div>

        {/* Decorative circle */}
        <div style={{
          position:     'absolute',
          bottom:       '-20px',
          right:        '-20px',
          width:        '80px',
          height:       '80px',
          borderRadius: '50%',
          border:       `1px solid ${accent}33`,
        }} />
        <div style={{
          position:     'absolute',
          bottom:       '-10px',
          right:        '-10px',
          width:        '50px',
          height:       '50px',
          borderRadius: '50%',
          border:       `1px solid ${accent}22`,
        }} />
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Level badge */}
        <div className="flex items-center gap-2">
          <span style={{
            background:   badge.bg,
            color:        badge.color,
            border:       `1px solid ${badge.border}`,
            fontSize:     '10px',
            fontWeight:   600,
            padding:      '2px 8px',
            borderRadius: '4px',
            letterSpacing:'0.05em',
          }}>
            {badge.label}
          </span>
          {cert.smId !== undefined && (
            <span style={{
              fontSize:  '10px',
              color:     '#9CA3AF',
            }}>
              SM {cert.smId}
            </span>
          )}
        </div>

        {/* Title */}
        <div
          className="font-heading font-semibold text-sm text-rc-dark leading-snug"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {cert.title}
        </div>

        {/* Date */}
        <div className="text-xs text-rc-grey-light mt-auto">
          Earned {formatDate(cert.completedAt)}
        </div>

        {/* View button */}
        <button
          onClick={onView}
          className="text-xs font-medium text-rc-green hover:underline text-left mt-1"
        >
          View Certificate →
        </button>
      </div>
    </div>
  )
}
