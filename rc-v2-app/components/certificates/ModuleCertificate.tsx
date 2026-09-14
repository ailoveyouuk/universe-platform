'use client'

import React, { forwardRef, useRef, useEffect, useState } from 'react'
import type { CertificateRecord } from '@/lib/certificates/types'

interface ModuleCertificateProps {
  cert: CertificateRecord
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(new Date(iso))
}

const PART_STYLES = [
  { label: 'Part 1: The Transition',    color: '#82BC00', bg: 'rgba(130,188,0,0.15)',   border: 'rgba(130,188,0,0.4)' },
  { label: 'Part 2: Core Generation',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)' },
  { label: 'Part 3: The Future',        color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)' },
]

export const ModuleCertificate = forwardRef<HTMLDivElement, ModuleCertificateProps>(
  function ModuleCertificate({ cert }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
      const el = wrapperRef.current
      if (!el) return
      const obs = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width ?? el.offsetWidth
        setScale(w / 1200)
      })
      obs.observe(el)
      setScale(el.offsetWidth / 1200)
      return () => obs.disconnect()
    }, [])

    return (
      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', paddingTop: 'calc(850 / 1200 * 100%)' }}
      >
        <div
          ref={ref}
          data-certificate-id={cert.id}
          role="img"
          aria-label="Certificate"
          style={{
            position:        'absolute',
            inset:           0,
            width:           '1200px',
            height:          '850px',
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
            background:      '#111827',
            fontFamily:      "'Montserrat', sans-serif",
            overflow:        'hidden',
          }}
        >
          {/* TOP ACCENT BAR — gold + green + gold */}
          <div style={{
            position:   'absolute',
            top:        0,
            left:       0,
            right:      0,
            height:     '10px',
            background: 'linear-gradient(90deg, #DAA520, #82BC00, #DAA520)',
          }} />

          {/* BOTTOM ACCENT BAR */}
          <div style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            right:      0,
            height:     '5px',
            background: 'linear-gradient(90deg, #DAA520, #82BC00, #DAA520)',
          }} />

          {/* OUTER DECORATIVE BORDER */}
          <div style={{
            position:      'absolute',
            inset:         '24px',
            border:        '1px solid rgba(218,165,32,0.25)',
            borderRadius:  '8px',
            pointerEvents: 'none',
          }} />

          {/* Secondary inner border for extra gravitas */}
          <div style={{
            position:      'absolute',
            inset:         '32px',
            border:        '1px solid rgba(218,165,32,0.1)',
            borderRadius:  '6px',
            pointerEvents: 'none',
          }} />

          {/* MAIN CONTENT */}
          <div style={{
            position:      'absolute',
            inset:         '10px',
            display:       'flex',
            flexDirection: 'row',
          }}>
            {/* LEFT PANEL — wider, gold themed */}
            <div style={{
              width:          '32%',
              background:     'rgba(218,165,32,0.05)',
              borderRight:    '1px solid rgba(218,165,32,0.2)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '44px 24px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* REV logo — transparent background, white text, works directly on dark */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logos/rc-logo-rev.png"
                  alt="Renewables Connect"
                  style={{ width: '160px', height: 'auto', display: 'block' }}
                />

                {/* Ornate compass/star SVG */}
                <div style={{ marginTop: '4px' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer rings */}
                    <circle cx="50" cy="50" r="48" stroke="#DAA520" strokeWidth="0.5" strokeOpacity="0.3" />
                    <circle cx="50" cy="50" r="42" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.2" />
                    <circle cx="50" cy="50" r="34" stroke="#DAA520" strokeWidth="0.5" strokeOpacity="0.25" />
                    <circle cx="50" cy="50" r="26" stroke="#DAA520" strokeWidth="1.5" strokeOpacity="0.5" />
                    {/* Center */}
                    <circle cx="50" cy="50" r="5" fill="#DAA520" fillOpacity="0.9" />
                    {/* Cardinal points */}
                    <polygon points="50,16 53,48 50,44 47,48" fill="#DAA520" fillOpacity="0.7" />
                    <polygon points="50,84 53,52 50,56 47,52" fill="#DAA520" fillOpacity="0.5" />
                    <polygon points="16,50 48,53 44,50 48,47" fill="#DAA520" fillOpacity="0.5" />
                    <polygon points="84,50 52,53 56,50 52,47" fill="#DAA520" fillOpacity="0.7" />
                    {/* Diagonal tick marks */}
                    <line x1="22" y1="22" x2="26" y2="26" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.3" />
                    <line x1="78" y1="22" x2="74" y2="26" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.3" />
                    <line x1="22" y1="78" x2="26" y2="74" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.3" />
                    <line x1="78" y1="78" x2="74" y2="74" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.3" />
                    {/* Dots */}
                    <circle cx="50" cy="8" r="2" fill="#DAA520" fillOpacity="0.4" />
                    <circle cx="50" cy="92" r="2" fill="#DAA520" fillOpacity="0.4" />
                    <circle cx="8" cy="50" r="2" fill="#DAA520" fillOpacity="0.4" />
                    <circle cx="92" cy="50" r="2" fill="#DAA520" fillOpacity="0.4" />
                  </svg>
                </div>
              </div>

              <div style={{
                fontSize:      '7px',
                color:         'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign:     'center',
              }}>
                MODULE<br />COMPLETION<br />CERTIFICATE
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
              flex:          1,
              padding:       '44px 56px',
              display:       'flex',
              flexDirection: 'column',
            }}>
              {/* Header label */}
              <div style={{
                fontSize:      '9px',
                letterSpacing: '0.3em',
                color:         '#DAA520',
                textTransform: 'uppercase',
                marginBottom:  '12px',
              }}>
                Module Completion Certificate
              </div>

              {/* Thick gold decorative line */}
              <div style={{ borderTop: '2px solid rgba(218,165,32,0.5)', marginBottom: '20px' }} />

              <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                This is to certify that
              </div>

              {/* Recipient name */}
              <div style={{
                fontSize:    '40px',
                fontWeight:  700,
                color:       '#ffffff',
                lineHeight:  1.1,
                marginBottom:'16px',
                letterSpacing: '-0.5px',
              }}>
                {cert.recipientName}
              </div>

              <div style={{ width: '80px', borderTop: '2px solid rgba(218,165,32,0.5)', marginBottom: '16px' }} />

              <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                has successfully completed
              </div>

              {/* Module title */}
              <div style={{
                fontSize:    '20px',
                fontWeight:  700,
                color:       '#ffffff',
                lineHeight:  1.3,
                marginBottom:'8px',
              }}>
                {cert.moduleContext}
              </div>

              {/* Stats row */}
              <div style={{
                fontSize:    '12px',
                color:       'rgba(255,255,255,0.5)',
                marginBottom:'20px',
                letterSpacing:'0.02em',
              }}>
                15 Sub-Modules · 30 Hours Study · 30 Hours Research · 60 Hours Total
              </div>

              {/* Part chips */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                {PART_STYLES.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background:   p.bg,
                      border:       `1px solid ${p.border}`,
                      borderRadius: '6px',
                      padding:      '6px 14px',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '6px',
                    }}
                  >
                    <div style={{
                      width:        '8px',
                      height:       '8px',
                      borderRadius: '50%',
                      background:   p.color,
                    }} />
                    <span style={{ fontSize: '9px', color: p.color, fontWeight: 600, letterSpacing: '0.05em' }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Footer */}
              <div>
                <div style={{
                  borderTop:   '1px solid rgba(255,255,255,0.15)',
                  marginBottom:'16px',
                  width:       '200px',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{
                      fontSize:      '8px',
                      color:         'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom:  '4px',
                    }}>
                      Date Completed
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {formatDate(cert.completedAt)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
                      Issued by
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(218,165,32,0.8)', fontWeight: 600 }}>
                      Renewables Connect
                    </div>
                    {cert.credentialId && (
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginTop: '4px', letterSpacing: '0.08em' }}>
                        Credential No. {cert.credentialId}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
