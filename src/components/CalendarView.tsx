import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { addDays } from 'date-fns'
import type { DatesSetArg, EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core'
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import { ChevronLeft, ChevronRight, Loader2, Paperclip, Pin, Plus, Repeat, Star } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { colorHex, VIEW_LABELS } from '../lib/constants'
import { isEditableTarget } from '../lib/hooks'
import { expandEvents } from '../lib/recurrence'
import { buildAttachmentMap, hasActiveFilters, matchesFilters } from '../lib/filters'
import { useCalendarStore } from '../store/useCalendarStore'
import type { CalendarViewKey } from '../types'

const VIEW_KEYS: CalendarViewKey[] = ['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null)
  const events = useCalendarStore((s) => s.events)
  const attachments = useCalendarStore((s) => s.attachments)
  const filters = useCalendarStore((s) => s.filters)
  const view = useCalendarStore((s) => s.view)
  const prefs = useCalendarStore((s) => s.prefs)
  const loading = useCalendarStore((s) => s.loading)
  const setView = useCalendarStore((s) => s.setView)
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate)
  const openCreate = useCalendarStore((s) => s.openCreate)
  const openDetail = useCalendarStore((s) => s.openDetail)
  const updateEvent = useCalendarStore((s) => s.updateEvent)
  const pushToast = useCalendarStore((s) => s.pushToast)

  const [range, setRange] = useState(() => ({
    start: addDays(new Date(), -45),
    end: addDays(new Date(), 75)
  }))
  const [title, setTitle] = useState('')

  const attachmentMap = useMemo(() => buildAttachmentMap(attachments), [attachments])

  const occurrences = useMemo(
    () => expandEvents(events, range.start, range.end),
    [events, range.start, range.end]
  )

  const filtered = useMemo(
    () => occurrences.filter((occ) => matchesFilters(occ, filters, attachmentMap)),
    [occurrences, filters, attachmentMap]
  )

  const fcEvents = useMemo(
    () =>
      filtered.map((occ) => {
        const hex = colorHex(occ.event.color)
        const attachmentCount = attachmentMap.get(occ.event.id)?.length ?? 0
        return {
          id: occ.key,
          title: occ.event.title,
          start: occ.start,
          end: occ.end,
          allDay: occ.allDay,
          backgroundColor: hex,
          borderColor: hex,
          textColor: '#ffffff',
          editable: !occ.recurring && !occ.event.completed,
          extendedProps: {
            eventId: occ.event.id,
            recurring: occ.recurring,
            completed: occ.event.completed,
            important: occ.event.important,
            pinned: occ.event.pinned,
            attachmentCount
          }
        }
      }),
    [filtered, attachmentMap]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 't') {
        e.preventDefault()
        calendarRef.current?.getApi().today()
        setSelectedDate(new Date())
      } else if (key === 'n') {
        e.preventDefault()
        openCreate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openCreate, setSelectedDate])

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({ start: arg.start, end: arg.end })
    setTitle(arg.view.title)
  }

  const handleDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.date)
    const start = new Date(arg.date)
    if (arg.allDay) start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    openCreate(start, end)
  }

  const handleEventClick = (arg: EventClickArg) => {
    openDetail(arg.event.extendedProps.eventId as string)
  }

  const handleDropOrResize = async (arg: EventDropArg | EventResizeDoneArg) => {
    const eventId = arg.event.extendedProps.eventId as string
    const recurring = arg.event.extendedProps.recurring as boolean
    if (recurring) {
      arg.revert()
      pushToast('重复事件请通过编辑修改时间，避免只改动单个实例', 'info')
      return
    }
    const start = arg.event.start
    if (!start) {
      arg.revert()
      return
    }
    const allDay = arg.event.allDay
    let end: Date
    if (arg.event.end) {
      end = allDay ? new Date(arg.event.end.getTime() - 1) : arg.event.end
    } else {
      end = allDay
        ? new Date(new Date(start).setHours(23, 59, 59, 999))
        : new Date(start.getTime() + 60 * 60 * 1000)
    }
    if (end <= start) end = new Date(start.getTime() + 30 * 60 * 1000)
    const saved = await updateEvent(eventId, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay
    })
    if (saved) setSelectedDate(start)
  }

  const handleViewChange = (next: CalendarViewKey) => {
    calendarRef.current?.getApi().changeView(next)
    setView(next)
  }

  const renderEventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as {
      completed: boolean
      important: boolean
      attachmentCount: number
      recurring: boolean
      pinned: boolean
    }
    return (
      <div className={`fc-event-custom ${props.completed ? 'is-completed' : ''}`}>
        {arg.timeText && (
          <span className="fc-event-time">
            {props.recurring && <Repeat size={9} />}
            {arg.timeText}
          </span>
        )}
        <span className="fc-event-title">{arg.event.title}</span>
        <span className="fc-event-badges">
          {props.pinned && <Pin size={10} />}
          {props.attachmentCount > 0 && <Paperclip size={10} />}
          {props.important && <Star size={10} className="fill-current" />}
        </span>
      </div>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-panel dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            aria-label="上一页"
            onClick={() => calendarRef.current?.getApi().prev()}
            className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              calendarRef.current?.getApi().today()
              setSelectedDate(new Date())
            }}
            className="h-8 border-x border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="回到今天（快捷键 T）"
          >
            今天
          </button>
          <button
            type="button"
            aria-label="下一页"
            onClick={() => calendarRef.current?.getApi().next()}
            className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>

        {hasActiveFilters(filters) && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            筛选结果 {filtered.length}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {VIEW_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleViewChange(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  view === key
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {VIEW_LABELS[key]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
            title="新建事件（快捷键 N）"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">新建</span>
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-1.5 pb-1.5 pt-1">
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] dark:bg-slate-950/40">
            <Loader2 size={22} className="animate-spin text-brand-600" />
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={prefs.defaultView}
          initialDate={new Date()}
          locale={zhCnLocale}
          firstDay={prefs.weekStartsOn}
          headerToolbar={false}
          height="100%"
          expandRows
          nowIndicator
          editable
          eventResizableFromStart
          allDaySlot
          slotDuration="00:30:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayMaxEvents={3}
          fixedWeekCount={false}
          events={fcEvents}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleDropOrResize}
          eventResize={handleDropOrResize}
          eventAllow={(_dropInfo, draggedEvent) =>
            !draggedEvent || !draggedEvent.extendedProps.recurring
          }
          eventContent={renderEventContent}
          eventClassNames={(arg) => {
            const props = arg.event.extendedProps
            const classes: string[] = []
            if (props.completed) classes.push('opacity-60')
            return classes
          }}
          dayCellClassNames="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
        />
      </div>
    </section>
  )
}
