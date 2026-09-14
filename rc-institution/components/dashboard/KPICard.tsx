interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'green' | 'amber' | 'red'
  icon?: string
}

const colorMap = {
  default: 'text-inst-slate',
  green:   'text-emerald-600',
  amber:   'text-amber-500',
  red:     'text-red-500',
}

export function KPICard({ label, value, sub, color = 'default', icon }: KPICardProps) {
  return (
    <div className="card p-5 flex flex-col gap-1.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-lg opacity-60">{icon}</span>}
      </div>
      <p className={`font-heading font-bold text-3xl leading-none ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
