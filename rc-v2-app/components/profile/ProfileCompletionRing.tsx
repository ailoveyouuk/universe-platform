interface ProfileCompletionRingProps {
  pct:     number
  size?:   number
  stroke?: number
  dark?:   boolean   // true = white text (for dark hero bg)
}

export function ProfileCompletionRing({ pct, size = 120, stroke = 9, dark = false }: ProfileCompletionRingProps) {
  const R   = (size - stroke) / 2
  const C   = 2 * Math.PI * R
  const arc = Math.min(pct / 100, 1) * C

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none"
          stroke={dark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none"
          stroke="#82BC00"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={dark ? 'font-heading font-bold text-white leading-none' : 'font-heading font-bold text-rc-dark leading-none'}
          style={{ fontSize: size * 0.22 }}
        >
          {pct}<span style={{ fontSize: size * 0.13 }}>%</span>
        </span>
        <span
          className={dark ? 'text-white/50 mt-1 uppercase tracking-wider' : 'text-rc-grey-light mt-1 uppercase tracking-wider'}
          style={{ fontSize: size * 0.09 }}
        >
          done
        </span>
      </div>
    </div>
  )
}
