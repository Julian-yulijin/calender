import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  getISODay,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek
} from 'date-fns'
import type { CalendarEvent, Occurrence } from '../types'

const MAX_ITERATIONS = 800

/**
 * 把（可能重复的）事件按时间范围展开成可渲染的 occurrences。
 * rangeStart 含，rangeEnd 不含。
 */
export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): Occurrence[] {
  const result: Occurrence[] = []

  for (const event of events) {
    if (event.deletedAt) continue
    const baseStart = new Date(event.startAt)
    const baseEnd = new Date(event.endAt)
    if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) continue

    if (!event.recurrence) {
      if (baseStart < rangeEnd && baseEnd > rangeStart) {
        result.push(toOccurrence(event, baseStart, baseEnd, false))
      }
      continue
    }

    const rule = event.recurrence
    const interval = Math.max(1, rule.interval || 1)
    const duration = Math.max(0, baseEnd.getTime() - baseStart.getTime())
    const until = rule.until ? endOfDay(new Date(`${rule.until}T00:00:00`)) : null
    const cap = until && until < rangeEnd ? until : rangeEnd

    const push = (occStart: Date) => {
      if (isBefore(occStart, startOfDay(baseStart))) return
      if (isAfter(occStart, cap)) return
      const occEnd = new Date(occStart.getTime() + duration)
      if (occStart < rangeEnd && occEnd > rangeStart) {
        result.push(toOccurrence(event, occStart, occEnd, true))
      }
    }

    if (rule.freq === 'daily') {
      const baseDay = startOfDay(baseStart).getTime()
      const rangeDay = startOfDay(rangeStart).getTime()
      const skipDays = Math.max(0, Math.floor((rangeDay - baseDay) / 86400000))
      const firstIndex = Math.max(0, Math.floor(skipDays / interval) - 1)
      for (let i = firstIndex; i < firstIndex + MAX_ITERATIONS; i++) {
        const occStart = addDays(baseStart, i * interval)
        if (isAfter(occStart, cap)) break
        push(occStart)
      }
    } else if (rule.freq === 'weekly') {
      const weekdays =
        rule.byWeekday && rule.byWeekday.length > 0
          ? [...new Set(rule.byWeekday)].sort((a, b) => a - b)
          : [getISODay(baseStart)]
      const weekStart = startOfWeek(baseStart, { weekStartsOn: 1 })
      const rangeWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 })
      const skipWeeks = Math.max(
        0,
        Math.floor((rangeWeekStart.getTime() - weekStart.getTime()) / (7 * 86400000))
      )
      const firstWeek = Math.max(0, Math.floor(skipWeeks / interval) - 1)
      for (let w = firstWeek; w < firstWeek + MAX_ITERATIONS; w++) {
        const currentWeek = addWeeks(weekStart, w * interval)
        if (isAfter(currentWeek, cap)) break
        for (const weekday of weekdays) {
          const occStart = addDays(currentWeek, weekday - 1)
          push(occStart)
        }
      }
    } else {
      const monthDiff =
        (rangeStart.getFullYear() - baseStart.getFullYear()) * 12 +
        (rangeStart.getMonth() - baseStart.getMonth())
      const firstIndex = Math.max(0, Math.floor(monthDiff / interval) - 1)
      for (let i = firstIndex; i < firstIndex + MAX_ITERATIONS; i++) {
        const occStart = addMonths(baseStart, i * interval)
        if (isAfter(occStart, cap)) break
        push(occStart)
      }
    }
  }

  return result.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    return a.start.getTime() - b.start.getTime()
  })
}

function toOccurrence(
  event: CalendarEvent,
  start: Date,
  end: Date,
  recurring: boolean
): Occurrence {
  return {
    key: `${event.id}::${start.toISOString()}`,
    event,
    start,
    end,
    allDay: event.allDay,
    recurring
  }
}

export function occurrenceStartISO(occ: Occurrence): string {
  return occ.start.toISOString()
}
