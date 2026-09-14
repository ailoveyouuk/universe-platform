import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  fullWidth?: boolean
  children:  React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-rc-green text-white hover:bg-rc-green-600 shadow-sm',
  outline: 'border border-rc-green text-rc-green hover:bg-rc-green-50 bg-transparent',
  ghost:   'text-rc-grey hover:text-rc-dark hover:bg-rc-bg-main bg-transparent',
  danger:  'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(clsx(
        'inline-flex items-center justify-center gap-2',
        'font-body font-medium transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-rc-green focus-visible:ring-offset-2 focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      ))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
