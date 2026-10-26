import type {
  AttachmentMeta,
  AttachmentRecord,
  CalendarEvent,
  EventInput
} from '../types'
import type {
  AttachmentRepository,
  DataAdapter,
  EventRepository
} from './repositories'

const NOT_IMPLEMENTED =
  'HttpAdapter 尚未接入真实后端。当前使用 LocalAdapter（IndexedDB），未来只需在 src/api/index.ts 中替换适配器即可。'

function todo(): never {
  throw new Error(NOT_IMPLEMENTED)
}

/**
 * HttpAdapter 预留实现：
 * 保持与 LocalAdapter 完全一致的接口，未来接入真实服务器时，
 * 只需把 src/api/index.ts 里的 adapter 换成 createHttpAdapter({ baseUrl })。
 */
class HttpEventRepository implements EventRepository {
  constructor(private baseUrl: string) {}

  async list(): Promise<CalendarEvent[]> {
    const res = await fetch(`${this.baseUrl}/events`)
    if (!res.ok) throw new Error('加载事件失败')
    return res.json()
  }

  async listDeleted(): Promise<CalendarEvent[]> {
    const res = await fetch(`${this.baseUrl}/events?deleted=1`)
    if (!res.ok) throw new Error('加载回收站失败')
    return res.json()
  }

  async listByRange(startISO: string, endISO: string): Promise<CalendarEvent[]> {
    const res = await fetch(
      `${this.baseUrl}/events?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
    )
    if (!res.ok) throw new Error('加载事件失败')
    return res.json()
  }

  async get(id: string): Promise<CalendarEvent | undefined> {
    const res = await fetch(`${this.baseUrl}/events/${id}`)
    if (res.status === 404) return undefined
    if (!res.ok) throw new Error('加载事件失败')
    return res.json()
  }

  async search(keyword: string): Promise<CalendarEvent[]> {
    const res = await fetch(`${this.baseUrl}/events/search?q=${encodeURIComponent(keyword)}`)
    if (!res.ok) throw new Error('搜索事件失败')
    return res.json()
  }

  async create(input: EventInput): Promise<CalendarEvent> {
    const res = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error('创建事件失败')
    return res.json()
  }

  async update(id: string, patch: Partial<EventInput>): Promise<CalendarEvent> {
    const res = await fetch(`${this.baseUrl}/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw new Error('更新事件失败')
    return res.json()
  }

  async softDelete(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除事件失败')
  }

  async restore(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/${id}/restore`, { method: 'POST' })
    if (!res.ok) throw new Error('恢复事件失败')
  }

  async purge(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/${id}/purge`, { method: 'DELETE' })
    if (!res.ok) throw new Error('彻底删除失败')
  }

  async purgeAllDeleted(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/trash`, { method: 'DELETE' })
    if (!res.ok) throw new Error('清空回收站失败')
  }

  async upsertMany(events: CalendarEvent[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    })
    if (!res.ok) throw new Error('导入事件失败')
  }

  async clear(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events`, { method: 'DELETE' })
    if (!res.ok) throw new Error('清空数据失败')
  }
}

class HttpAttachmentRepository implements AttachmentRepository {
  constructor(private baseUrl: string) {}

  async listAll(): Promise<AttachmentMeta[]> {
    const res = await fetch(`${this.baseUrl}/attachments`)
    if (!res.ok) throw new Error('加载附件失败')
    return res.json()
  }

  async listByEvent(eventId: string): Promise<AttachmentRecord[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/attachments`)
    if (!res.ok) throw new Error('加载附件失败')
    return res.json()
  }

  async get(_id: string): Promise<AttachmentRecord | undefined> {
    todo()
  }

  async add(eventId: string, file: File): Promise<AttachmentMeta> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${this.baseUrl}/events/${eventId}/attachments`, {
      method: 'POST',
      body: form
    })
    if (!res.ok) throw new Error('上传附件失败')
    return res.json()
  }

  async addRecord(_record: AttachmentRecord): Promise<void> {
    todo()
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/attachments/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除附件失败')
  }

  async removeByEvent(eventId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/attachments`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('删除附件失败')
  }

  async removeMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.remove(id)))
  }

  async clear(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/attachments`, { method: 'DELETE' })
    if (!res.ok) throw new Error('清空附件失败')
  }
}

export function createHttpAdapter(options: { baseUrl: string }): DataAdapter {
  return {
    name: `HttpAdapter (${options.baseUrl})`,
    events: new HttpEventRepository(options.baseUrl),
    attachments: new HttpAttachmentRepository(options.baseUrl)
  }
}

export { NOT_IMPLEMENTED }
