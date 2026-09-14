'use client'

import { clsx } from 'clsx'

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls = [
  'w-full px-3 py-2.5 bg-white border border-rc-border rounded-lg text-sm text-rc-dark',
  'focus:outline-none focus:ring-2 focus:ring-rc-green focus:border-transparent',
  'disabled:opacity-50',
].join(' ')

// ── SelectField ───────────────────────────────────────────────────────────────

type SelectOption = string | { value: string; label: string }

interface SelectFieldProps {
  label:       string
  value:       string | undefined
  onChange:    (v: string) => void
  options:     SelectOption[]
  placeholder?: string
  hint?:        string
}

export function SelectField({ label, value, onChange, options, placeholder, hint }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-rc-dark mb-1.5">{label}</label>
      {hint && <p className="text-xs text-rc-grey-light mb-1.5">{hint}</p>}
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map(opt => {
          const v = typeof opt === 'string' ? opt : opt.value
          const l = typeof opt === 'string' ? opt : opt.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </div>
  )
}

// ── TextField ─────────────────────────────────────────────────────────────────

interface TextFieldProps {
  label:       string
  value:       string | undefined
  onChange:    (v: string) => void
  placeholder?: string
  hint?:        string
  type?:        string
}

export function TextField({ label, value, onChange, placeholder, hint, type = 'text' }: TextFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-rc-dark mb-1.5">{label}</label>
      {hint && <p className="text-xs text-rc-grey-light mb-1.5">{hint}</p>}
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )
}

// ── TextareaField ─────────────────────────────────────────────────────────────

interface TextareaFieldProps {
  label:    string
  value:    string | undefined
  onChange: (v: string) => void
  maxLength: number
  rows?:    number
  hint?:    string
  placeholder?: string
}

export function TextareaField({ label, value, onChange, maxLength, rows = 4, hint, placeholder }: TextareaFieldProps) {
  const current = (value ?? '').length
  return (
    <div>
      <label className="block text-sm font-medium text-rc-dark mb-1.5">{label}</label>
      {hint && <p className="text-xs text-rc-grey-light mb-1.5">{hint}</p>}
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value.slice(0, maxLength))}
        rows={rows}
        placeholder={placeholder}
        className={clsx(inputCls, 'resize-none')}
      />
      <p className={clsx('text-xs mt-1 text-right', current >= maxLength ? 'text-amber-500' : 'text-rc-grey-light')}>
        {current} / {maxLength}
      </p>
    </div>
  )
}

// ── ToggleField ───────────────────────────────────────────────────────────────

interface ToggleFieldProps {
  label:       string
  value:       boolean | undefined
  onChange:    (v: boolean) => void
  description?: string
  prominent?:  boolean
}

export function ToggleField({ label, value, onChange, description, prominent }: ToggleFieldProps) {
  const on = value === true
  return (
    <div className={clsx(
      'flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors duration-150',
      prominent
        ? on ? 'border-rc-green bg-rc-green-50' : 'border-rc-border bg-white'
        : 'border-rc-border bg-white',
    )}>
      <div className="flex-1">
        <p className={clsx('text-sm font-medium', prominent ? 'text-base font-semibold text-rc-dark' : 'text-rc-dark')}>
          {label}
        </p>
        {description && <p className="text-xs text-rc-grey-light mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={clsx(
          'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5',
          on ? 'bg-rc-green' : 'bg-rc-border',
        )}
      >
        <span className={clsx(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
          on ? 'left-6' : 'left-1',
        )} />
      </button>
    </div>
  )
}

// ── MultiCheckbox ─────────────────────────────────────────────────────────────

interface MultiCheckboxProps {
  label:      string
  value:      string[]
  onChange:   (v: string[]) => void
  options:    string[]
  maxSelect?: number
  hint?:      string
  cols?:      1 | 2 | 3
}

export function MultiCheckbox({ label, value, onChange, options, maxSelect, hint, cols = 2 }: MultiCheckboxProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else if (!maxSelect || value.length < maxSelect) {
      onChange([...value, opt])
    }
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <label className="block text-sm font-medium text-rc-dark">{label}</label>
        {maxSelect && (
          <span className="text-xs text-rc-grey-light">(max {maxSelect})</span>
        )}
      </div>
      {hint && <p className="text-xs text-rc-grey-light mb-2">{hint}</p>}
      <div className={clsx(
        'grid gap-2',
        cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
      )}>
        {options.map(opt => {
          const checked  = value.includes(opt)
          const disabled = !checked && !!maxSelect && value.length >= maxSelect
          return (
            <label
              key={opt}
              className={clsx(
                'flex items-center gap-2.5 cursor-pointer p-2 rounded-lg border transition-colors duration-100',
                checked  ? 'border-rc-green bg-rc-green-50 text-rc-dark'
                         : 'border-rc-border bg-white text-rc-grey hover:border-rc-green',
                disabled && 'opacity-40 cursor-default',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt)}
                className="w-4 h-4 rounded border-rc-border text-rc-green focus:ring-rc-green accent-[#82BC00]"
              />
              <span className="text-sm leading-tight">{opt}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── FormSection ───────────────────────────────────────────────────────────────

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h2 className="font-heading font-semibold text-rc-dark text-base border-b border-rc-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}
