import { endOfDay, endOfWeek, startOfDay, startOfWeek } from 'date-fns'
import type { AttachmentMeta, Filters, Occurrence } from '../types'
import { attachmentKind } from './attachments'
import { toDateKey } from './dates'

export function defaultFilters(): Filters {
  return {
    query: '',
    quick: 'all',
    tags: [],
    colors: [],
    attachmentKind: 'any',
    range: { from: null, to: null }
  }
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.quick !== 'all' ||
    filters.tags.length > 0 ||
    filters.colors.length > 0 ||
    filters.attachmentKind !== 'any' ||
    !!filters.range.from ||
    !!filters.range.to
  )
}

export function buildAttachmentMap(
  attachments: AttachmentMeta[]
): Map<string, AttachmentMeta[]> {
  const map = new Map<string, AttachmentMeta[]>()
  for (const meta of attachments) {
    const list = map.get(meta.eventId)
    if (list) list.push(meta)
    else map.set(meta.eventId, [meta])
  }
  return map
}

export function matchesFilters(
  occ: Occurrence,
  filters: Filters,
  attachmentsByEvent: Map<string, AttachmentMeta[]>
): boolean {
  const event = occ.event
  const query = filters.query.trim().toLowerCase()
  if (query) {
    const haystack = [
      event.title,
      event.description,
      event.location,
      event.tags.join(' ')
    ]
      .join('\n')
      .toLowerCase()
    if (!haystack.includes(query)) return false
  }

  if (filters.tags.length > 0 && !filters.tags.every((tag) => event.tags.includes(tag))) {
    return false
  }

  if (filters.colors.length > 0 && !filters.colors.includes(event.color)) {
    return false
  }

  const eventAttachments = attachmentsByEvent.get(event.id) ?? []
  if (filters.attachmentKind !== 'any') {
    const kind = filters.attachmentKind
    if (!eventAttachments.some((a) => attachmentKind(a.type, a.name) === kind)) return false
  }

  if (filters.quick === 'today') {
    const start = startOfDay(new Date())
    const end = endOfDay(new Date())
    if (!(occ.start < end && occ.end > start)) return false
  } else if (filters.quick === 'week') {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    const end = endOfWeek(new Date(), { weekStartsOn: 1 })
    if (!(occ.start < end && occ.end > start)) return false
  } else if (filters.quick === 'hasAttachment') {
    if (eventAttachments.length === 0) return false
  } else if (filters.quick === 'important') {
    if (!event.important) return false
  } else if (filters.quick === 'incomplete') {
    if (event.completed) return false
  }

  if (filters.range.from) {
    const from = new Date(`${filters.range.from}T00:00:00`)
    if (!(occ.end > from)) return false
  }
  if (filters.range.to) {
    const to = new Date(`${filters.range.to}T23:59:59.999`)
    if (!(occ.start < to)) return false
  }

  return true
}

export function occurrencesOnDay(occurrences: Occurrence[], day: Date): Occurrence[] {
  const start = startOfDay(day)
  const end = endOfDay(day)
  return occurrences.filter((occ) => occ.start < end && occ.end > start)
}

export function dateKeyOf(date: Date): string {
  return toDateKey(date)
}
