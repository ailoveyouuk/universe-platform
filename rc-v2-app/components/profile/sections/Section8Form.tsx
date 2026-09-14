import type { CandidateProfile } from '@rc/types'
import { TextField, TextareaField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

const MOTIVATIONS = [
  'Drive meaningful climate impact', 'Build technical expertise',
  'Leadership & management', 'Entrepreneurship & innovation',
  'International experience', 'Work-life balance',
  'Financial reward', 'Sector-wide recognition',
  'Research & academia', 'Policy influence',
]

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section8Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="What drives you">
        <MultiCheckbox
          label="Career motivations"
          value={data.careerMotivations ?? []}
          onChange={v => set('careerMotivations', v)}
          options={MOTIVATIONS}
          maxSelect={3}
          hint="Choose up to 3 that best reflect what matters most to you"
        />
        <TextareaField
          label="Short-term career goal"
          value={data.shortTermGoal}
          onChange={v => set('shortTermGoal', v)}
          maxLength={150}
          rows={3}
          placeholder="What are you aiming to achieve in the next 1–2 years?"
        />
      </FormSection>

      <FormSection title="Personal statement">
        <TextareaField
          label="Personal statement"
          value={data.personalStatement}
          onChange={v => set('personalStatement', v)}
          maxLength={500}
          rows={6}
          placeholder="Introduce yourself to employers — your background, what makes you distinctive, and what you're looking for"
        />
      </FormSection>

      <FormSection title="Online presence (optional)">
        <p className="text-xs text-rc-grey-light -mt-3">
          These fields are optional and help employers learn more about you.
          They are only shared if you opt in to discovery.
        </p>
        <TextField
          label="LinkedIn URL"
          value={data.linkedinUrl}
          onChange={v => set('linkedinUrl', v)}
          placeholder="https://linkedin.com/in/yourname"
          type="url"
        />
        <TextField
          label="Portfolio / personal website URL"
          value={data.portfolioUrl}
          onChange={v => set('portfolioUrl', v)}
          placeholder="https://yoursite.com"
          type="url"
        />
      </FormSection>
    </div>
  )
}
