'use client'

import React, { forwardRef, useRef, useEffect, useState } from 'react'
import type { CertificateRecord } from '@/lib/certificates/types'

interface PartCertificateProps {
  cert:         CertificateRecord
  completedSMs: Array<{ id: number; title: string }>
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(new Date(iso))
}

function accentToHex(accent: string | undefined): string {
  switch (accent) {
    case 'rc-green':   return '#82BC00'
    case 'blue-500':   return '#3b82f6'
    case 'purple-500': return '#a855f7'
    default:           return '#82BC00'
  }
}

function accentToGradient(accent: string | undefined): string {
  switch (accent) {
    case 'rc-green':   return 'linear-gradient(90deg, #82BC00, #5a8400)'
    case 'blue-500':   return 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
    case 'purple-500': return 'linear-gradient(90deg, #a855f7, #7c3aed)'
    default:           return 'linear-gradient(90deg, #82BC00, #5a8400)'
  }
}

export const PartCertificate = forwardRef<HTMLDivElement, PartCertificateProps>(
  function PartCertificate({ cert, completedSMs }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    const accent   = accentToHex(cert.partAccent)
    const gradient = accentToGradient(cert.partAccent)

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
          {/* TOP ACCENT BAR */}
          <div style={{
            position:   'absolute',
            top:        0,
            left:       0,
            right:      0,
            height:     '8px',
            background: gradient,
          }} />

          {/* BOTTOM ACCENT BAR */}
          <div style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            right:      0,
            height:     '4px',
            background: gradient,
          }} />

          {/* OUTER DECORATIVE BORDER */}
          <div style={{
            position:      'absolute',
            inset:         '24px',
            border:        `1px solid ${accent}33`,
            borderRadius:  '8px',
            pointerEvents: 'none',
          }} />

          {/* MAIN CONTENT */}
          <div style={{
            position:      'absolute',
            inset:         '8px',
            display:       'flex',
            flexDirection: 'row',
          }}>
            {/* LEFT PANEL */}
            <div style={{
              width:          '28%',
              background:     `${accent}0f`,
              borderRight:    `1px solid ${accent}26`,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '40px 20px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* REV logo — transparent background, white text, works directly on dark */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logos/rc-logo-rev.png"
                  alt="Renewables Connect"
                  style={{ width: '148px', height: 'auto', display: 'block' }}
                />

                {/* Part number badge */}
                <div style={{
                  width:          '64px',
                  height:         '64px',
                  borderRadius:   '50%',
                  border:         `2px solid ${accent}99`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexDirection:  'column',
                }}>
                  <div style={{ fontSize: '9px', color: `${accent}99`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Part
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: accent, lineHeight: 1 }}>
                    {cert.partNumber}
                  </div>
                </div>

                {/* Decorative rings */}
                <svg width="64" height="64" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="38" stroke={accent} strokeWidth="1" strokeOpacity="0.3" />
                  <circle cx="40" cy="40" r="28" stroke={accent} strokeWidth="0.5" strokeOpacity="0.2" />
                  <circle cx="40" cy="40" r="18" stroke={accent} strokeWidth="1.5" strokeOpacity="0.5" />
                  <circle cx="40" cy="40" r="3" fill={accent} fillOpacity="0.7" />
                  <circle cx="40" cy="12" r="2" fill={accent} fillOpacity="0.5" />
                  <circle cx="40" cy="68" r="2" fill={accent} fillOpacity="0.5" />
                  <circle cx="12" cy="40" r="2" fill={accent} fillOpacity="0.5" />
                  <circle cx="68" cy="40" r="2" fill={accent} fillOpacity="0.5" />
                </svg>
              </div>

              <div style={{
                fontSize:      '7px',
                color:         'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign:     'center',
              }}>
                PART<br />CERTIFICATE
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  fontSize:      '9px',
                  letterSpacing: '0.25em',
                  color:         accent,
                  textTransform: 'uppercase',
                }}>
                  Certificate of Completion
                </div>
                {/* Part context chip */}
                <span style={{
                  fontSize:     '8px',
                  fontWeight:   600,
                  color:        accent,
                  border:       `1px solid ${accent}66`,
                  padding:      '2px 8px',
                  borderRadius: '4px',
                  letterSpacing:'0.05em',
                }}>
                  Part {cert.partNumber} of 3
                </span>
              </div>

              <div style={{ borderTop: `1px solid ${accent}4d`, marginBottom: '20px' }} />

              <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                This certifies that
              </div>

              <div style={{
                fontSize:    '38px',
                fontWeight:  700,
                color:       '#ffffff',
                lineHeight:  1.1,
                marginBottom:'16px',
                letterSpacing: '-0.5px',
              }}>
                {cert.recipientName}
              </div>

              <div style={{ width: '60px', borderTop: `2px solid ${accent}66`, marginBottom: '16px' }} />

              <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                has successfully completed all five sub-modules of
              </div>

              {/* Part title */}
              <div style={{
                fontSize:    '22px',
                fontWeight:  700,
                color:       accent,
                lineHeight:  1.2,
                marginBottom:'8px',
              }}>
                {cert.title}
              </div>

              {/* Part description */}
              <div style={{
                fontSize:  '12px',
                fontStyle: 'italic',
                color:     'rgba(255,255,255,0.4)',
                lineHeight:1.5,
                maxWidth:  '520px',
                marginBottom: '20px',
              }}>
                {cert.subtitle}
              </div>

              {/* SM chips */}
              {completedSMs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {completedSMs.map(sm => (
                    <span
                      key={sm.id}
                      style={{
                        background:   `${accent}22`,
                        border:       `1px solid ${accent}44`,
                        color:        accent,
                        fontSize:     '9px',
                        fontWeight:   600,
                        padding:      '3px 10px',
                        borderRadius: '4px',
                        letterSpacing:'0.05em',
                      }}
                    >
                      SM {sm.id} · {sm.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Footer */}
              <div>
                <div style={{
                  borderTop:   '1px solid rgba(255,255,255,0.15)',
                  marginBottom:'16px',
                  width:       '180px',
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
                      Renewables Connect
                    </div>
                    {cert.certifyingBody && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                        {cert.certifyingBody}
                      </div>
                    )}
                    {cert.credentialId && (
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginTop: '2px', letterSpacing: '0.05em' }}>
                        {cert.credentialId}
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
