import type { AttachmentKind, CalendarViewKey, EventColor, Priority } from '../types'

export const EVENT_COLORS: { key: EventColor; label: string; hex: string; soft: string }[] = [
  { key: 'indigo', label: '靛蓝', hex: '#4f46e5', soft: '#eef2ff' },
  { key: 'sky', label: '天蓝', hex: '#0284c7', soft: '#e0f2fe' },
  { key: 'emerald', label: '翠绿', hex: '#059669', soft: '#d1fae5' },
  { key: 'amber', label: '琥珀', hex: '#d97706', soft: '#fef3c7' },
  { key: 'rose', label: '玫红', hex: '#e11d48', soft: '#ffe4e6' },
  { key: 'violet', label: '紫罗兰', hex: '#7c3aed', soft: '#ede9fe' },
  { key: 'slate', label: '石墨', hex: '#475569', soft: '#e2e8f0' }
]

export function colorHex(color: EventColor): string {
  return EVENT_COLORS.find((c) => c.key === color)?.hex ?? EVENT_COLORS[0].hex
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  normal: '普通',
  high: '高'
}

export const VIEW_LABELS: Record<CalendarViewKey, string> = {
  dayGridMonth: '月',
  timeGridWeek: '周',
  timeGridDay: '日',
  listWeek: '议程'
}

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind | 'any', string> = {
  any: '全部类型',
  image: '图片',
  document: '文档',
  other: '其他'
}

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '不提醒' },
  { value: 0, label: '准时' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' }
]

export const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' }
]

export const PREFS_KEY = 'calendar.prefs.v1'

export const DEFAULT_PREFS = {
  theme: 'system',
  defaultView: 'dayGridMonth',
  remindersEnabled: true,
  defaultReminder: 15,
  showLunar: false,
  weekStartsOn: 1
} as const
