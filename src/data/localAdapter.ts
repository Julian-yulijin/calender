import type { AttachmentMeta, AttachmentRecord, CalendarEvent, EventInput } from '../types'
import { getDB, newId } from './db'
import {
  toMeta,
  type AttachmentRepository,
  type DataAdapter,
  type EventRepository
} from './repositories'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

class LocalEventRepository implements EventRepository {
  constructor(
    private latency: number,
    private attachments: AttachmentRepository
  ) {}

  private async wait() {
    if (this.latency > 0) await delay(this.latency)
  }

  async list(options?: { includeDeleted?: boolean }): Promise<CalendarEvent[]> {
    await this.wait()
    const db = await getDB()
    const all = await db.getAll('events')
    return all
      .filter((e) => (options?.includeDeleted ? true : !e.deletedAt))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  }

  async listDeleted(): Promise<CalendarEvent[]> {
    await this.wait()
    const db = await getDB()
    const all = await db.getAll('events')
    return all
      .filter((e) => !!e.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
  }

  async listByRange(startISO: string, endISO: string): Promise<CalendarEvent[]> {
    await this.wait()
    const db = await getDB()
    const all = await db.getAll('events')
    const start = new Date(startISO).getTime()
    const end = new Date(endISO).getTime()
    return all.filter((e) => {
      if (e.deletedAt) return false
      const s = new Date(e.startAt).getTime()
      const en = new Date(e.endAt).getTime()
      return s < end && en > start
    })
  }

  async get(id: string): Promise<CalendarEvent | undefined> {
    await this.wait()
    const db = await getDB()
    return db.get('events', id)
  }

  async search(keyword: string): Promise<CalendarEvent[]> {
    const q = keyword.trim().toLowerCase()
    if (!q) return []
    const all = await this.list()
    return all.filter((e) =>
      [e.title, e.description, e.location, e.tags.join(' ')]
        .join('\n')
        .toLowerCase()
        .includes(q)
    )
  }

  async create(input: EventInput): Promise<CalendarEvent> {
    await this.wait()
    const db = await getDB()
    const now = new Date().toISOString()
    const event: CalendarEvent = {
      ...input,
      id: newId('evt'),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedFlag: 0
    }
    await db.put('events', event)
    return event
  }

  async update(id: string, patch: Partial<EventInput>): Promise<CalendarEvent> {
    await this.wait()
    const db = await getDB()
    const existing = await db.get('events', id)
    if (!existing) throw new Error('事件不存在或已被删除')
    const next: CalendarEvent = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    }
    await db.put('events', next)
    return next
  }

  async softDelete(id: string): Promise<void> {
    await this.wait()
    const db = await getDB()
    const existing = await db.get('events', id)
    if (!existing) return
    const deletedAt = new Date().toISOString()
    await db.put('events', { ...existing, deletedAt, deletedFlag: 1 })
  }

  async restore(id: string): Promise<void> {
    await this.wait()
    const db = await getDB()
    const existing = await db.get('events', id)
    if (!existing) return
    await db.put('events', { ...existing, deletedAt: null, deletedFlag: 0 })
  }

  async purge(id: string): Promise<void> {
    await this.wait()
    await this.attachments.removeByEvent(id)
    const db = await getDB()
    await db.delete('events', id)
  }

  async purgeAllDeleted(): Promise<void> {
    await this.wait()
    const deleted = await this.listDeleted()
    for (const event of deleted) {
      await this.purge(event.id)
    }
  }

  async upsertMany(events: CalendarEvent[]): Promise<void> {
    await this.wait()
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    for (const event of events) {
      await tx.store.put(event)
    }
    await tx.done
  }

  async clear(): Promise<void> {
    await this.wait()
    const db = await getDB()
    await db.clear('events')
  }
}

class LocalAttachmentRepository implements AttachmentRepository {
  constructor(private latency: number) {}

  private async wait() {
    if (this.latency > 0) await delay(this.latency)
  }

  async listAll(): Promise<AttachmentMeta[]> {
    await this.wait()
    const db = await getDB()
    const all = await db.getAll('attachments')
    return all.map(toMeta).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async listByEvent(eventId: string): Promise<AttachmentRecord[]> {
    await this.wait()
    const db = await getDB()
    const records = await db.getAllFromIndex('attachments', 'by-eventId', eventId)
    return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async get(id: string): Promise<AttachmentRecord | undefined> {
    await this.wait()
    const db = await getDB()
    return db.get('attachments', id)
  }

  async add(eventId: string, file: File): Promise<AttachmentMeta> {
    await this.wait()
    const db = await getDB()
    const record: AttachmentRecord = {
      id: newId('att'),
      eventId,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      blob: file,
      createdAt: new Date().toISOString()
    }
    await db.put('attachments', record)
    return toMeta(record)
  }

  async addRecord(record: AttachmentRecord): Promise<void> {
    await this.wait()
    const db = await getDB()
    await db.put('attachments', record)
  }

  async remove(id: string): Promise<void> {
    await this.wait()
    const db = await getDB()
    await db.delete('attachments', id)
  }

  async removeByEvent(eventId: string): Promise<void> {
    const db = await getDB()
    const keys = await db.getAllKeysFromIndex('attachments', 'by-eventId', eventId)
    const tx = db.transaction('attachments', 'readwrite')
    for (const key of keys) {
      await tx.store.delete(key)
    }
    await tx.done
  }

  async removeMany(ids: string[]): Promise<void> {
    await this.wait()
    const db = await getDB()
    const tx = db.transaction('attachments', 'readwrite')
    for (const id of ids) {
      await tx.store.delete(id)
    }
    await tx.done
  }

  async clear(): Promise<void> {
    await this.wait()
    const db = await getDB()
    await db.clear('attachments')
  }
}

/**
 * LocalAdapter：所有数据保存在浏览器 IndexedDB，无真实网络请求。
 * 设置 latency > 0 可模拟网络延迟，方便未来切换到 HttpAdapter 时体验一致。
 */
export function createLocalAdapter(options?: { latencyMs?: number }): DataAdapter {
  const latency = options?.latencyMs ?? 0
  const attachments = new LocalAttachmentRepository(latency)
  const events = new LocalEventRepository(latency, attachments)
  return {
    name: 'LocalAdapter (IndexedDB)',
    events,
    attachments
  }
}

export const localAdapter = createLocalAdapter({ latencyMs: 0 })
