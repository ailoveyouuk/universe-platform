// Re-export profile types from the shared @rc/types package.
// ProfileSection is a local utility type not in the shared package.
export type {
  CandidateProfile,
  CandidateProfileSummary,
  SoftwareSkill,
  LanguageSkill,
} from '@rc/types'

// ProfileSectionCompletion from @rc/types has different field names — define a
// normalised local version used by completion.ts and the profile UI.
export interface ProfileSectionCompletion {
  section:   number
  completed: number
  total:     number
  pct:       number
}

export type ProfileSection = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface LocalProfileSummary {
  overallPct:       number
  sectionsComplete: number
  sections:         ProfileSectionCompletion[]
}
