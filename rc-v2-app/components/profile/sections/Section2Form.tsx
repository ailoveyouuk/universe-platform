import type { CandidateProfile } from '@rc/types'
import { SelectField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

const TECH_AREAS = [
  'Fixed Offshore Wind', 'Floating Offshore Wind', 'Onshore Wind', 'Solar PV',
  'Nuclear', 'Hydrogen', 'Battery Storage', 'Carbon Capture & Storage',
  'Biomass & Bioenergy', 'Hydropower', 'Marine / Tidal / Wave',
  'Carbon & ESG', 'Grid & Networks', 'Energy Efficiency',
]

const CLIMATE_POLICY = [
  'Climate Policy', 'Carbon Markets', 'Voluntary Carbon', 'Energy Regulation',
  'International Development', 'Just Transition', 'Net Zero Strategy',
]

const DISCIPLINES = [
  'Engineering', 'Project Management', 'Finance & Investment', 'Legal',
  'Policy & Regulation', 'Business Development', 'Operations & Maintenance',
  'Procurement & Supply Chain', 'Environmental & Sustainability',
  'Data & Analytics', 'Research & Innovation', 'Marketing & Communications',
  'HR & Recruitment',
]

const ROLE_TYPES = ['Permanent', 'Contract', 'Fixed-Term', 'Interim', 'Freelance', 'Graduate / Entry Level', 'Internship']

const EMPLOYER_TYPES = [
  'Offshore Wind Developer', 'Onshore Wind Developer', 'Solar Developer', 'Nuclear Operator',
  'Hydrogen Company', 'Energy Storage Company', 'CCS Company', 'Grid / Network Operator',
  'Consultancy', 'Law Firm', 'Investment / Finance', 'Government / Regulator',
  'NGO / Third Sector', 'OEM / Manufacturer',
]

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section2Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="Technology focus">
        <SelectField
          label="Primary technology area"
          value={data.primaryTechArea}
          onChange={v => set('primaryTechArea', v)}
          options={TECH_AREAS}
          placeholder="Select your main area"
        />
        <MultiCheckbox
          label="Secondary technology areas"
          value={data.secondaryTechAreas ?? []}
          onChange={v => set('secondaryTechAreas', v)}
          options={TECH_AREAS}
          hint="All areas you have meaningful interest or experience in"
        />
        <MultiCheckbox
          label="Climate policy interests"
          value={data.climatePolicyInterests ?? []}
          onChange={v => set('climatePolicyInterests', v)}
          options={CLIMATE_POLICY}
        />
      </FormSection>

      <FormSection title="Role preferences">
        <MultiCheckbox
          label="Functional disciplines"
          value={data.functionalDisciplines ?? []}
          onChange={v => set('functionalDisciplines', v)}
          options={DISCIPLINES}
          hint="What do you do? Select all that apply"
        />
        <MultiCheckbox
          label="Target role types"
          value={data.targetRoleTypes ?? []}
          onChange={v => set('targetRoleTypes', v)}
          options={ROLE_TYPES}
        />
      </FormSection>

      <FormSection title="Employer preferences">
        <MultiCheckbox
          label="Preferred employer types"
          value={data.preferredEmployerTypes ?? []}
          onChange={v => set('preferredEmployerTypes', v)}
          options={EMPLOYER_TYPES}
        />
        <SelectField
          label="Preferred company size"
          value={data.companySizePreference}
          onChange={v => set('companySizePreference', v)}
          options={['Start-up (<50)', 'SME (50–250)', 'Mid-size (250–1,000)', 'Large (1,000+)', 'No preference']}
          placeholder="Select"
        />
      </FormSection>
    </div>
  )
}
