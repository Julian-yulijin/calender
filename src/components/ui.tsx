import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useEscapeKey } from '../lib/hooks'

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

export const selectClass = inputClass + ' appearance-none pr-8'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  badge?: number
}

export function IconButton({
  label,
  active,
  badge,
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${
        active ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : ''
      } ${className}`}
      {...rest}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className = ''
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}) {
  useEscapeKey(open, onClose)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const maxWidth = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl bg-white shadow-float animate-slide-up sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800`}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
