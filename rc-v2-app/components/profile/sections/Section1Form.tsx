import type { CandidateProfile } from '@rc/types'
import { SelectField, TextField, ToggleField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

const UK_REGIONS = [
  'London', 'South East', 'South West', 'East of England', 'East Midlands',
  'West Midlands', 'Yorkshire & Humber', 'North West', 'North East',
  'Scotland', 'Wales', 'Northern Ireland', 'Other / International',
]

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section1Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)
  const showRelocation = data.willingToRelocate === 'Yes' || data.willingToRelocate === 'Open to it'

  return (
    <div className="space-y-8">
      <FormSection title="Right to work &amp; security">
        <SelectField
          label="Right to work in the UK"
          value={data.rightToWorkUK}
          onChange={v => set('rightToWorkUK', v)}
          options={['British / Irish Citizen', 'EU Settled Status', 'Skilled Worker Visa', 'Graduate Visa', 'Other Work Permission', 'None']}
        />
        <ToggleField
          label="Visa sponsorship needed"
          value={data.visaSponsorshipNeeded}
          onChange={v => set('visaSponsorshipNeeded', v)}
          description="Would you require an employer to sponsor a visa?"
        />
        <SelectField
          label="Security clearance held"
          value={data.securityClearance}
          onChange={v => set('securityClearance', v)}
          options={['None', 'BPSS', 'CTC', 'SC', 'DV', 'NSV DV']}
          placeholder="Select clearance level"
        />
      </FormSection>

      <FormSection title="Location">
        <SelectField
          label="Years resident in the UK"
          value={data.ukResidencyYears}
          onChange={v => set('ukResidencyYears', v)}
          options={['Less than 1 year', '1–2 years', '3–5 years', '5–10 years', '10+ years', 'Not UK resident']}
          placeholder="Select"
        />
        <TextField
          label="Country of residence"
          value={data.countryOfResidence}
          onChange={v => set('countryOfResidence', v)}
          placeholder="e.g. United Kingdom, Germany, Singapore"
        />
        <SelectField
          label="UK region"
          value={data.ukRegion}
          onChange={v => set('ukRegion', v)}
          options={UK_REGIONS}
          placeholder="Select region"
        />
      </FormSection>

      <FormSection title="Mobility">
        <SelectField
          label="Willing to relocate?"
          value={data.willingToRelocate}
          onChange={v => set('willingToRelocate', v)}
          options={['Yes', 'Open to it', 'No', 'Already planning to']}
          placeholder="Select"
        />
        {showRelocation && (
          <MultiCheckbox
            label="Preferred relocation regions"
            value={data.relocationRegions ?? []}
            onChange={v => set('relocationRegions', v)}
            options={['UK-wide', ...UK_REGIONS]}
          />
        )}
        <ToggleField
          label="Open to international roles"
          value={data.openToInternational}
          onChange={v => set('openToInternational', v)}
        />
        <ToggleField
          label="Hold a full driver's licence"
          value={data.hasDriversLicence}
          onChange={v => set('hasDriversLicence', v)}
        />
      </FormSection>
    </div>
  )
}
