import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useCalendarStore } from '../store/useCalendarStore'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
}

const COLORS = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-brand-600 dark:text-brand-300'
}

export function Toasts() {
  const toasts = useCalendarStore((s) => s.toasts)
  const dismissToast = useCalendarStore((s) => s.dismissToast)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-float animate-slide-up dark:border-slate-700 dark:bg-slate-900"
          >
            <Icon size={17} className={`shrink-0 ${COLORS[toast.type]}`} />
            <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run()
                  dismissToast(toast.id)
                }}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/15"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
