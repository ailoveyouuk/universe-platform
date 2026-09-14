import { prisma } from './prismaClient'
import type { Institution } from '../../generated/prisma'

// The name a self-enrolled learner's placeholder institution is created
// and looked up under. Not a separate flag column on Institution — this
// is the one synthetic row, matched by name, so there's nothing extra to
// keep in sync if it's ever renamed in rc-admin (rename here too).
const INDIVIDUAL_LEARNERS_NAME = 'Individual Learners'

// Every learner who registers with no matching LearnerInvite (the original,
// fully self-service path) used to end up with institutionId: null —
// correct for access purposes (they get no sponsored AccessGrant either
// way) but it meant rc-admin's institution list had no home for them, and
// there was no Institution row to hang runtime branding off for a learner
// who isn't sponsored by anyone. This gives them one, lazily: the first
// self-enrolled learner ever creates the row, every one after reuses it.
// Its primaryColor is left at the schema default (the standard RC green),
// so an "Individual Learner" sees exactly the branding they always did —
// this only matters once an institution sets its own primaryColor.
export async function getOrCreateIndividualLearnersInstitution(): Promise<Institution> {
  const existing = await prisma.institution.findFirst({ where: { name: INDIVIDUAL_LEARNERS_NAME } })
  if (existing) return existing

  return prisma.institution.create({
    data: {
      name: INDIVIDUAL_LEARNERS_NAME,
      shortName: 'Individual',
      type: 'ACADEMIC',
      overview: 'Placeholder institution for learners who signed up directly, with no sponsoring institution, training provider or employer.',
      status: 'active',
    },
  })
}

export interface InstitutionBrand {
  id: string
  name: string
  shortName: string
  primaryColor: string
  logoUrl: string | null
}

// What the learner apps actually need to brand a page — never the full
// Institution row (which carries contact details, partner-tier/CRM fields
// etc. that are none of a learner's business).
export function shapeInstitutionBrand(institution: Institution | null): InstitutionBrand | null {
  if (!institution) return null
  return {
    id: institution.id,
    name: institution.name,
    shortName: institution.shortName,
    primaryColor: institution.primaryColor,
    logoUrl: institution.logoUrl,
  }
}
