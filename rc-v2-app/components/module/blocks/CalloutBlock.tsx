import { clsx } from 'clsx'
import type { CalloutBlock as CalloutBlockType } from '@/types'

const config = {
  'info':     { icon: '💡', classes: 'callout-info',     titleColor: 'text-blue-800' },
  'warning':  { icon: '⚠️', classes: 'callout-warning',  titleColor: 'text-amber-800' },
  'key-fact': { icon: '🌱', classes: 'callout-key-fact', titleColor: 'text-rc-green-600' },
  'quote':    { icon: '💬', classes: 'callout-quote',    titleColor: 'text-rc-dark' },
}

export function CalloutBlock({ variant, title, body }: Omit<CalloutBlockType, '_type' | '_key'>) {
  const { icon, classes, titleColor } = config[variant] ?? config['info']
  return (
    <div className={clsx('callout', classes, 'mb-6')}>
      {title && (
        <p className={clsx('font-heading font-bold text-sm mb-1', titleColor)}>
          {icon} {title}
        </p>
      )}
      <p className="text-sm leading-relaxed text-rc-dark">{body}</p>
    </div>
  )
}
