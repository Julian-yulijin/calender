import type { AttachmentMeta, AttachmentRecord, CalendarEvent, EventInput } from '../types'

export interface EventRepository {
  list(options?: { includeDeleted?: boolean }): Promise<CalendarEvent[]>
  listDeleted(): Promise<CalendarEvent[]>
  listByRange(startISO: string, endISO: string): Promise<CalendarEvent[]>
  search(keyword: string): Promise<CalendarEvent[]>
  get(id: string): Promise<CalendarEvent | undefined>
  create(input: EventInput): Promise<CalendarEvent>
  update(id: string, patch: Partial<EventInput>): Promise<CalendarEvent>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  purge(id: string): Promise<void>
  purgeAllDeleted(): Promise<void>
  upsertMany(events: CalendarEvent[]): Promise<void>
  clear(): Promise<void>
}

export interface AttachmentRepository {
  listAll(): Promise<AttachmentMeta[]>
  listByEvent(eventId: string): Promise<AttachmentRecord[]>
  get(id: string): Promise<AttachmentRecord | undefined>
  add(eventId: string, file: File): Promise<AttachmentMeta>
  addRecord(record: AttachmentRecord): Promise<void>
  remove(id: string): Promise<void>
  removeByEvent(eventId: string): Promise<void>
  removeMany(ids: string[]): Promise<void>
  clear(): Promise<void>
}

export interface DataAdapter {
  name: string
  events: EventRepository
  attachments: AttachmentRepository
}

export function toMeta(record: AttachmentRecord): AttachmentMeta {
  const { blob: _blob, ...meta } = record
  return meta
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('本地数据操作超时')), ms + 5000)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}
