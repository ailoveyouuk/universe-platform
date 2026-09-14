import type { Student, InstitutionStats, SMStat } from './types'

const SM_DEFS: { smId: number; slug: string; title: string; part: 1 | 2 | 3 }[] = [
  { smId: 1,  slug: 'sm1',  title: 'The Energy Transition',        part: 1 },
  { smId: 2,  slug: 'sm2',  title: 'Policy & Regulation',          part: 1 },
  { smId: 3,  slug: 'sm3',  title: 'Finance & Investment',         part: 1 },
  { smId: 4,  slug: 'sm4',  title: 'Grid & Infrastructure',        part: 1 },
  { smId: 5,  slug: 'sm5',  title: 'Stakeholder Engagement',       part: 1 },
  { smId: 6,  slug: 'sm6',  title: 'Solar PV Technology',          part: 2 },
  { smId: 7,  slug: 'sm7',  title: 'Wind Energy',                  part: 2 },
  { smId: 8,  slug: 'sm8',  title: 'Battery Storage',              part: 2 },
  { smId: 9,  slug: 'sm9',  title: 'Hydropower & Marine',          part: 2 },
  { smId: 10, slug: 'sm10', title: 'Hydrogen & Fuel Cells',        part: 2 },
  { smId: 11, slug: 'sm11', title: 'Smart Grids & Digitalisation', part: 3 },
  { smId: 12, slug: 'sm12', title: 'Carbon Capture & Storage',     part: 3 },
  { smId: 13, slug: 'sm13', title: 'Circular Economy',             part: 3 },
  { smId: 14, slug: 'sm14', title: 'Future of Mobility',           part: 3 },
  { smId: 15, slug: 'sm15', title: 'Net Zero Strategy',            part: 3 },
]

export function computeInstitutionStats(students: Student[]): InstitutionStats {
  if (students.length === 0) {
    return { totalStudents: 0, activeStudents: 0, avgCompletionPercent: 0, avgCOLPercent: 0, smStats: [] }
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const activeStudents = students.filter(s =>
    s.lastActiveAt && new Date(s.lastActiveAt) >= thirtyDaysAgo
  ).length

  const completionPercents = students.map(s => {
    const completed = Object.values(s.smProgress).filter(p => p.status === 'completed').length
    return (completed / 15) * 100
  })
  const avgCompletionPercent = completionPercents.reduce((a, b) => a + b, 0) / students.length

  const allCOLScores: number[] = []
  students.forEach(s => {
    Object.values(s.smProgress).forEach(p => {
      if (p.colScore) allCOLScores.push(p.colScore.percent)
    })
  })
  const avgCOLPercent = allCOLScores.length > 0
    ? allCOLScores.reduce((a, b) => a + b, 0) / allCOLScores.length
    : 0

  const smStats: SMStat[] = SM_DEFS.map(sm => {
    const attempted = students.filter(s => s.smProgress[sm.slug]?.status !== 'not_started')
    const completed = students.filter(s => s.smProgress[sm.slug]?.status === 'completed')
    const colScores = students
      .map(s => s.smProgress[sm.slug]?.colScore?.percent)
      .filter((p): p is number => p !== null && p !== undefined)
    return {
      smId: sm.smId,
      smTitle: sm.title,
      partNumber: sm.part,
      studentsAttempted: attempted.length,
      studentsCompleted: completed.length,
      avgCOLPercent: colScores.length > 0 ? colScores.reduce((a, b) => a + b, 0) / colScores.length : null,
    }
  })

  return { totalStudents: students.length, activeStudents, avgCompletionPercent, avgCOLPercent, smStats }
}
