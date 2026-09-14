import ExcelJS from 'exceljs'
import { prisma } from './prismaClient'
import { computeSMPerformanceStats } from './stats'
import { getLearnerAccess } from './access'

// ── Report row builders ───────────────────────────────────────────────────────
// Each builder returns { columns, rows } — columns are ordered {key,label}
// pairs shared by both the CSV and XLSX serializers below, rows are plain
// objects keyed by column.key. Kept deliberately close to the shapes the
// equivalent rc-admin list pages already show (institutions/employers
// summaries, SM performance) so the exported numbers always match what's
// on screen — no separate "reporting" query path to drift out of sync.

export interface ReportColumn {
  key: string
  label: string
}

export interface ReportData {
  columns: ReportColumn[]
  rows: Record<string, string | number | null>[]
}

export async function buildLearnersReport(): Promise<ReportData> {
  const learners = await prisma.learner.findMany({
    include: {
      user:        { select: { displayName: true, email: true } },
      institution: { select: { name: true } },
      cohort:      { select: { name: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  })

  const rows = await Promise.all(learners.map(async learner => {
    const access = await getLearnerAccess(learner.id)
    return {
      name:          learner.user.displayName,
      email:         learner.user.email,
      institution:   learner.institution?.name ?? '',
      cohort:        learner.cohort?.name ?? '',
      enrolledAt:    learner.enrolledAt.toISOString().slice(0, 10),
      lastActiveAt:  learner.lastActiveAt ? learner.lastActiveAt.toISOString().slice(0, 10) : '',
      unlockedParts: access.parts.join(', '),
    }
  }))

  return {
    columns: [
      { key: 'name',          label: 'Name' },
      { key: 'email',         label: 'Email' },
      { key: 'institution',   label: 'Institution' },
      { key: 'cohort',        label: 'Cohort' },
      { key: 'enrolledAt',    label: 'Enrolled' },
      { key: 'lastActiveAt',  label: 'Last active' },
      { key: 'unlockedParts', label: 'Unlocked parts' },
    ],
    rows,
  }
}

export async function buildInstitutionsReport(): Promise<ReportData> {
  const institutions = await prisma.institution.findMany({
    include: { _count: { select: { learners: true } } },
    orderBy: { partnerSince: 'desc' },
  })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const rows = await Promise.all(institutions.map(async inst => {
    const [active, colAgg, allProgress] = await Promise.all([
      prisma.learner.count({ where: { institutionId: inst.id, lastActiveAt: { gte: thirtyDaysAgo } } }),
      prisma.cOLScore.aggregate({ _avg: { percent: true }, where: { smProgress: { learner: { institutionId: inst.id } } } }),
      prisma.sMProgress.count({ where: { learner: { institutionId: inst.id }, status: 'completed' } }),
    ])
    const total = inst._count.learners
    return {
      name:                inst.name,
      type:                inst.type,
      sector:              inst.sector ?? '',
      partnerTier:         inst.partnerTier,
      studentCount:        total,
      activeStudents30d:   active,
      avgCompletionPercent: total > 0 ? Number(((allProgress / (total * 15)) * 100).toFixed(1)) : 0,
      avgCOLPercent:       colAgg._avg.percent != null ? Number(colAgg._avg.percent.toFixed(1)) : null,
      partnerSince:        inst.partnerSince.toISOString().slice(0, 10),
      status:              inst.status,
    }
  }))

  return {
    columns: [
      { key: 'name',                 label: 'Institution' },
      { key: 'type',                 label: 'Type' },
      { key: 'sector',               label: 'Sector' },
      { key: 'partnerTier',          label: 'Partner tier' },
      { key: 'studentCount',         label: 'Students' },
      { key: 'activeStudents30d',    label: 'Active (30d)' },
      { key: 'avgCompletionPercent', label: 'Avg completion %' },
      { key: 'avgCOLPercent',        label: 'Avg CoL %' },
      { key: 'partnerSince',         label: 'Partner since' },
      { key: 'status',               label: 'Status' },
    ],
    rows,
  }
}

export async function buildEmployersReport(): Promise<ReportData> {
  const employers = await prisma.employer.findMany({
    include: {
      _count: { select: { jobRoles: true, shortlistedCandidates: true } },
      employerUsers: { include: { user: { select: { lastSignInAt: true } } } },
    },
    orderBy: { partnerSince: 'desc' },
  })

  const rows = employers.map(emp => {
    const lastActive = emp.employerUsers
      .map(eu => eu.user.lastSignInAt)
      .filter((d): d is Date => d != null)
      .sort()
      .at(-1)
    return {
      name:                  emp.name,
      sector:                emp.sector ?? '',
      partnerTier:           emp.partnerTier,
      status:                emp.status,
      openRoles:             emp._count.jobRoles,
      shortlistedCandidates: emp._count.shortlistedCandidates,
      lastActiveAt:          lastActive ? lastActive.toISOString().slice(0, 10) : '',
    }
  })

  return {
    columns: [
      { key: 'name',                  label: 'Employer' },
      { key: 'sector',                label: 'Sector' },
      { key: 'partnerTier',           label: 'Partner tier' },
      { key: 'status',                label: 'Status' },
      { key: 'openRoles',             label: 'Open roles' },
      { key: 'shortlistedCandidates', label: 'Shortlisted candidates' },
      { key: 'lastActiveAt',          label: 'Last staff active' },
    ],
    rows,
  }
}

export async function buildContentReport(): Promise<ReportData> {
  const stats = await computeSMPerformanceStats()
  const rows = stats.map(sm => ({
    smId:             sm.smId,
    smTitle:          sm.smTitle,
    partNumber:       sm.partNumber,
    totalStarts:      sm.totalStarts,
    totalCompletions: sm.totalCompletions,
    completionRate:   Number(sm.completionRate.toFixed(1)),
    avgCOLPercent:    sm.avgCOLPercent != null ? Number(sm.avgCOLPercent.toFixed(1)) : null,
    dropoffRate:      Number(sm.dropoffRate.toFixed(1)),
  }))

  return {
    columns: [
      { key: 'smId',             label: 'SM #' },
      { key: 'smTitle',          label: 'Sub-module' },
      { key: 'partNumber',       label: 'Part' },
      { key: 'totalStarts',      label: 'Starts' },
      { key: 'totalCompletions', label: 'Completions' },
      { key: 'completionRate',   label: 'Completion %' },
      { key: 'avgCOLPercent',    label: 'Avg CoL %' },
      { key: 'dropoffRate',      label: 'Drop-off %' },
    ],
    rows,
  }
}

export type ReportType = 'learners' | 'institutions' | 'employers' | 'content'

export async function buildReport(type: ReportType): Promise<ReportData> {
  switch (type) {
    case 'learners':     return buildLearnersReport()
    case 'institutions': return buildInstitutionsReport()
    case 'employers':    return buildEmployersReport()
    case 'content':      return buildContentReport()
  }
}

// ── Serializers ──────────────────────────────────────────────────────────────

function csvEscape(value: string | number | null): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV({ columns, rows }: ReportData): string {
  const header = columns.map(c => csvEscape(c.label)).join(',')
  const lines = rows.map(row => columns.map(c => csvEscape(row[c.key])).join(','))
  return [header, ...lines].join('\r\n') + '\r\n'
}

export async function toXLSX({ columns, rows }: ReportData, sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)) // Excel sheet-name cap
  sheet.columns = columns.map(c => ({ header: c.label, key: c.key, width: Math.max(12, c.label.length + 4) }))
  sheet.getRow(1).font = { bold: true }
  rows.forEach(row => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export const REPORT_LABELS: Record<ReportType, string> = {
  learners:     'Learners',
  institutions: 'Institutions',
  employers:    'Employers',
  content:      'Content performance',
}
