'use client'

import { useState }  from 'react'
import type { CandidateProfile, SoftwareSkill, LanguageSkill } from '@rc/types'
import { SelectField, MultiCheckbox, FormSection } from '@/components/profile/FormControls'

// ── Dynamic software skills list ──────────────────────────────────────────────

const SW_PROFICIENCIES: SoftwareSkill['proficiency'][] = ['beginner', 'proficient', 'expert']
const LABEL: Record<SoftwareSkill['proficiency'], string> = {
  beginner: 'Beginner', proficient: 'Proficient', expert: 'Expert',
}

function SoftwareSkillsEditor({
  value,
  onChange,
}: {
  value:    SoftwareSkill[]
  onChange: (v: SoftwareSkill[]) => void
}) {
  const [tool, setTool]       = useState('')
  const [prof, setProf]       = useState<SoftwareSkill['proficiency']>('proficient')

  const add = () => {
    if (!tool.trim()) return
    onChange([...value, { toolName: tool.trim(), proficiency: prof }])
    setTool('')
    setProf('proficient')
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-rc-dark">Software &amp; tools</label>

      {/* Existing items */}
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 bg-rc-green-50 border border-rc-green rounded-lg">
              <span className="flex-1 text-sm font-medium text-rc-dark">{s.toolName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rc-green text-white font-semibold capitalize">
                {LABEL[s.proficiency]}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-rc-grey-light hover:text-red-500 transition-colors text-sm ml-1"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={tool}
          onChange={e => setTool(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="e.g. AutoCAD, Python, WindFarmer"
          className="flex-1 px-3 py-2 bg-white border border-rc-border rounded-lg text-sm text-rc-dark focus:outline-none focus:ring-2 focus:ring-rc-green focus:border-transparent"
        />
        <select
          value={prof}
          onChange={e => setProf(e.target.value as SoftwareSkill['proficiency'])}
          className="px-3 py-2 bg-white border border-rc-border rounded-lg text-sm text-rc-dark focus:outline-none focus:ring-2 focus:ring-rc-green focus:border-transparent"
        >
          {SW_PROFICIENCIES.map(p => <option key={p} value={p}>{LABEL[p]}</option>)}
        </select>
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 bg-rc-green text-white text-sm font-medium rounded-lg hover:bg-rc-green-600 transition-colors"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-rc-grey-light">Press Enter or click Add after typing a tool name</p>
    </div>
  )
}

// ── Dynamic languages list ────────────────────────────────────────────────────

const LANG_PROFS: LanguageSkill['proficiency'][] = ['basic', 'conversational', 'professional', 'native']
const LANG_LABEL: Record<LanguageSkill['proficiency'], string> = {
  basic: 'Basic', conversational: 'Conversational', professional: 'Professional', native: 'Native',
}

function LanguagesEditor({
  value,
  onChange,
}: {
  value:    LanguageSkill[]
  onChange: (v: LanguageSkill[]) => void
}) {
  const [lang, setLang] = useState('')
  const [prof, setProf] = useState<LanguageSkill['proficiency']>('conversational')

  const add = () => {
    if (!lang.trim()) return
    onChange([...value, { language: lang.trim(), proficiency: prof }])
    setLang('')
    setProf('conversational')
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-rc-dark">Languages (other than English)</label>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((l, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 bg-rc-green-50 border border-rc-green rounded-lg">
              <span className="flex-1 text-sm font-medium text-rc-dark">{l.language}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rc-green text-white font-semibold capitalize">
                {LANG_LABEL[l.proficiency]}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-rc-grey-light hover:text-red-500 transition-colors text-sm ml-1"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={lang}
          onChange={e => setLang(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="e.g. German, French, Mandarin"
          className="flex-1 px-3 py-2 bg-white border border-rc-border rounded-lg text-sm text-rc-dark focus:outline-none focus:ring-2 focus:ring-rc-green focus:border-transparent"
        />
        <select
          value={prof}
          onChange={e => setProf(e.target.value as LanguageSkill['proficiency'])}
          className="px-3 py-2 bg-white border border-rc-border rounded-lg text-sm text-rc-dark focus:outline-none focus:ring-2 focus:ring-rc-green focus:border-transparent"
        >
          {LANG_PROFS.map(p => <option key={p} value={p}>{LANG_LABEL[p]}</option>)}
        </select>
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 bg-rc-green text-white text-sm font-medium rounded-lg hover:bg-rc-green-600 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface Props {
  data:     Partial<CandidateProfile>
  onChange: (u: Partial<CandidateProfile>) => void
}

export function Section5Form({ data, onChange }: Props) {
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => onChange({ [k]: v } as Partial<CandidateProfile>)

  return (
    <div className="space-y-8">
      <FormSection title="Software &amp; tools">
        <SoftwareSkillsEditor
          value={data.softwareSkills ?? []}
          onChange={v => set('softwareSkills', v)}
        />
        <MultiCheckbox
          label="Engineering tools"
          value={data.engineeringTools ?? []}
          onChange={v => set('engineeringTools', v)}
          options={['AutoCAD', 'Civil 3D', 'Revit', 'StruCad', 'DNV GL tools', 'OpenFAST / FAST', 'MATLAB', 'Python', 'R', 'ArcGIS', 'Other']}
        />
        <MultiCheckbox
          label="Financial tools"
          value={data.financialTools ?? []}
          onChange={v => set('financialTools', v)}
          options={['Excel / VBA', 'Python', 'Bloomberg Terminal', 'Argus', 'Other financial models']}
        />
      </FormSection>

      <FormSection title="Regulatory &amp; grid knowledge">
        <MultiCheckbox
          label="Regulatory knowledge"
          value={data.regulatoryKnowledge ?? []}
          onChange={v => set('regulatoryKnowledge', v)}
          options={[
            'UK Planning (NSIP)', 'Environmental Impact Assessment', 'Offshore Licensing',
            'Grid Connection Process', 'CfD Process', 'Energy Act 2023', 'EU Taxonomy', 'Other',
          ]}
        />
        <SelectField
          label="Electricity grid knowledge level"
          value={data.gridKnowledge}
          onChange={v => set('gridKnowledge', v)}
          options={['None', 'Basic awareness', 'Intermediate', 'Advanced', 'Expert']}
          placeholder="Select"
        />
      </FormSection>

      <FormSection title="Languages">
        <LanguagesEditor
          value={data.languages ?? []}
          onChange={v => set('languages', v)}
        />
      </FormSection>
    </div>
  )
}
