import type { CandidateProfile } from '@rc/types'
import { SelectField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section3Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="Background">
        <SelectField
          label="Experience level"
          value={data.experienceLevel}
          onChange={v => set('experienceLevel', v)}
          options={['Student / Graduate', '0–2 years', '2–5 years', '5–10 years', '10–15 years', '15–20 years', '20+ years']}
          placeholder="Select"
        />
        <SelectField
          label="Years working in renewables / clean energy"
          value={data.yearsInRenewables}
          onChange={v => set('yearsInRenewables', v)}
          options={['None (transitioning in)', 'Less than 1 year', '1–2 years', '3–5 years', '5–10 years', '10+ years']}
          placeholder="Select"
        />
        <SelectField
          label="Previous sector (if transitioning)"
          value={data.previousSector}
          onChange={v => set('previousSector', v)}
          options={['Oil & Gas', 'Power & Utilities', 'Construction', 'Finance', 'Consulting', 'Government', 'Academia', 'Other', 'N/A — always been in renewables']}
          placeholder="Select"
        />
      </FormSection>

      <FormSection title="Project experience">
        <MultiCheckbox
          label="Project phases experience"
          value={data.projectPhasesExp ?? []}
          onChange={v => set('projectPhasesExp', v)}
          options={[
            'Development & Consenting', 'Finance & Investment', 'Procurement',
            'Engineering Design', 'Construction / Installation', 'Commissioning',
            'Operations & Maintenance', 'Decommissioning',
          ]}
        />
        <SelectField
          label="Largest project scale you've worked on"
          value={data.largestProjectScale}
          onChange={v => set('largestProjectScale', v)}
          options={['<10 MW', '10–50 MW', '50–250 MW', '250 MW – 1 GW', '>1 GW']}
          placeholder="Select"
        />
        <MultiCheckbox
          label="Commercial regime experience"
          value={data.commercialRegimeExp ?? []}
          onChange={v => set('commercialRegimeExp', v)}
          options={['CfD', 'ROC', 'PPA', 'Merchant', 'Capacity Market', 'Subsidy-Free', 'International / Other']}
          cols={3}
        />
      </FormSection>

      <FormSection title="Availability">
        <SelectField
          label="Current employment status"
          value={data.employmentStatus}
          onChange={v => set('employmentStatus', v)}
          options={['Employed — actively looking', 'Employed — open to opportunities', 'Employed — not looking', 'Unemployed — available now', 'Freelance / Contractor', 'Student', 'On notice period']}
          placeholder="Select"
        />
        <SelectField
          label="Availability to start"
          value={data.availability}
          onChange={v => set('availability', v)}
          options={['Immediately', '1–4 weeks', '1–3 months', '3–6 months', 'Not actively looking']}
          placeholder="Select"
        />
        <SelectField
          label="Notice period"
          value={data.noticePeriod}
          onChange={v => set('noticePeriod', v)}
          options={['Immediate', '1 week', '2 weeks', '1 month', '2 months', '3 months', '6 months', 'Negotiable']}
          placeholder="Select"
        />
        <MultiCheckbox
          label="Employment type preferences"
          value={data.employmentTypePrefs ?? []}
          onChange={v => set('employmentTypePrefs', v)}
          options={['Permanent', 'Contract', 'Fixed-Term', 'Interim', 'Freelance', 'Part-Time']}
          cols={3}
        />
        <MultiCheckbox
          label="Work arrangement preferences"
          value={data.workArrangementPrefs ?? []}
          onChange={v => set('workArrangementPrefs', v)}
          options={['Fully Remote', 'Hybrid', 'Fully Office-Based', 'Site-Based']}
          cols={2}
        />
        <SelectField
          label="Salary expectation (optional)"
          value={data.salaryExpectation}
          onChange={v => set('salaryExpectation', v)}
          options={[
            'Prefer not to say', '<£30k', '£30–45k', '£45–60k', '£60–80k',
            '£80–100k', '£100–130k', '£130–160k', '£160k+',
            'Day rate: <£250', 'Day rate: £250–400', 'Day rate: £400–600', 'Day rate: £600+',
          ]}
          placeholder="Select (optional)"
        />
      </FormSection>
    </div>
  )
}
