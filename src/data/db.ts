import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AttachmentRecord, CalendarEvent } from '../types'

interface CalendarDB extends DBSchema {
  events: {
    key: string
    value: CalendarEvent
    indexes: {
      'by-startAt': string
      'by-deletedFlag': number
    }
  }
  attachments: {
    key: string
    value: AttachmentRecord
    indexes: {
      'by-eventId': string
      'by-createdAt': string
    }
  }
}

export const DB_NAME = 'personal-calendar'
export const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CalendarDB>> | null = null

export function getDB(): Promise<IDBPDatabase<CalendarDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CalendarDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' })
          store.createIndex('by-startAt', 'startAt')
          store.createIndex('by-deletedFlag', 'deletedFlag')
        }
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' })
          store.createIndex('by-eventId', 'eventId')
          store.createIndex('by-createdAt', 'createdAt')
        }
      }
    })
  }
  return dbPromise
}

export function newId(prefix = 'evt'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
