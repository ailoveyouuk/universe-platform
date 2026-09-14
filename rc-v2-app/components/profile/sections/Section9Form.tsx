import type { CandidateProfile } from '@rc/types'
import { SelectField, ToggleField, FormSection } from '@/components/profile/FormControls'

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section9Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)
  const optedIn = data.optInToDiscovery === true

  return (
    <div className="space-y-8">
      {/* Privacy note */}
      <div className="p-5 rounded-xl border border-rc-border bg-white">
        <h3 className="font-heading font-semibold text-rc-dark mb-2 text-sm">How your data is used</h3>
        <ul className="space-y-2 text-sm text-rc-grey">
          <li className="flex items-start gap-2"><span className="text-rc-green mt-0.5">✓</span> Employers can search and filter anonymised profile attributes (skills, experience, location)</li>
          <li className="flex items-start gap-2"><span className="text-rc-green mt-0.5">✓</span> Your name and email are never shared without your explicit consent</li>
          <li className="flex items-start gap-2"><span className="text-rc-green mt-0.5">✓</span> You can hide your profile or delete it at any time</li>
          <li className="flex items-start gap-2"><span className="text-rc-grey-light mt-0.5">○</span> Salary expectations and contact details are only visible if you choose to share them</li>
        </ul>
      </div>

      <FormSection title="Discovery settings">
        <ToggleField
          label="Make my profile visible to employers"
          value={data.optInToDiscovery}
          onChange={v => set('optInToDiscovery', v)}
          description="When enabled, employers on the Renewables Connect platform can find your profile based on your skills and preferences. You can turn this off at any time."
          prominent
        />

        {optedIn && (
          <SelectField
            label="Profile visibility"
            value={data.profileVisibility}
            onChange={v => set('profileVisibility', v as CandidateProfile['profileVisibility'])}
            options={[
              { value: 'all',      label: 'All employers on the platform' },
              { value: 'partners', label: 'Only employers I apply to' },
              { value: 'hidden',   label: 'Hidden (opt-in overrides to visible)' },
            ]}
            placeholder="Select"
          />
        )}

        <ToggleField
          label="Allow employers to contact me directly"
          value={data.allowEmployerContact}
          onChange={v => set('allowEmployerContact', v)}
          description="Employers with a relevant role can send you a message through the platform. You choose whether to respond."
        />
      </FormSection>
    </div>
  )
}
