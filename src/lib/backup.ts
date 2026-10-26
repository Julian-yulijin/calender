import JSZip from 'jszip'
import type { AttachmentRecord, CalendarEvent } from '../types'
import { newId } from '../data/db'
import { toDateKey } from './dates'

export interface BackupAttachmentMeta {
  id: string
  eventId: string
  name: string
  type: string
  size: number
  createdAt: string
  path: string
}

export interface BackupPayload {
  app: 'personal-calendar'
  version: 1
  exportedAt: string
  events: CalendarEvent[]
  attachments?: BackupAttachmentMeta[]
}

export interface ImportResult {
  events: CalendarEvent[]
  attachments: { meta: BackupAttachmentMeta; blob: Blob }[]
}

function baseName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

export function buildJsonBackup(events: CalendarEvent[]): Blob {
  const payload: BackupPayload = {
    app: 'personal-calendar',
    version: 1,
    exportedAt: new Date().toISOString(),
    events
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export async function buildZipBackup(
  events: CalendarEvent[],
  attachments: AttachmentRecord[]
): Promise<Blob> {
  const zip = new JSZip()
  const metas: BackupAttachmentMeta[] = []
  const folder = zip.folder('attachments')

  for (const record of attachments) {
    const path = `attachments/${record.id}__${baseName(record.name)}`
    folder?.file(path.replace('attachments/', ''), record.blob)
    metas.push({
      id: record.id,
      eventId: record.eventId,
      name: record.name,
      type: record.type,
      size: record.size,
      createdAt: record.createdAt,
      path
    })
  }

  const payload: BackupPayload = {
    app: 'personal-calendar',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    attachments: metas
  }
  zip.file('calendar.json', JSON.stringify(payload, null, 2))
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

function normalizeEvent(raw: Partial<CalendarEvent>): CalendarEvent {
  const now = new Date().toISOString()
  const allDay = !!raw.allDay
  const startAt = raw.startAt ?? now
  const endAt = raw.endAt ?? new Date(new Date(startAt).getTime() + 3600000).toISOString()
  return {
    id: raw.id ?? newId('evt'),
    title: raw.title?.trim() || '未命名事件',
    description: raw.description ?? '',
    startAt,
    endAt,
    allDay,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    color: raw.color ?? 'indigo',
    priority: raw.priority ?? 'normal',
    location: raw.location ?? '',
    reminderMinutes:
      raw.reminderMinutes === undefined || raw.reminderMinutes === null
        ? null
        : Number(raw.reminderMinutes),
    completed: !!raw.completed,
    important: !!raw.important,
    pinned: !!raw.pinned,
    recurrence: raw.recurrence ?? null,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    deletedAt: raw.deletedAt ?? null,
    deletedFlag: raw.deletedAt ? 1 : 0
  }
}

export async function parseBackupFile(file: File): Promise<ImportResult> {
  const isZip =
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'

  if (!isZip) {
    const text = await file.text()
    let parsed: BackupPayload
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('备份文件不是有效的 JSON')
    }
    if (!parsed || !Array.isArray(parsed.events)) throw new Error('备份文件缺少 events 数据')
    return { events: parsed.events.map(normalizeEvent), attachments: [] }
  }

  const zip = await JSZip.loadAsync(file)
  let payload: BackupPayload | null = null
  for (const name of Object.keys(zip.files)) {
    if (name.toLowerCase().endsWith('.json') && !zip.files[name].dir) {
      const text = await zip.files[name].async('string')
      const parsed = JSON.parse(text) as BackupPayload
      if (Array.isArray(parsed.events)) {
        payload = parsed
        break
      }
    }
  }
  if (!payload) throw new Error('ZIP 备份中未找到 calendar.json')

  const attachments: ImportResult['attachments'] = []
  for (const meta of payload.attachments ?? []) {
    const entry = zip.files[meta.path]
    if (!entry || entry.dir) continue
    const blob = await entry.async('blob')
    attachments.push({ meta, blob })
  }

  return { events: payload.events.map(normalizeEvent), attachments }
}

export function backupFileName(kind: 'json' | 'zip', date = new Date()): string {
  return `个人日历备份-${toDateKey(date)}.${kind}`
}

export function recordFromImport(
  meta: BackupAttachmentMeta,
  blob: Blob
): AttachmentRecord {
  return {
    id: meta.id,
    eventId: meta.eventId,
    name: meta.name,
    type: meta.type || blob.type || 'application/octet-stream',
    size: meta.size ?? blob.size,
    blob,
    createdAt: meta.createdAt ?? new Date().toISOString()
  }
}
