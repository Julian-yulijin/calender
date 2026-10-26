import { getISODay } from 'date-fns'

export function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Date -> 'yyyy-MM-dd' （本地时区） */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Date -> 'yyyy-MM-ddTHH:mm'，用于 datetime-local 输入框 */
export function toLocalInput(date: Date): string {
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string): Date {
  return new Date(value)
}

/** 任意输入解析为 Date，非法则返回 null */
export function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' && value) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

export function startOfDayISO(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function endOfDayISO(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function humanDuration(start: Date, end: Date): string {
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days} 天 ${restHours} 小时` : `${days} 天`
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function isoWeekdayOf(date: Date): number {
  return getISODay(date)
}

export function relativeDayLabel(date: Date): string {
  const today = new Date()
  const diffDays = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  )
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  return ''
}
