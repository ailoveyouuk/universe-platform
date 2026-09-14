import type { FastifyInstance } from 'fastify'
import { requireEmployerScope } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { SM_CURRICULUM } from '../lib/curriculum'
import type { Learner, SMProgress, COLScore, CandidateProfile as CandidateProfileRow } from '../../generated/prisma'

type LearnerWithProgress = Learner & {
  smProgress: (SMProgress & { colScore: COLScore | null })[]
  certificates: { credentialId: string; level: string }[]
  candidateProfile: CandidateProfileRow | null
}

// Shared candidate-profile shaping — used by both the /candidates listing and
// the dashboard's "recently qualified" feed, so completion-level, COL
// aggregation, and anonymisation logic can't drift between the two.
//
// Surfaces every CandidateProfile field the learner has consented to share
// (CandidateProfile.optInToDiscovery), EXCEPT linkedinUrl and portfolioUrl —
// those are direct external identity links and would defeat the
// "Candidate XXXX" anonymisation used everywhere else in this file.
function toCandidateProfile(learner: LearnerWithProgress) {
  const completed = learner.smProgress.filter(p => p.status === 'completed')
  const colScores = learner.smProgress.map(p => p.colScore?.percent).filter((p): p is number => p != null)
  const avgCOL = colScores.length > 0 ? colScores.reduce((a, b) => a + b, 0) / colScores.length : null
  const partsCompleted = ([1, 2, 3] as const).filter(part =>
    learner.smProgress.filter(p => p.partNumber === part).length === 5 &&
    learner.smProgress.filter(p => p.partNumber === part).every(p => p.status === 'completed')
  )
  const completionLevel =
    completed.length === 15 ? 'module' :
    partsCompleted.length > 0 ? 'part' :
    completed.length > 0 ? 'partial' : 'none'

  const completedModuleAt = completed.length === 15
    ? completed.reduce<Date | null>((latest, p) => {
        if (!p.completedAt) return latest
        return !latest || p.completedAt > latest ? p.completedAt : latest
      }, null)
    : null

  const cp = learner.candidateProfile
  const yesNo = (v: boolean | null | undefined) => v == null ? null : (v ? 'Yes' : 'No')

  return {
    id: learner.id,
    displayName: `Candidate ${learner.id.slice(-4).toUpperCase()}`,
    completionLevel,
    partsCompleted,
    smsCompleted: completed.length,
    avgCOLPercent: avgCOL,
    topSkillAreas: learner.smProgress.filter(p => (p.colScore?.percent ?? 0) >= 80).map(p => p.smTitle),
    completedModuleAt: completedModuleAt?.toISOString() ?? null,
    lastActiveAt: learner.lastActiveAt?.toISOString() ?? null,
    availableForRoles: cp?.optInToDiscovery ?? false,
    credentialIds: learner.certificates.map(c => c.credentialId),
    profileCompleted: cp != null && (cp.primaryTechArea != null || cp.experienceLevel != null || cp.highestQualification != null),

    // Section 1 — right to work & location
    rightToWorkUK: cp?.rightToWorkUK ?? null,
    visaSponsorshipNeeded: yesNo(cp?.visaSponsorshipNeeded),
    securityClearance: cp?.securityClearance ?? null,
    ukRegion: cp?.ukRegion ?? null,
    willingToRelocate: cp?.willingToRelocate ?? null,
    relocationRegions: cp?.relocationRegions ?? [],
    openToInternational: yesNo(cp?.openToInternational),
    hasDriversLicence: yesNo(cp?.hasDriversLicence),

    // Section 2 — interests
    primaryTechArea: cp?.primaryTechArea ?? null,
    secondaryTechAreas: cp?.secondaryTechAreas ?? [],
    climatePolicyInterests: cp?.climatePolicyInterests ?? [],
    functionalDisciplines: cp?.functionalDisciplines ?? [],
    targetRoleTypes: cp?.targetRoleTypes ?? [],
    preferredEmployerTypes: cp?.preferredEmployerTypes ?? [],
    companySizePreference: cp?.companySizePreference ?? null,

    // Section 3 — experience
    experienceLevel: cp?.experienceLevel ?? null,
    yearsInRenewables: cp?.yearsInRenewables ?? null,
    previousSector: cp?.previousSector ?? null,
    projectPhasesExp: cp?.projectPhasesExp ?? [],
    largestProjectScale: cp?.largestProjectScale ?? null,
    commercialRegimeExp: cp?.commercialRegimeExp ?? [],
    employmentStatus: cp?.employmentStatus ?? null,
    availability: cp?.availability ?? null,
    noticePeriod: cp?.noticePeriod ?? null,
    employmentTypePrefs: cp?.employmentTypePrefs ?? [],
    workArrangementPrefs: cp?.workArrangementPrefs ?? [],

    // Section 4 — qualifications
    highestQualification: cp?.highestQualification ?? null,
    qualificationSubject: cp?.qualificationSubject ?? null,
    professionalBodies: cp?.professionalBodies ?? [],
    charteredStatus: cp?.charteredStatus ?? null,
    safetyCertifications: cp?.safetyCertifications ?? [],
    technicalCertifications: cp?.technicalCertifications ?? [],

    // Section 5 — technical skills
    softwareSkills: (cp?.softwareSkills as Record<string, string> | null) ?? null,
    engineeringTools: cp?.engineeringTools ?? [],
    financialTools: cp?.financialTools ?? [],
    regulatoryKnowledge: cp?.regulatoryKnowledge ?? [],
    gridKnowledge: cp?.gridKnowledge ?? null,
    languages: (cp?.languages as Record<string, string> | null) ?? null,

    // Section 6 — sector specialism
    offshoreExpTypes: cp?.offshoreExpTypes ?? [],
    turbineOEMExp: cp?.turbineOEMExp ?? [],
    batteryChemistry: cp?.batteryChemistry ?? [],
    electrolyserTypes: cp?.electrolyserTypes ?? [],
    reactorTypes: cp?.reactorTypes ?? [],
    ccsTechTypes: cp?.ccsTechTypes ?? [],
    solarScaleExp: cp?.solarScaleExp ?? [],
    marineEnergyTypes: cp?.marineEnergyTypes ?? [],
    carbonEsgExp: cp?.carbonEsgExp ?? [],

    // Section 7 — professional track record
    clientManagementLevel: cp?.clientManagementLevel ?? null,
    technicalReportWriter: yesNo(cp?.technicalReportWriter),
    bidManagement: yesNo(cp?.bidManagement),
    teamLeadershipLevel: cp?.teamLeadershipLevel ?? null,
    budgetResponsibility: cp?.budgetResponsibility ?? null,
    financialModelling: yesNo(cp?.financialModelling),
    expertWitness: yesNo(cp?.expertWitness),
    hasPublications: yesNo(cp?.hasPublications),

    // Section 8 — career aspirations
    careerMotivations: cp?.careerMotivations ?? [],
    shortTermGoal: cp?.shortTermGoal ?? null,
  }
}

// Gated on CandidateProfile.optInToDiscovery — the real, learner-facing
// consent toggle (rc-v2-app profile Section 9, "Make my profile visible to
// employers"). NOT Learner.availableToEmployers: that column is a schema
// leftover from before the CandidateProfile consent model existed, nothing
// in the app ever sets it, and until this fix (10 Sep 2026 audit) every
// employer-facing query filtered on it — meaning the Talent Pool was
// permanently empty no matter what a learner opted into. Left the dead
// column in the schema rather than migrating it out mid-audit; flagged
// below as a known cleanup item.
async function getCandidateProfiles() {
  const candidates = await prisma.learner.findMany({
    where: { candidateProfile: { optInToDiscovery: true } },
    include: {
      smProgress: { include: { colScore: true } },
      certificates: { select: { credentialId: true, level: true } },
      candidateProfile: true,
    },
    take: 200,
  })
  return candidates.map(toCandidateProfile)
}

type CandidateShape = ReturnType<typeof toCandidateProfile>

// Tally helpers for the profile-stats breakdown endpoint — count how many
// opted-in candidates hold each value of a single-select field, or each
// value present across a multi-select (array) field. Null/empty entries
// (profile section not filled in) are dropped rather than shown as "—", so
// breakdowns reflect only candidates who actually answered that question.
function tally(values: (string | null | undefined)[]): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)
}

function tallyArrays(values: string[][]): { value: string; count: number }[] {
  return tally(values.flat())
}

export async function employerRoutes(app: FastifyInstance) {
  app.get('/api/employers/:id', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const employer = await prisma.employer.findUnique({ where: { id }, include: { jobRoles: true } })
    if (!employer) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Employer not found', statusCode: 404 } })
    return { data: employer, error: null }
  })

  app.get('/api/employers/:id/candidates', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const query = request.query as {
      completionLevel?: string; minCOL?: string; partCompleted?: string
      rightToWorkUK?: string; willingToRelocate?: string; ukRegion?: string
      primaryTechArea?: string; targetRoleType?: string; preferredEmployerType?: string
      experienceLevel?: string; employmentStatus?: string; availability?: string
      highestQualification?: string; professionalBody?: string; charteredStatus?: string
      turbineOEM?: string; offshoreExpType?: string; batteryChemistry?: string; solarScaleExp?: string
      careerMotivation?: string; teamLeadershipLevel?: string
    }
    let profiles = await getCandidateProfiles()

    if (query.completionLevel) profiles = profiles.filter(p => p.completionLevel === query.completionLevel)
    if (query.minCOL) {
      const min = Number(query.minCOL)
      profiles = profiles.filter(p => p.avgCOLPercent != null && p.avgCOLPercent >= min)
    }
    if (query.partCompleted) {
      const part = Number(query.partCompleted)
      profiles = profiles.filter(p => p.partsCompleted.includes(part as 1 | 2 | 3))
    }

    // Right to work & location
    if (query.rightToWorkUK) profiles = profiles.filter(p => p.rightToWorkUK === query.rightToWorkUK)
    if (query.willingToRelocate) profiles = profiles.filter(p => p.willingToRelocate === query.willingToRelocate)
    if (query.ukRegion) profiles = profiles.filter(p => p.ukRegion === query.ukRegion)

    // Interests
    if (query.primaryTechArea) {
      profiles = profiles.filter(p => p.primaryTechArea === query.primaryTechArea || p.secondaryTechAreas.includes(query.primaryTechArea as string))
    }
    if (query.targetRoleType) profiles = profiles.filter(p => p.targetRoleTypes.includes(query.targetRoleType as string))
    if (query.preferredEmployerType) profiles = profiles.filter(p => p.preferredEmployerTypes.includes(query.preferredEmployerType as string))

    // Experience
    if (query.experienceLevel) profiles = profiles.filter(p => p.experienceLevel === query.experienceLevel)
    if (query.employmentStatus) profiles = profiles.filter(p => p.employmentStatus === query.employmentStatus)
    if (query.availability) profiles = profiles.filter(p => p.availability === query.availability)

    // Qualifications
    if (query.highestQualification) profiles = profiles.filter(p => p.highestQualification === query.highestQualification)
    if (query.professionalBody) profiles = profiles.filter(p => p.professionalBodies.includes(query.professionalBody as string))
    if (query.charteredStatus) profiles = profiles.filter(p => p.charteredStatus === query.charteredStatus)

    // Sector specialism
    if (query.turbineOEM) profiles = profiles.filter(p => p.turbineOEMExp.includes(query.turbineOEM as string))
    if (query.offshoreExpType) profiles = profiles.filter(p => p.offshoreExpTypes.includes(query.offshoreExpType as string))
    if (query.batteryChemistry) profiles = profiles.filter(p => p.batteryChemistry.includes(query.batteryChemistry as string))
    if (query.solarScaleExp) profiles = profiles.filter(p => p.solarScaleExp.includes(query.solarScaleExp as string))

    // Track record & career aspirations
    if (query.teamLeadershipLevel) profiles = profiles.filter(p => p.teamLeadershipLevel === query.teamLeadershipLevel)
    if (query.careerMotivation) profiles = profiles.filter(p => p.careerMotivations.includes(query.careerMotivation as string))

    return { data: profiles, error: null }
  })

  app.get('/api/employers/:id/shortlist', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const shortlist = await prisma.shortlistedCandidate.findMany({ where: { employerId: id }, orderBy: { addedAt: 'desc' } })
    return { data: shortlist, error: null }
  })

  app.post('/api/employers/:id/shortlist', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { candidateId: string; roleId?: string; notes?: string }
    const entry = await prisma.shortlistedCandidate.create({
      data: { employerId: id, learnerId: body.candidateId, roleId: body.roleId ?? null, notes: body.notes ?? '', stage: 'interested' },
    })
    reply.code(201)
    return { data: entry, error: null }
  })

  app.patch('/api/employers/:id/shortlist/:candidateId', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id, candidateId } = request.params as { id: string; candidateId: string }
    const body = request.body as { stage: string; notes?: string }
    const updated = await prisma.shortlistedCandidate.update({
      where: { employerId_learnerId: { employerId: id, learnerId: candidateId } },
      data: { stage: body.stage as 'interested' | 'contacted' | 'interviewing' | 'offered' | 'hired', ...(body.notes !== undefined && { notes: body.notes }) },
    })
    return { data: updated, error: null }
  })

  app.get('/api/employers/:id/roles', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = request.query as { status?: string }
    const roles = await prisma.jobRole.findMany({
      where: { employerId: id, ...(query.status && { status: query.status as 'open' | 'filled' | 'paused' }) },
      orderBy: { postedAt: 'desc' },
    })
    return { data: roles, error: null }
  })

  app.post('/api/employers/:id/roles', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      title: string; department: string; requiredSMs?: number[]
      minCOLPercent?: number | null; minSMsCompleted?: number
    }
    if (!body.title?.trim() || !body.department?.trim()) {
      return reply.code(400).send({ error: { code: 'INVALID_BODY', message: 'title and department are required', statusCode: 400 } })
    }
    const role = await prisma.jobRole.create({
      data: {
        employerId: id,
        title: body.title.trim(),
        department: body.department.trim(),
        requiredSMs: body.requiredSMs ?? [],
        minCOLPercent: body.minCOLPercent ?? null,
        minSMsCompleted: body.minSMsCompleted ?? 0,
      },
    })
    reply.code(201)
    return { data: role, error: null }
  })

  app.patch('/api/employers/:id/roles/:roleId', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id, roleId } = request.params as { id: string; roleId: string }
    const body = request.body as {
      title?: string; department?: string; requiredSMs?: number[]
      minCOLPercent?: number | null; minSMsCompleted?: number; status?: 'open' | 'filled' | 'paused'
    }
    const existing = await prisma.jobRole.findUnique({ where: { id: roleId } })
    if (!existing || existing.employerId !== id) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Role not found', statusCode: 404 } })
    }
    const role = await prisma.jobRole.update({
      where: { id: roleId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.department !== undefined && { department: body.department.trim() }),
        ...(body.requiredSMs !== undefined && { requiredSMs: body.requiredSMs }),
        ...(body.minCOLPercent !== undefined && { minCOLPercent: body.minCOLPercent }),
        ...(body.minSMsCompleted !== undefined && { minSMsCompleted: body.minSMsCompleted }),
        ...(body.status !== undefined && { status: body.status }),
      },
    })
    return { data: role, error: null }
  })

  app.get('/api/employers/:id/talent-pool/stats', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [total, newThis, moduleComplete, colAgg, profiles] = await Promise.all([
      prisma.learner.count({ where: { candidateProfile: { optInToDiscovery: true } } }),
      prisma.learner.count({ where: { candidateProfile: { optInToDiscovery: true }, enrolledAt: { gte: thirtyDaysAgo } } }),
      prisma.certificate.count({ where: { level: 'module', learner: { candidateProfile: { optInToDiscovery: true } } } }),
      prisma.cOLScore.aggregate({ _avg: { percent: true }, where: { smProgress: { learner: { candidateProfile: { optInToDiscovery: true } } } } }),
      getCandidateProfiles(),
    ])

    const partComplete = profiles.filter(p => p.partsCompleted.length > 0).length

    // Per-SM coverage: how many available candidates completed each SM, and
    // their average COL score on it — drives the dashboard's coverage chart.
    const smRows = await prisma.sMProgress.findMany({
      where: { status: 'completed', learner: { candidateProfile: { optInToDiscovery: true } } },
      include: { colScore: true },
    })
    const smCoverage = SM_CURRICULUM.map(sm => {
      const rows = smRows.filter(r => r.smId === sm.id)
      const scores = rows.map(r => r.colScore?.percent).filter((p): p is number => p != null)
      return {
        smId: sm.id,
        smTitle: sm.title,
        partNumber: sm.partNumber,
        candidatesCompleted: rows.length,
        avgCOLPercent: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      }
    })

    return {
      data: {
        totalAvailable: total,
        newThisMonth: newThis,
        moduleComplete,
        partComplete,
        avgCOLPercent: colAgg._avg.percent ?? null,
        smCoverage,
      },
      error: null,
    }
  })

  // Aggregate breakdowns across every CandidateProfile section, for the
  // Insights page's "Candidate Profile Insights" charts. Each breakdown is a
  // { value, count }[] tally over the opted-in talent pool, sorted most-
  // common first — deliberately NOT hardcoded option lists, so a breakdown
  // only ever shows values candidates actually selected.
  app.get('/api/employers/:id/talent-pool/profile-stats', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const profiles = await getCandidateProfiles()
    const profilesCompleted = profiles.filter((p: CandidateShape) => p.profileCompleted).length

    return {
      data: {
        totalAvailable: profiles.length,
        profilesCompleted,
        rightToWork: {
          rightToWorkUK: tally(profiles.map((p: CandidateShape) => p.rightToWorkUK)),
          willingToRelocate: tally(profiles.map((p: CandidateShape) => p.willingToRelocate)),
          ukRegion: tally(profiles.map((p: CandidateShape) => p.ukRegion)),
          openToInternational: tally(profiles.map((p: CandidateShape) => p.openToInternational)),
        },
        interests: {
          primaryTechArea: tally(profiles.map((p: CandidateShape) => p.primaryTechArea)),
          targetRoleTypes: tallyArrays(profiles.map((p: CandidateShape) => p.targetRoleTypes)),
          preferredEmployerTypes: tallyArrays(profiles.map((p: CandidateShape) => p.preferredEmployerTypes)),
          climatePolicyInterests: tallyArrays(profiles.map((p: CandidateShape) => p.climatePolicyInterests)),
        },
        experience: {
          experienceLevel: tally(profiles.map((p: CandidateShape) => p.experienceLevel)),
          employmentStatus: tally(profiles.map((p: CandidateShape) => p.employmentStatus)),
          availability: tally(profiles.map((p: CandidateShape) => p.availability)),
          yearsInRenewables: tally(profiles.map((p: CandidateShape) => p.yearsInRenewables)),
          workArrangementPrefs: tallyArrays(profiles.map((p: CandidateShape) => p.workArrangementPrefs)),
        },
        qualifications: {
          highestQualification: tally(profiles.map((p: CandidateShape) => p.highestQualification)),
          professionalBodies: tallyArrays(profiles.map((p: CandidateShape) => p.professionalBodies)),
          charteredStatus: tally(profiles.map((p: CandidateShape) => p.charteredStatus)),
          safetyCertifications: tallyArrays(profiles.map((p: CandidateShape) => p.safetyCertifications)),
        },
        technicalSkills: {
          engineeringTools: tallyArrays(profiles.map((p: CandidateShape) => p.engineeringTools)),
          regulatoryKnowledge: tallyArrays(profiles.map((p: CandidateShape) => p.regulatoryKnowledge)),
          gridKnowledge: tally(profiles.map((p: CandidateShape) => p.gridKnowledge)),
        },
        sectorSpecialism: {
          offshoreExpTypes: tallyArrays(profiles.map((p: CandidateShape) => p.offshoreExpTypes)),
          turbineOEMExp: tallyArrays(profiles.map((p: CandidateShape) => p.turbineOEMExp)),
          batteryChemistry: tallyArrays(profiles.map((p: CandidateShape) => p.batteryChemistry)),
          solarScaleExp: tallyArrays(profiles.map((p: CandidateShape) => p.solarScaleExp)),
          marineEnergyTypes: tallyArrays(profiles.map((p: CandidateShape) => p.marineEnergyTypes)),
        },
        trackRecord: {
          clientManagementLevel: tally(profiles.map((p: CandidateShape) => p.clientManagementLevel)),
          teamLeadershipLevel: tally(profiles.map((p: CandidateShape) => p.teamLeadershipLevel)),
          technicalReportWriter: tally(profiles.map((p: CandidateShape) => p.technicalReportWriter)),
          bidManagement: tally(profiles.map((p: CandidateShape) => p.bidManagement)),
        },
        careerAspirations: {
          careerMotivations: tallyArrays(profiles.map((p: CandidateShape) => p.careerMotivations)),
        },
      },
      error: null,
    }
  })

  app.get('/api/employers/:id/dashboard', { preHandler: requireEmployerScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const [statsRes, shortlistRes, rolesRes, profiles] = await Promise.all([
      app.inject({ method: 'GET', url: `/api/employers/${id}/talent-pool/stats`, headers: request.headers }),
      app.inject({ method: 'GET', url: `/api/employers/${id}/shortlist`, headers: request.headers }),
      app.inject({ method: 'GET', url: `/api/employers/${id}/roles?status=open`, headers: request.headers }),
      getCandidateProfiles(),
    ])

    // Recently qualified: candidates with at least one completed SM, most
    // recently active first — surfaces new/growing talent-pool members
    // whether or not they've finished a full part yet.
    const recentlyQualified = profiles
      .filter((p: CandidateShape) => p.smsCompleted > 0)
      .sort((a: CandidateShape, b: CandidateShape) => {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 10)

    return {
      data: {
        stats: JSON.parse(statsRes.body).data,
        recentlyQualified,
        shortlisted: JSON.parse(shortlistRes.body).data,
        activeRoles: JSON.parse(rolesRes.body).data,
      },
      error: null,
    }
  })
}
