import { CalendarDays, Menu, Moon, Plus, Settings, Sun, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { lunarText } from '../lib/lunar'
import { useCalendarStore } from '../store/useCalendarStore'
import { IconButton } from './ui'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function Header({ onOpenMobileSidebar }: { onOpenMobileSidebar: () => void }) {
  const now = useClock()
  const prefs = useCalendarStore((s) => s.prefs)
  const setPrefs = useCalendarStore((s) => s.setPrefs)
  const openCreate = useCalendarStore((s) => s.openCreate)
  const setSettingsOpen = useCalendarStore((s) => s.setSettingsOpen)
  const setTrashOpen = useCalendarStore((s) => s.setTrashOpen)
  const deletedCount = useCalendarStore((s) => s.deletedEvents.length)

  const effectiveDark =
    prefs.theme === 'dark' ||
    (prefs.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  const pad = (n: number) => n.toString().padStart(2, '0')
  const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(now)
  const lunar = prefs.showLunar ? lunarText(now) : ''

  return (
    <header className="z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-[1680px] items-center gap-2 px-3 py-2.5 md:gap-3 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <CalendarDays size={19} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              个人日历
            </h1>
            <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">
              本地优先 · 无需登录 · 离线可用
            </p>
          </div>
        </div>

        <div className="ml-1 hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 md:flex dark:border-slate-800 dark:bg-slate-900/70">
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {timeText}
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-500 dark:text-slate-400">{dateText}</span>
          {lunar && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{lunar}</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 font-mono text-xs tabular-nums text-slate-500 md:hidden dark:text-slate-400">
            {timeText.slice(0, 5)}
          </span>
          <IconButton label="当日事项" onClick={onOpenMobileSidebar} className="lg:hidden">
            <Menu size={18} />
          </IconButton>
          <IconButton
            label={`回收站${deletedCount > 0 ? `（${deletedCount}）` : ''}`}
            badge={deletedCount}
            onClick={() => setTrashOpen(true)}
          >
            <Trash2 size={18} />
          </IconButton>
          <IconButton
            label={effectiveDark ? '切换到亮色模式' : '切换到暗色模式'}
            onClick={() => setPrefs({ theme: effectiveDark ? 'light' : 'dark' })}
          >
            {effectiveDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton label="设置" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />
          </IconButton>
          <button
            type="button"
            onClick={() => openCreate()}
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">新建事件</span>
          </button>
        </div>
      </div>
    </header>
  )
}
