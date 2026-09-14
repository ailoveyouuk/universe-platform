import type { CandidateProfile } from '@rc/types'
import { SelectField, TextField, TextareaField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section4Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="Academic qualifications">
        <SelectField
          label="Highest qualification"
          value={data.highestQualification}
          onChange={v => set('highestQualification', v)}
          options={['GCSE / O-Level', 'A-Level / HND / HNC', "Bachelor's Degree", "Master's Degree", 'PhD / Doctorate', 'Professional Qualification', 'Trade Apprenticeship', 'Other']}
          placeholder="Select"
        />
        <TextField
          label="Qualification subject / discipline"
          value={data.qualificationSubject}
          onChange={v => set('qualificationSubject', v)}
          placeholder="e.g. Mechanical Engineering, Environmental Science"
        />
      </FormSection>

      <FormSection title="Professional memberships">
        <MultiCheckbox
          label="Professional bodies"
          value={data.professionalBodies ?? []}
          onChange={v => set('professionalBodies', v)}
          options={['IMechE', 'IET', 'ICE', 'EI (Energy Institute)', 'RICS', 'CIWEM', 'CIOB', 'SPE', 'IEEE', 'SUT', 'Other']}
        />
        <SelectField
          label="Chartered status"
          value={data.charteredStatus}
          onChange={v => set('charteredStatus', v)}
          options={['Not chartered', 'Working towards chartership', 'Chartered', 'Fellow']}
          placeholder="Select"
        />
      </FormSection>

      <FormSection title="Certifications">
        <MultiCheckbox
          label="Safety certifications"
          value={data.safetyCertifications ?? []}
          onChange={v => set('safetyCertifications', v)}
          options={['BOSIET / HUET', 'GWO BST', 'OPITO', 'CSCS', 'NEBOSH', 'First Aid', 'Other']}
        />
        <MultiCheckbox
          label="Technical / professional certifications"
          value={data.technicalCertifications ?? []}
          onChange={v => set('technicalCertifications', v)}
          options={['PMP / PRINCE2', 'Data Analytics / Python', 'Financial Modelling', 'ArcGIS / GIS', 'ISO Standards Auditor', 'Other']}
        />
        <TextareaField
          label="Other certifications (optional)"
          value={data.otherCertifications}
          onChange={v => set('otherCertifications', v)}
          maxLength={300}
          rows={3}
          placeholder="Any other relevant certifications not listed above"
        />
      </FormSection>
    </div>
  )
}
