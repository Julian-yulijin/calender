export type EventColor = 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'

export type Priority = 'low' | 'normal' | 'high'

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  freq: RecurrenceFreq
  interval: number
  /** ISO 日期（yyyy-MM-dd），含当天 */
  until?: string | null
  /** 1=周一 ... 7=周日，仅 weekly 使用 */
  byWeekday?: number[]
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  allDay: boolean
  tags: string[]
  color: EventColor
  priority: Priority
  location: string
  reminderMinutes: number | null
  completed: boolean
  important: boolean
  pinned: boolean
  recurrence: RecurrenceRule | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  /** 0=正常 1=已删除，用于 IndexedDB 索引 */
  deletedFlag: 0 | 1
}

export type EventInput = Omit<
  CalendarEvent,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedFlag'
>

export interface AttachmentRecord {
  id: string
  eventId: string
  name: string
  type: string
  size: number
  blob: Blob
  createdAt: string
}

export interface AttachmentMeta {
  id: string
  eventId: string
  name: string
  type: string
  size: number
  createdAt: string
}

export type AttachmentKind = 'image' | 'document' | 'other'

export interface Occurrence {
  key: string
  event: CalendarEvent
  start: Date
  end: Date
  allDay: boolean
  recurring: boolean
}

export type CalendarViewKey = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'

export interface DateRangeFilter {
  from: string | null
  to: string | null
}

export type QuickFilter = 'all' | 'today' | 'week' | 'hasAttachment' | 'important' | 'incomplete'

export interface Filters {
  query: string
  quick: QuickFilter
  tags: string[]
  colors: EventColor[]
  attachmentKind: AttachmentKind | 'any'
  range: DateRangeFilter
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system'
  defaultView: CalendarViewKey
  remindersEnabled: boolean
  defaultReminder: number | null
  showLunar: boolean
  weekStartsOn: 0 | 1
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  action?: { label: string; run: () => void }
}
