import { CalendarDays, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CalendarView } from './components/CalendarView'
import { DaySidebar } from './components/DaySidebar'
import { EventDetailDrawer } from './components/EventDetailDrawer'
import { EventFormModal } from './components/EventFormModal'
import { FilterBar } from './components/FilterBar'
import { Header } from './components/Header'
import { SettingsModal } from './components/SettingsModal'
import { Toasts } from './components/Toasts'
import { TrashModal } from './components/TrashModal'
import { useReminders } from './hooks/useReminders'
import { useCalendarStore } from './store/useCalendarStore'

export default function App() {
  const init = useCalendarStore((s) => s.init)
  const ready = useCalendarStore((s) => s.ready)
  const prefsTheme = useCalendarStore((s) => s.prefs.theme)
  const detailId = useCalendarStore((s) => s.detailId)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    void init()
  }, [init])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark =
        prefsTheme === 'dark' || (prefsTheme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', dark ? '#020617' : '#4f46e5')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [prefsTheme])

  useEffect(() => {
    if (detailId) setMobileSidebarOpen(false)
  }, [detailId])

  useReminders()

  if (!ready) {
    return (
      <div className="flex h-app flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-float">
          <CalendarDays size={24} />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">个人日历</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={13} className="animate-spin" /> 正在读取本地数据…
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-app flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
      <FilterBar />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 min-h-0 gap-3 px-2 py-2 md:px-4 md:py-3">
        <div className="min-h-0 min-w-0 flex-1">
          <CalendarView />
        </div>
        <aside className="hidden w-80 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-panel lg:block xl:w-96 dark:border-slate-800">
          <DaySidebar />
        </aside>
      </main>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-[78vh] overflow-hidden rounded-t-2xl bg-white shadow-float animate-slide-up dark:bg-slate-900">
            <DaySidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <EventFormModal />
      <EventDetailDrawer />
      <SettingsModal />
      <TrashModal />
      <Toasts />
    </div>
  )
}
