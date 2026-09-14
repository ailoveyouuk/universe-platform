'use client'

import { useRef, useEffect } from 'react'
import type { CertificateRecord } from '@/lib/certificates/types'
import { SMCertificate }    from './SMCertificate'
import { PartCertificate }  from './PartCertificate'
import { ModuleCertificate } from './ModuleCertificate'
import { printCertificateAsPdf }       from '@/lib/certificates/printCert'
import { getLinkedInAddToProfileUrl, getLinkedInShareUrl } from '@/lib/certificates/linkedIn'

interface CertificateViewerProps {
  cert:                  CertificateRecord
  completedSMsForPart?:  Array<{ id: number; title: string }>
  onClose:               () => void
}

export function CertificateViewer({ cert, completedSMsForPart, onClose }: CertificateViewerProps) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fileName = `${cert.recipientName} — ${cert.title} — Renewables Connect.pdf`
    .replace(/[/\\?%*:|"<>]/g, '-')

  function handlePrint() {
    printCertificateAsPdf(cert.id, fileName)
  }

  function handleLinkedInAdd() {
    window.open(getLinkedInAddToProfileUrl(cert), '_blank', 'noopener,noreferrer')
  }

  function handleLinkedInShare() {
    window.open(getLinkedInShareUrl(cert), '_blank', 'noopener,noreferrer')
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Inner container */}
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-heading font-semibold text-lg leading-tight">
              {cert.title}
            </div>
            <div className="text-rc-grey-light text-sm capitalize">
              {cert.level === 'submodule' ? 'Sub-Module' : cert.level === 'part' ? 'Part' : 'Module'} Certificate
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Certificate display */}
        <div className="w-full rounded-xl overflow-hidden shadow-2xl">
          {cert.level === 'submodule' && (
            <SMCertificate cert={cert} />
          )}
          {cert.level === 'part' && (
            <PartCertificate cert={cert} completedSMs={completedSMsForPart ?? []} />
          )}
          {cert.level === 'module' && (
            <ModuleCertificate cert={cert} />
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Download PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#82BC00' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#6a9a00')}
            onMouseLeave={e => (e.currentTarget.style.background = '#82BC00')}
          >
            <span>⬇</span>
            Download PDF
          </button>

          {/* Add to LinkedIn Profile */}
          <button
            onClick={handleLinkedInAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
          >
            <span style={{ fontWeight: 700, color: '#0a66c2' }}>in</span>
            Add to LinkedIn Profile
          </button>

          {/* Share on LinkedIn */}
          <button
            onClick={handleLinkedInShare}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
          >
            <span style={{ fontWeight: 700, color: '#0a66c2' }}>in</span>
            Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  )
}
