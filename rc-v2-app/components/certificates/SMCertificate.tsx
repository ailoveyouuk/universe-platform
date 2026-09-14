'use client'

import React, { forwardRef, useRef, useEffect, useState } from 'react'
import type { CertificateRecord } from '@/lib/certificates/types'

interface SMCertificateProps {
  cert: CertificateRecord
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  }).format(new Date(iso))
}

export const SMCertificate = forwardRef<HTMLDivElement, SMCertificateProps>(
  function SMCertificate({ cert }, ref) {
    const wrapperRef  = useRef<HTMLDivElement>(null)
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
      /* Outer scaling wrapper — maintains 1200:850 aspect ratio */
      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', paddingTop: 'calc(850 / 1200 * 100%)' }}
      >
        {/* Inner certificate — fixed size, scaled */}
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
            background: 'linear-gradient(90deg, #82BC00, #5a8400)',
          }} />

          {/* BOTTOM ACCENT BAR */}
          <div style={{
            position:   'absolute',
            bottom:     0,
            left:       0,
            right:      0,
            height:     '4px',
            background: 'linear-gradient(90deg, #82BC00, #5a8400)',
          }} />

          {/* OUTER DECORATIVE BORDER */}
          <div style={{
            position:     'absolute',
            inset:        '24px',
            border:       '1px solid rgba(130,188,0,0.2)',
            borderRadius: '8px',
            pointerEvents:'none',
          }} />

          {/* MAIN CONTENT — flex row */}
          <div style={{
            position:       'absolute',
            inset:          '8px',
            display:        'flex',
            flexDirection:  'row',
          }}>
            {/* LEFT PANEL */}
            <div style={{
              width:        '28%',
              background:   'rgba(130,188,0,0.06)',
              borderRight:  '1px solid rgba(130,188,0,0.15)',
              display:      'flex',
              flexDirection:'column',
              alignItems:   'center',
              justifyContent:'space-between',
              padding:      '40px 20px',
            }}>
              {/* Official logo in white seal panel */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                {/* REV logo — transparent background, white text, works directly on dark */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logos/rc-logo-rev.png"
                  alt="Renewables Connect"
                  style={{ width: '148px', height: 'auto', display: 'block' }}
                />

                {/* Decorative SVG rings */}
                <svg width="64" height="64" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="38" stroke="#82BC00" strokeWidth="1" strokeOpacity="0.3" />
                  <circle cx="40" cy="40" r="28" stroke="#82BC00" strokeWidth="0.5" strokeOpacity="0.2" />
                  <circle cx="40" cy="40" r="18" stroke="#82BC00" strokeWidth="1.5" strokeOpacity="0.5" />
                  <circle cx="40" cy="40" r="3" fill="#82BC00" fillOpacity="0.7" />
                  <circle cx="40" cy="10" r="1.5" fill="#82BC00" fillOpacity="0.4" />
                  <circle cx="40" cy="70" r="1.5" fill="#82BC00" fillOpacity="0.4" />
                  <circle cx="10" cy="40" r="1.5" fill="#82BC00" fillOpacity="0.4" />
                  <circle cx="70" cy="40" r="1.5" fill="#82BC00" fillOpacity="0.4" />
                </svg>
              </div>

              {/* Bottom level indicator */}
              <div style={{
                fontSize:      '7px',
                color:         'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign:     'center',
              }}>
                SUB-MODULE<br />CERTIFICATE
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{
              flex:          1,
              padding:       '48px 56px',
              display:       'flex',
              flexDirection: 'column',
            }}>
              {/* Header label */}
              <div style={{
                fontSize:      '9px',
                letterSpacing: '0.25em',
                color:         '#82BC00',
                textTransform: 'uppercase',
                marginBottom:  '12px',
              }}>
                Certificate of Completion
              </div>

              {/* Decorative line */}
              <div style={{ borderTop: '1px solid rgba(130,188,0,0.3)', marginBottom: '20px' }} />

              {/* "This certifies that" */}
              <div style={{
                fontSize:    '13px',
                fontStyle:   'italic',
                color:       'rgba(255,255,255,0.5)',
                marginBottom:'8px',
              }}>
                This certifies that
              </div>

              {/* Recipient name */}
              <div style={{
                fontSize:    '34px',
                fontWeight:  700,
                color:       '#ffffff',
                lineHeight:  1.1,
                marginBottom:'16px',
                letterSpacing: '-0.5px',
              }}>
                {cert.recipientName}
              </div>

              {/* Divider */}
              <div style={{
                width:        '60px',
                borderTop:    '2px solid rgba(130,188,0,0.4)',
                marginBottom: '16px',
              }} />

              {/* "has successfully completed" */}
              <div style={{
                fontSize:    '13px',
                fontStyle:   'italic',
                color:       'rgba(255,255,255,0.5)',
                marginBottom:'16px',
              }}>
                has successfully completed
              </div>

              {/* SM chip + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                {cert.smId !== undefined && (
                  <span style={{
                    background:   '#82BC00',
                    color:        '#ffffff',
                    fontSize:     '10px',
                    fontWeight:   700,
                    padding:      '3px 10px',
                    borderRadius: '4px',
                    letterSpacing:'0.05em',
                    whiteSpace:   'nowrap',
                  }}>
                    SM {cert.smId}
                  </span>
                )}
              </div>

              {/* SM title */}
              <div style={{
                fontSize:    '22px',
                fontWeight:  700,
                color:       '#82BC00',
                lineHeight:  1.2,
                marginBottom:'8px',
              }}>
                {cert.title}
              </div>

              {/* Short description */}
              <div style={{
                fontSize:   '12px',
                fontStyle:  'italic',
                color:      'rgba(255,255,255,0.4)',
                lineHeight: 1.5,
                display:    '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow:   'hidden',
                maxWidth:   '520px',
              }}>
                {cert.subtitle}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Footer */}
              <div>
                {/* Signature line */}
                <div style={{
                  borderTop:   '1px solid rgba(255,255,255,0.15)',
                  marginBottom:'16px',
                  width:       '180px',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  {/* Left: date */}
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

                  {/* Right: issuer */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize:  '9px',
                      color:     'rgba(255,255,255,0.3)',
                      marginBottom:'4px',
                    }}>
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
