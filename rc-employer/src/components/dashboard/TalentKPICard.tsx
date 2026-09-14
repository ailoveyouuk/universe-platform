interface TalentKPICardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'default' | 'blue' | 'green' | 'amber'
  icon?: string
}

const accentMap = {
  default: 'text-emp-navy',
  blue:    'text-emp-accent',
  green:   'text-emerald-600',
  amber:   'text-amber-500',
}

export function TalentKPICard({ label, value, sub, accent = 'default', icon }: TalentKPICardProps) {
  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-lg opacity-50">{icon}</span>}
      </div>
      <p className={`font-heading font-bold text-3xl leading-none ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
