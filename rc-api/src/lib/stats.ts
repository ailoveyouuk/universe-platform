import { prisma } from './prismaClient'

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

export async function computePlatformStats() {
  const [
    totalLearners, activeLearners30d, newLearners30d,
    moduleCompletions, partCompletions, smCompletions,
    totalCOLAttempts, totalInstitutions, totalInstitutionStudents,
    totalEmployers, activeEmployers30d, colAggregate,
  ] = await Promise.all([
    prisma.learner.count(),
    prisma.learner.count({ where: { lastActiveAt: { gte: thirtyDaysAgo() } } }),
    prisma.learner.count({ where: { enrolledAt: { gte: thirtyDaysAgo() } } }),
    prisma.certificate.count({ where: { level: 'module' } }),
    prisma.certificate.count({ where: { level: 'part' } }),
    prisma.sMProgress.count({ where: { status: 'completed' } }),  // sm completions tracked via SMProgress
    prisma.cOLScore.count(),
    prisma.institution.count(),
    prisma.learner.count({ where: { institutionId: { not: null } } }),
    prisma.employer.count(),
    prisma.employer.count({
      where: { employerUsers: { some: { user: { lastSignInAt: { gte: thirtyDaysAgo() } } } } },
    }),
    prisma.cOLScore.aggregate({ _avg: { percent: true } }),
  ])

  return {
    totalLearners, activeLearners30d, newLearners30d,
    moduleCompletions, partCompletions, smCompletions,
    avgCOLPercent: colAggregate._avg.percent ?? null,
    totalInstitutions, totalInstitutionStudents,
    totalEmployers, activeEmployers30d, totalCOLAttempts,
  }
}

export async function computeLearnerFunnel() {
  const [registered, startedSM1, completedModule] = await Promise.all([
    prisma.learner.count(),
    prisma.learner.count({
      where: { smProgress: { some: { status: { in: ['in_progress', 'completed'] } } } },
    }),
    prisma.certificate.count({ where: { level: 'module' } }),
  ])
  return { registered, startedSM1, completedModule }
}

export async function computeSMPerformanceStats() {
  const smGroups = await prisma.sMProgress.groupBy({
    by: ['smId', 'smTitle', 'partNumber'],
    _count: { id: true },
    where: { status: { in: ['in_progress', 'completed'] } },
  })

  const completions = await prisma.sMProgress.groupBy({
    by: ['smId'],
    _count: { id: true },
    where: { status: 'completed' },
  })

  type ColRow = { sm_id: number; avg_col: number }
  const colPerSM = await prisma.$queryRaw<ColRow[]>`
    SELECT sp."smId" as sm_id, AVG(cs.percent) as avg_col
    FROM "col_scores" cs
    JOIN "sm_progress" sp ON sp.id = cs."smProgressId"
    GROUP BY sp."smId"
  `

  const completionMap = new Map(completions.map(c => [c.smId, c._count.id]))
  const colMap = new Map(colPerSM.map(c => [c.sm_id, Number(c.avg_col)]))

  return smGroups.map(sm => {
    const starts = sm._count.id
    const completedCount = completionMap.get(sm.smId) ?? 0
    const completionRate = starts > 0 ? (completedCount / starts) * 100 : 0
    return {
      smId: sm.smId,
      smTitle: sm.smTitle,
      partNumber: sm.partNumber as 1 | 2 | 3,
      totalStarts: starts,
      totalCompletions: completedCount,
      completionRate,
      avgCOLPercent: colMap.get(sm.smId) ?? null,
      dropoffRate: 100 - completionRate,
    }
  }).sort((a, b) => a.smId - b.smId)
}
