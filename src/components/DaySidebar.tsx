import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Paperclip,
  Repeat,
  Star,
  X
} from 'lucide-react'
import { useMemo } from 'react'
import { colorHex, PRIORITY_LABELS } from '../lib/constants'
import { buildAttachmentMap, matchesFilters, occurrencesOnDay } from '../lib/filters'
import { lunarText } from '../lib/lunar'
import { expandEvents } from '../lib/recurrence'
import { relativeDayLabel } from '../lib/dates'
import { useCalendarStore } from '../store/useCalendarStore'
import type { AttachmentMeta, Occurrence } from '../types'
import { IconButton } from './ui'

export function DaySidebar({ onClose }: { onClose?: () => void }) {
  const events = useCalendarStore((s) => s.events)
  const attachments = useCalendarStore((s) => s.attachments)
  const filters = useCalendarStore((s) => s.filters)
  const selectedDate = useCalendarStore((s) => s.selectedDate)
  const prefs = useCalendarStore((s) => s.prefs)
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate)
  const openCreate = useCalendarStore((s) => s.openCreate)
  const openDetail = useCalendarStore((s) => s.openDetail)
  const updateEvent = useCalendarStore((s) => s.updateEvent)

  const attachmentMap = useMemo(() => buildAttachmentMap(attachments), [attachments])

  const dayOccurrences = useMemo(() => {
    const all = expandEvents(events, startOfDay(selectedDate), endOfDay(selectedDate))
    return occurrencesOnDay(all, selectedDate)
      .filter((occ) => matchesFilters(occ, filters, attachmentMap))
      .sort((a, b) => {
        if (a.event.pinned !== b.event.pinned) return a.event.pinned ? -1 : 1
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
        return a.start.getTime() - b.start.getTime()
      })
  }, [events, selectedDate, filters, attachmentMap])

  const today = new Date()

  const stats = useMemo(() => {
    const todayList = occurrencesOnDay(
      expandEvents(events, startOfDay(today), endOfDay(today)),
      today
    )
    const weekList = expandEvents(
      events,
      startOfWeek(today, { weekStartsOn: prefs.weekStartsOn }),
      endOfWeek(today, { weekStartsOn: prefs.weekStartsOn })
    )
    const pendingList = expandEvents(events, today, addDays(today, 60)).filter(
      (occ) => !occ.event.completed
    )
    const pendingEvents = new Set(pendingList.map((occ) => occ.event.id))
    const overdueMap = new Map<string, Occurrence>()
    const overdueOccurrences = expandEvents(events, subDays(today, 60), today)
      .filter((occ) => !occ.event.completed && occ.end < today)
      .sort((a, b) => b.end.getTime() - a.end.getTime())
    for (const occ of overdueOccurrences) {
      if (!overdueMap.has(occ.event.id)) overdueMap.set(occ.event.id, occ)
    }
    const overdueList = [...overdueMap.values()]
    return {
      today: todayList.length,
      week: weekList.length,
      pending: pendingEvents.size,
      overdue: overdueList.length,
      overdueList: overdueList.slice(0, 4)
    }
  }, [events, today, prefs.weekStartsOn])

  const todayTodos = useMemo(() => {
    if (isSameDay(selectedDate, today)) return []
    return occurrencesOnDay(expandEvents(events, startOfDay(today), endOfDay(today)), today)
      .filter((occ) => !occ.event.completed)
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
        return a.start.getTime() - b.start.getTime()
      })
  }, [events, selectedDate, today])

  const isToday = isSameDay(selectedDate, today)
  const relative = relativeDayLabel(selectedDate)
  const dayTitle = format(selectedDate, 'M月d日', { locale: zhCN })
  const weekday = format(selectedDate, 'EEEE', { locale: zhCN })
  const lunar = prefs.showLunar ? lunarText(selectedDate) : ''

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900/60">
      <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {dayTitle} · {weekday}
            </h2>
            {relative && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                {relative}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {lunar ? `${lunar} · ` : ''}
            {isToday ? '当天事件与待办' : '该日事件'}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton
            label="前一天"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="h-7 w-7"
          >
            <ChevronLeft size={15} />
          </IconButton>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-500/15"
          >
            今天
          </button>
          <IconButton
            label="后一天"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-7 w-7"
          >
            <ChevronRight size={15} />
          </IconButton>
          {onClose && (
            <IconButton label="关闭侧栏" onClick={onClose} className="h-7 w-7 lg:hidden">
              <X size={16} />
            </IconButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <Stat label="今日" value={stats.today} tone="default" />
        <Stat label="本周" value={stats.week} tone="default" />
        <Stat label="待办" value={stats.pending} tone="brand" />
        <Stat label="过期" value={stats.overdue} tone="rose" />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isToday ? '当天事项' : '当日事项'} · {dayOccurrences.length}
          </p>
          <button
            type="button"
            onClick={() => {
              const start = new Date(selectedDate)
              if (isToday && start < today) {
                start.setHours(today.getHours() + 1, 0, 0, 0)
              } else {
                start.setHours(9, 0, 0, 0)
              }
              openCreate(start, new Date(start.getTime() + 3600000))
            }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/15"
          >
            <CalendarPlus size={13} /> 添加
          </button>
        </div>

        {dayOccurrences.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
            <Clock size={20} className="text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              这一天还没有安排
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">点击日历空白处或右上角「添加」新建事件</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {dayOccurrences.map((occ) => (
              <SidebarEvent
                key={occ.key}
                occ={occ}
                attachments={attachmentMap.get(occ.event.id) ?? []}
                onOpen={() => openDetail(occ.event.id)}
                onToggleComplete={() =>
                  void updateEvent(occ.event.id, { completed: !occ.event.completed })
                }
              />
            ))}
          </ul>
        )}

        {todayTodos.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              今日待办 · {todayTodos.length}
            </p>
            <ul className="space-y-1.5">
              {todayTodos.map((occ) => (
                <li key={`todo-${occ.key}`}>
                  <button
                    type="button"
                    onClick={() => openDetail(occ.event.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-2.5 py-2 text-left hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                  >
                    <Circle size={12} className="shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {occ.event.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400">
                      {occ.allDay ? '全天' : format(occ.start, 'HH:mm')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.overdueList.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-500/80">
              <AlertTriangle size={11} /> 已过期 · {stats.overdue}
            </p>
            <ul className="space-y-1.5">
              {stats.overdueList.map((occ) => (
                <li key={`overdue-${occ.key}`}>
                  <button
                    type="button"
                    onClick={() => openDetail(occ.event.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50/60 px-2.5 py-2 text-left hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:hover:bg-rose-500/15"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {occ.event.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-rose-500/80">
                      {format(occ.end, 'M/d')} 截止
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {stats.overdue > stats.overdueList.length && (
              <p className="mt-1 text-[10px] text-slate-400">
                还有 {stats.overdue - stats.overdueList.length} 个过期事项，可在筛选中查看
              </p>
            )}
          </div>
        )}

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <p className="font-semibold text-slate-600 dark:text-slate-300">隐私提示</p>
          <p>所有事件与附件只保存在此浏览器的本地数据库，不会上传到任何服务器。</p>
          <p className="mt-1">建议定期在「设置 → 数据与备份」中导出 ZIP 备份。</p>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone: 'default' | 'brand' | 'rose'
}) {
  const valueClass =
    tone === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'brand'
        ? 'text-brand-600 dark:text-brand-300'
        : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-lg bg-slate-50 px-1.5 py-1.5 text-center dark:bg-slate-800/50">
      <div className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}

function SidebarEvent({
  occ,
  attachments,
  onOpen,
  onToggleComplete
}: {
  occ: Occurrence
  attachments: AttachmentMeta[]
  onOpen: () => void
  onToggleComplete: () => void
}) {
  const event = occ.event
  const timeLabel = occ.allDay ? '全天' : format(occ.start, 'HH:mm')
  const endLabel = occ.allDay ? '' : format(occ.end, 'HH:mm')
  const rangeLabel = occ.allDay ? '全天' : `${timeLabel} – ${endLabel}`

  return (
    <li>
      <div className="group flex items-start gap-2 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50">
        <button
          type="button"
          aria-label={event.completed ? '标记为未完成' : '标记为已完成'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete()
          }}
          className="mt-0.5 shrink-0"
        >
          {event.completed ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <Circle size={16} className="text-slate-300 hover:text-brand-500 dark:text-slate-600" />
          )}
        </button>
        <span
          className="mt-1 h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: colorHex(event.color) }}
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            <span
              className={`min-w-0 truncate text-xs font-semibold ${
                event.completed
                  ? 'text-slate-400 line-through dark:text-slate-500'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {event.title}
            </span>
            {event.important && <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />}
            {occ.recurring && <Repeat size={10} className="shrink-0 text-slate-400" />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">{rangeLabel}</span>
            {event.priority === 'high' && (
              <span className="text-rose-500">优先级 {PRIORITY_LABELS.high}</span>
            )}
            {attachments.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip size={9} /> {attachments.length}
              </span>
            )}
            {event.location && <span className="max-w-[9rem] truncate">{event.location}</span>}
          </div>
          {event.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>
    </li>
  )
}
