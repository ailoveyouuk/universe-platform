'use client'

import { useState }  from 'react'
import type { CandidateProfile } from '@rc/types'
import { MultiCheckbox } from '@/components/profile/FormControls'
import { clsx }          from 'clsx'

// ── Collapsible panel ─────────────────────────────────────────────────────────

function Collapsible({
  title, icon, children, filledCount,
}: {
  title: string; icon: string; children: React.ReactNode; filledCount: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-rc-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-rc-green-50 transition-colors duration-150 text-left"
      >
        <span className="text-xl flex-shrink-0">{icon}</span>
        <span className="flex-1 font-heading font-semibold text-rc-dark text-sm">{title}</span>
        {filledCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-rc-green text-white font-semibold mr-2">
            {filledCount} selected
          </span>
        )}
        <span className={clsx('text-rc-grey-light transition-transform duration-200', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-white border-t border-rc-border">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section6Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
        <strong>Optional section.</strong> These sub-fields are only relevant to candidates with deep expertise in a specific technology. Expand only the panels that apply to you.
      </div>

      <Collapsible
        title="Offshore Wind"
        icon="🌊"
        filledCount={(data.offshoreExpTypes?.length ?? 0) + (data.turbineOEMExp?.length ?? 0)}
      >
        <div className="space-y-5 mt-3">
          <MultiCheckbox
            label="Offshore wind experience types"
            value={data.offshoreExpTypes ?? []}
            onChange={v => set('offshoreExpTypes', v)}
            options={['Fixed Foundation', 'Floating', 'Offshore Substations', 'HVDC / HVAC', 'Subsea Cabling', 'Vessels & Marine Ops']}
          />
          <MultiCheckbox
            label="Turbine OEM experience"
            value={data.turbineOEMExp ?? []}
            onChange={v => set('turbineOEMExp', v)}
            options={['Vestas', 'Siemens Gamesa', 'GE Vernova', 'MHI Vestas', 'Mingyang', 'CSSC', 'Other']}
            cols={3}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Battery Storage"
        icon="🔋"
        filledCount={data.batteryChemistry?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="Battery chemistry experience"
            value={data.batteryChemistry ?? []}
            onChange={v => set('batteryChemistry', v)}
            options={['LFP', 'NMC', 'NCA', 'Solid-State', 'Flow Battery', 'Other']}
            cols={3}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Hydrogen"
        icon="⚗️"
        filledCount={data.electrolyserTypes?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="Electrolyser technology experience"
            value={data.electrolyserTypes ?? []}
            onChange={v => set('electrolyserTypes', v)}
            options={['PEM', 'Alkaline', 'SOEC', 'AEM', 'Other']}
            cols={3}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Nuclear"
        icon="⚛️"
        filledCount={data.reactorTypes?.length ?? 0}
      >
        <div className="space-y-3 mt-3">
          <p className="text-xs text-rc-grey-light">
            Note: certain nuclear roles require security clearance — see Section 1.
          </p>
          <MultiCheckbox
            label="Reactor types experience"
            value={data.reactorTypes ?? []}
            onChange={v => set('reactorTypes', v)}
            options={['PWR', 'BWR', 'AGR', 'SMR', 'AMR', 'Fusion (R&D)', 'Other']}
            cols={3}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Carbon Capture & Storage"
        icon="🏭"
        filledCount={data.ccsTechTypes?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="CCS technology experience"
            value={data.ccsTechTypes ?? []}
            onChange={v => set('ccsTechTypes', v)}
            options={['Post-Combustion Capture', 'Pre-Combustion Capture', 'Oxyfuel', 'DAC', 'BECCS', 'Geological Storage', 'Other']}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Solar"
        icon="☀️"
        filledCount={data.solarScaleExp?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="Solar project scale experience"
            value={data.solarScaleExp ?? []}
            onChange={v => set('solarScaleExp', v)}
            options={['Residential (<50 kW)', 'Commercial (50 kW – 1 MW)', 'Utility-Scale (>1 MW)', 'Agrivoltaics', 'Floating Solar']}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Marine Energy"
        icon="🌊"
        filledCount={data.marineEnergyTypes?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="Marine energy technology experience"
            value={data.marineEnergyTypes ?? []}
            onChange={v => set('marineEnergyTypes', v)}
            options={['Wave Energy Converters', 'Tidal Stream', 'Tidal Range', 'OTEC', 'Salinity Gradient']}
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Carbon & ESG"
        icon="🌍"
        filledCount={data.carbonEsgExp?.length ?? 0}
      >
        <div className="mt-3">
          <MultiCheckbox
            label="Carbon & ESG experience"
            value={data.carbonEsgExp ?? []}
            onChange={v => set('carbonEsgExp', v)}
            options={[
              'GHG Accounting (GHG Protocol)', 'Carbon Offsetting & Credits',
              'ESG Reporting (TCFD / CSRD)', 'Voluntary Carbon Markets',
              'Biodiversity Net Gain', 'Just Transition',
            ]}
          />
        </div>
      </Collapsible>
    </div>
  )
}
