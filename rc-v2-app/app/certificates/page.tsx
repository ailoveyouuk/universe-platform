'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Certificates Page — displays all earned certificates across 3 tiers
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import Link                  from 'next/link'
import { AppLayout }         from '@/components/layout/AppLayout'
import { CertificateCard }   from '@/components/certificates/CertificateCard'
import { CertificateViewer } from '@/components/certificates/CertificateViewer'
import { useCertificates }   from '@/lib/certificates/useCertificates'
import { PARTS }             from '@/lib/curriculum'
import type { CertificateRecord } from '@/lib/certificates/types'

// How many SMs are needed per part and which are still incomplete
function getPartProgress(partNumber: 1 | 2 | 3, earnedSmIds: Set<number>) {
  const part    = PARTS.find(p => p.number === partNumber)
  if (!part) return { total: 5, completed: 0, missing: [] as string[] }
  const missing = part.subModules
    .filter(sm => !earnedSmIds.has(sm.id))
    .map(sm => `SM ${sm.id}: ${sm.title}`)
  return { total: part.subModules.length, completed: part.subModules.length - missing.length, missing }
}

export default function CertificatesPage() {
  const { smCerts, partCerts, moduleCert, totalEarned } = useCertificates()
  const [viewingCert, setViewingCert] = useState<CertificateRecord | null>(null)

  // Build lookup sets
  const earnedSmIds    = useMemo(() => new Set(smCerts.map(c => c.smId!)), [smCerts])
  const earnedPartNums = useMemo(() => new Set(partCerts.map(c => c.partNumber!)), [partCerts])

  // For PartCertificate viewer — build completedSMs list for the viewed part
  const completedSMsForViewer = useMemo(() => {
    if (!viewingCert || viewingCert.level !== 'part') return []
    const part = PARTS.find(p => p.number === viewingCert.partNumber)
    if (!part) return []
    return part.subModules
      .filter(sm => earnedSmIds.has(sm.id))
      .map(sm => ({ id: sm.id, title: sm.title }))
  }, [viewingCert, earnedSmIds])

  // All 15 SMs in order for the grid
  const allSMs = useMemo(() => PARTS.flatMap(p => p.subModules), [])

  return (
    <AppLayout breadcrumbs={[{ label: 'My Certificates' }]}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

        {/* ── PAGE HEADER ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <h1 className="font-heading font-bold text-3xl text-rc-dark">
            My Certificates
          </h1>
          <p className="text-rc-grey text-base max-w-2xl">
            Certificates are awarded at three levels: one for each sub-module you complete,
            one for each part once all five sub-modules are done, and a flagship module
            certificate when you finish all 15. Share them directly to LinkedIn or
            download as a PDF.
          </p>
          {totalEarned > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(130,188,0,0.1)', color: '#82BC00', border: '1px solid rgba(130,188,0,0.25)' }}>
              <span>🎓</span>
              {totalEarned} certificate{totalEarned !== 1 ? 's' : ''} earned
            </div>
          )}
        </div>

        {/* ── EMPTY STATE ──────────────────────────────────────────── */}
        {totalEarned === 0 && (
          <div className="text-center py-20 px-6 bg-white rounded-2xl border border-rc-border shadow-card">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="font-heading font-bold text-xl text-rc-dark mb-2">
              No certificates yet
            </h2>
            <p className="text-rc-grey text-sm max-w-md mx-auto mb-6">
              Complete your first sub-module to earn your first certificate. Work through all
              15 sub-modules to unlock part certificates and the full module certificate.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#82BC00' }}
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* ── MODULE SECTION ───────────────────────────────────────── */}
        {totalEarned > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-bold text-lg text-rc-dark">Module Certificate</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(218,165,32,0.1)', color: '#DAA520', border: '1px solid rgba(218,165,32,0.3)' }}>
                Flagship
              </span>
            </div>

            {moduleCert ? (
              <div className="max-w-sm">
                <CertificateCard cert={moduleCert} onView={() => setViewingCert(moduleCert)} />
              </div>
            ) : (
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-rc-border bg-white">
                <div className="text-3xl opacity-30">🔒</div>
                <div>
                  <div className="font-heading font-semibold text-sm text-rc-dark">
                    Module 1 — Complete Certificate
                  </div>
                  <div className="text-xs text-rc-grey-light mt-1">
                    Complete all 15 sub-modules to unlock this flagship certificate.
                    {smCerts.length > 0 && ` ${15 - smCerts.length} sub-module${15 - smCerts.length !== 1 ? 's' : ''} remaining.`}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── PARTS SECTION ───────────────────────────────────────── */}
        {totalEarned > 0 && (
          <section className="space-y-4">
            <h2 className="font-heading font-bold text-lg text-rc-dark">Part Certificates</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {([1, 2, 3] as const).map(partNum => {
                const partCert    = partCerts.find(c => c.partNumber === partNum)
                const partMeta    = PARTS.find(p => p.number === partNum)!
                const progress    = getPartProgress(partNum, earnedSmIds)

                const accentColor =
                  partNum === 1 ? '#82BC00' :
                  partNum === 2 ? '#3b82f6' :
                  '#a855f7'

                if (partCert) {
                  return (
                    <CertificateCard
                      key={partNum}
                      cert={partCert}
                      onView={() => setViewingCert(partCert)}
                    />
                  )
                }

                return (
                  <div
                    key={partNum}
                    className="rounded-2xl border border-rc-border bg-white p-4 opacity-60"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                      <span className="text-xs font-semibold" style={{ color: accentColor }}>
                        Part {partNum}
                      </span>
                    </div>
                    <div className="font-heading font-semibold text-sm text-rc-dark mb-1">
                      {partMeta.title}: {partMeta.subtitle}
                    </div>
                    <div className="text-xs text-rc-grey-light mb-3">
                      {progress.completed}/{progress.total} sub-modules complete
                    </div>
                    <div className="h-1.5 bg-rc-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(progress.completed / progress.total) * 100}%`, background: accentColor }}
                      />
                    </div>
                    {progress.missing.length > 0 && (
                      <div className="mt-2 text-xs text-rc-grey-light">
                        Still needed: {progress.missing.slice(0, 2).join(', ')}
                        {progress.missing.length > 2 && ` +${progress.missing.length - 2} more`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SUB-MODULES SECTION ─────────────────────────────────── */}
        {totalEarned > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-bold text-lg text-rc-dark">Sub-Module Certificates</h2>
              <span className="text-sm text-rc-grey-light">
                {smCerts.length}/{15} earned
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allSMs.map(sm => {
                const smCert = smCerts.find(c => c.smId === sm.id)

                if (smCert) {
                  return (
                    <CertificateCard
                      key={sm.id}
                      cert={smCert}
                      onView={() => setViewingCert(smCert)}
                    />
                  )
                }

                // Locked placeholder
                const accentColor =
                  sm.partNumber === 1 ? '#82BC00' :
                  sm.partNumber === 2 ? '#3b82f6' :
                  '#a855f7'

                return (
                  <div
                    key={sm.id}
                    className="rounded-2xl border border-rc-border bg-white p-4 opacity-40"
                  >
                    {/* Mini locked preview */}
                    <div
                      className="rounded-lg mb-3 flex items-center justify-center"
                      style={{ height: '60px', background: '#111827' }}
                    >
                      <span className="text-xl">🔒</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: `${accentColor}22`,
                          color:      accentColor,
                          border:     `1px solid ${accentColor}44`,
                        }}
                      >
                        SM {sm.id}
                      </span>
                    </div>
                    <div className="font-heading font-semibold text-xs text-rc-dark leading-snug line-clamp-2">
                      {sm.title}
                    </div>
                    <div className="text-xs text-rc-grey-light mt-1">Not yet completed</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Certificate viewer modal */}
      {viewingCert && (
        <CertificateViewer
          cert={viewingCert}
          completedSMsForPart={completedSMsForViewer}
          onClose={() => setViewingCert(null)}
        />
      )}
    </AppLayout>
  )
}
