import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number       // 0–100
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ value, showLabel = false, size = 'md', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-rc-grey-light">Progress</span>
          <span className="text-rc-green font-medium">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx(
          'w-full bg-rc-border rounded-full overflow-hidden',
          size === 'sm' ? 'h-1' : 'h-2',
        )}
      >
        <div
          className="h-full bg-rc-green rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
