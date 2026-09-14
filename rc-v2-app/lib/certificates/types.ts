// ─────────────────────────────────────────────────────────────────────────────
// Certificate types — shared across all certificate components and hooks
// ─────────────────────────────────────────────────────────────────────────────

export type CertificateLevel = 'submodule' | 'part' | 'module'

export interface CertificateRecord {
  id:             string
  level:          CertificateLevel
  title:          string
  subtitle:       string
  moduleContext:  string  // e.g. 'Module 1 — An Introduction to Renewables & Clean Energy'
  recipientName:  string
  completedAt:    string  // ISO date string
  partNumber?:    1 | 2 | 3
  partAccent?:    'rc-green' | 'blue-500' | 'purple-500'
  smId?:          number
  certifyingBody?: string
  credentialId?:  string
}
