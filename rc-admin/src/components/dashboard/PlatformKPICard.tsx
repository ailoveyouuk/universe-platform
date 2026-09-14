interface PlatformKPICardProps {
  label: string
  value: string | number
  sub?: string
  delta?: string
  deltaPositive?: boolean
  accent?: 'default' | 'green' | 'gold' | 'blue' | 'red'
  icon?: string
}

const accentClass: Record<string, string> = {
  default: 'text-adm-bg',
  green:   'text-rc-green-dark',
  gold:    'text-adm-gold',
  blue:    'text-sky-600',
  red:     'text-red-600',
}

export function PlatformKPICard({ label, value, sub, delta, deltaPositive, accent = 'default', icon }: PlatformKPICardProps) {
  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        {icon && <span className="text-base opacity-40">{icon}</span>}
      </div>
      <p className={`font-heading font-bold text-3xl leading-none ${accentClass[accent]}`}>{value}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
        {delta && (
          <span className={`text-xs font-medium ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>
    </div>
  )
}
