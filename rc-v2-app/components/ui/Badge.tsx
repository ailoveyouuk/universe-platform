import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'grey' | 'blue' | 'amber' | 'dark'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-rc-green-50 text-rc-green-600 border border-rc-green/30',
  grey:  'bg-gray-100 text-rc-grey border border-rc-border',
  blue:  'bg-blue-50 text-blue-700 border border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  dark:  'bg-rc-dark text-white',
}

export function Badge({ children, variant = 'grey', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variantClasses[variant],
      className,
    )}>
      {children}
    </span>
  )
}
