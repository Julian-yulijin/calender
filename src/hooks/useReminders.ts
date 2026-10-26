import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { expandEvents } from '../lib/recurrence'
import { showBrowserNotification } from '../lib/notifications'
import { useCalendarStore } from '../store/useCalendarStore'

/**
 * 每分钟检查一次即将开始的事件：
 * - 页面内 Toast 提醒
 * - 若已授权，则发送浏览器通知
 */
export function useReminders() {
  const remindersEnabled = useCalendarStore((s) => s.prefs.remindersEnabled)
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!remindersEnabled) return

    const check = () => {
      const now = new Date()
      const events = useCalendarStore.getState().events
      const occurrences = expandEvents(
        events,
        new Date(now.getTime() - 60_000),
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      )

      for (const occ of occurrences) {
        if (occ.allDay) continue
        if (occ.event.completed) continue
        if (occ.event.reminderMinutes === null) continue
        if (notifiedRef.current.has(occ.key)) continue

        const startMs = occ.start.getTime()
        const windowStart = startMs - occ.event.reminderMinutes * 60_000
        const windowEnd = occ.event.reminderMinutes === 0 ? startMs + 60_000 : startMs
        const nowMs = now.getTime()

        if (nowMs >= windowStart && nowMs <= windowEnd) {
          notifiedRef.current.add(occ.key)
          const timeText = format(occ.start, 'HH:mm')
          showBrowserNotification(
            '日程提醒',
            `${occ.event.title} · ${timeText} 开始${
              occ.event.location ? ` · ${occ.event.location}` : ''
            }`,
            occ.key
          )
          useCalendarStore
            .getState()
            .pushToast(`提醒：${occ.event.title} · ${timeText} 开始`, 'info')
        }
      }
    }

    check()
    const timer = window.setInterval(check, 30_000)
    return () => window.clearInterval(timer)
  }, [remindersEnabled])
}
