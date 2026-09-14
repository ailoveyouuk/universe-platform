import Link          from 'next/link'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ProfileSectionCompletion } from '@/types/profile'

const SECTION_META: Record<number, { name: string; icon: string; description: string }> = {
  1: { name: 'Who I am',             icon: '👤', description: 'Right to work, location, relocation' },
  2: { name: 'My interests',         icon: '🎯', description: 'Tech areas, disciplines, employer preferences' },
  3: { name: 'My experience',        icon: '💼', description: 'Seniority, renewables background, availability' },
  4: { name: 'My qualifications',    icon: '🎓', description: 'Degrees, professional bodies, certifications' },
  5: { name: 'My technical skills',  icon: '⚙️', description: 'Software, tools, languages, grid knowledge' },
  6: { name: 'My sector specialism', icon: '🌱', description: 'Deep expertise by technology area' },
  7: { name: 'My track record',      icon: '📈', description: 'Leadership, budget, client management' },
  8: { name: 'My career aspirations',icon: '🚀', description: 'Motivations, goals, personal statement' },
  9: { name: 'Visibility & consent', icon: '👁️', description: 'Control who can find your profile' },
}

interface SectionCardProps {
  completion: ProfileSectionCompletion
}

export function SectionCard({ completion }: SectionCardProps) {
  const { section, pct } = completion
  const meta = SECTION_META[section]
  const done = pct === 100

  return (
    <div className="bg-white rounded-xl border border-rc-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col p-5 gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rc-green-50 flex items-center justify-center flex-shrink-0 text-lg">
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading font-semibold text-sm text-rc-dark truncate">{meta.name}</p>
            {done && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-rc-green text-white flex-shrink-0">
                ✓
              </span>
            )}
          </div>
          <p className="text-xs text-rc-grey-light mt-0.5 leading-tight">{meta.description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-rc-grey-light">Section {section} of 9</span>
          <span className={done ? 'text-rc-green font-semibold' : 'text-rc-grey font-medium'}>{pct}%</span>
        </div>
        <ProgressBar value={pct} size="sm" />
      </div>

      {/* CTA */}
      <Link
        href={`/profile/${section}`}
        className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 border border-rc-green text-rc-green hover:bg-rc-green hover:text-white"
      >
        {done ? 'Review' : pct > 0 ? 'Continue' : 'Start'}
        <span>→</span>
      </Link>
    </div>
  )
}

export { SECTION_META }
