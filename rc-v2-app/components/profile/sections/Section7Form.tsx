import type { CandidateProfile } from '@rc/types'
import { SelectField, ToggleField, FormSection } from '@/components/profile/FormControls'

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section7Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="Leadership &amp; management">
        <SelectField
          label="Client management level"
          value={data.clientManagementLevel}
          onChange={v => set('clientManagementLevel', v)}
          options={[
            'None', 'Junior (supporting client meetings)',
            'Intermediate (lead on smaller clients)', 'Senior (key account management)',
            'Director-level client relationships',
          ]}
          placeholder="Select"
        />
        <SelectField
          label="Team leadership experience"
          value={data.teamLeadershipLevel}
          onChange={v => set('teamLeadershipLevel', v)}
          options={['Individual contributor', 'Led 1–5 people', 'Led 5–20 people', 'Led 20+ people']}
          placeholder="Select"
        />
        <SelectField
          label="Budget responsibility"
          value={data.budgetResponsibility}
          onChange={v => set('budgetResponsibility', v)}
          options={['No budget responsibility', '<£1m', '£1–5m', '£5–20m', '£20–100m', '£100m+']}
          placeholder="Select"
        />
      </FormSection>

      <FormSection title="Specialist capabilities">
        <ToggleField
          label="Technical report writer"
          value={data.technicalReportWriter}
          onChange={v => set('technicalReportWriter', v)}
          description="Experience writing formal technical reports, studies, or EIAs"
        />
        <ToggleField
          label="Bid / tender management"
          value={data.bidManagement}
          onChange={v => set('bidManagement', v)}
          description="Experience leading or contributing to contract bids or tenders"
        />
        <ToggleField
          label="Financial modelling"
          value={data.financialModelling}
          onChange={v => set('financialModelling', v)}
          description="Experience building or working with project finance or valuation models"
        />
        <ToggleField
          label="Expert witness / arbitration"
          value={data.expertWitness}
          onChange={v => set('expertWitness', v)}
          description="Experience providing expert testimony or technical opinions in legal proceedings"
        />
        <ToggleField
          label="Published work"
          value={data.hasPublications}
          onChange={v => set('hasPublications', v)}
          description="Academic papers, industry reports, or notable public-facing work"
        />
      </FormSection>
    </div>
  )
}
