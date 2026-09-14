// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn integration helpers for certificates
// ─────────────────────────────────────────────────────────────────────────────

import type { CertificateRecord } from './types'

export function getLinkedInAddToProfileUrl(cert: CertificateRecord): string {
  const date = new Date(cert.completedAt)
  const params = new URLSearchParams({
    startTask:        'CERTIFICATION_NAME',
    name:             cert.title,
    organizationName: 'Renewables Connect',
    issueYear:        String(date.getFullYear()),
    issueMonth:       String(date.getMonth() + 1),
  })
  return `https://www.linkedin.com/profile/add?${params}`
}

export function getLinkedInShareUrl(cert: CertificateRecord): string {
  const levelText =
    cert.level === 'module'
      ? 'full module'
      : cert.level === 'part'
      ? 'part'
      : 'sub-module'

  const text = `🎓 Excited to share that I've just completed the ${cert.title} ${levelText} as part of ${cert.moduleContext} with Renewables Connect! Building my knowledge of renewable energy, one step at a time. #RenewableEnergy #CleanEnergy #ProfessionalDevelopment #Renewables`

  const params = new URLSearchParams({
    mini:    'true',
    url:     'https://renewablesconnect.com',
    title:   `${cert.title} — Renewables Connect`,
    summary: text,
  })

  return `https://www.linkedin.com/shareArticle?${params}`
}
