import { create } from 'zustand'
import { api } from '../api'
import { newId } from '../data/db'
import { DEFAULT_PREFS, PREFS_KEY } from '../lib/constants'
import { defaultFilters } from '../lib/filters'
import { parseBackupFile, recordFromImport } from '../lib/backup'
import type {
  AttachmentMeta,
  CalendarEvent,
  CalendarViewKey,
  EventColor,
  EventInput,
  Filters,
  Preferences,
  QuickFilter,
  ToastMessage
} from '../types'

export interface EventFormState {
  open: boolean
  mode: 'create' | 'edit'
  event: CalendarEvent | null
  defaultStart: Date | null
  defaultEnd: Date | null
}

interface CalendarState {
  events: CalendarEvent[]
  attachments: AttachmentMeta[]
  deletedEvents: CalendarEvent[]
  loading: boolean
  ready: boolean
  error: string | null
  selectedDate: Date
  view: CalendarViewKey
  filters: Filters
  filtersOpen: boolean
  prefs: Preferences
  toasts: ToastMessage[]
  formState: EventFormState
  detailId: string | null
  settingsOpen: boolean
  trashOpen: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  loadDeleted: () => Promise<void>

  setSelectedDate: (date: Date) => void
  setView: (view: CalendarViewKey) => void

  setFilter: (patch: Partial<Filters>) => void
  setRange: (patch: Partial<Filters['range']>) => void
  toggleTag: (tag: string) => void
  toggleColor: (color: EventColor) => void
  setQuick: (quick: QuickFilter) => void
  resetFilters: () => void
  setFiltersOpen: (open: boolean) => void

  setPrefs: (patch: Partial<Preferences>) => void

  pushToast: (
    message: string,
    type?: ToastMessage['type'],
    action?: ToastMessage['action']
  ) => void
  dismissToast: (id: string) => void

  openCreate: (start?: Date, end?: Date) => void
  openEdit: (event: CalendarEvent) => void
  closeForm: () => void
  openDetail: (id: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setTrashOpen: (open: boolean) => void

  createEvent: (input: EventInput) => Promise<CalendarEvent | null>
  updateEvent: (id: string, patch: Partial<EventInput>) => Promise<CalendarEvent | null>
  deleteEvent: (id: string) => Promise<void>
  duplicateEvent: (id: string) => Promise<void>
  restoreEvent: (id: string) => Promise<void>
  purgeEvent: (id: string) => Promise<void>
  emptyTrash: () => Promise<void>

  addAttachments: (eventId: string, files: File[]) => Promise<void>
  removeAttachment: (attachment: AttachmentMeta) => Promise<void>

  importBackup: (file: File) => Promise<void>
  clearAllData: () => Promise<void>
}

const emptyForm: EventFormState = {
  open: false,
  mode: 'create',
  event: null,
  defaultStart: null,
  defaultEnd: null
}

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(prefs: Preferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // 偏好写入失败不影响主流程（例如隐私模式限制存储）
  }
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  attachments: [],
  deletedEvents: [],
  loading: true,
  ready: false,
  error: null,
  selectedDate: new Date(),
  view: DEFAULT_PREFS.defaultView,
  filters: defaultFilters(),
  filtersOpen: false,
  prefs: loadPrefs(),
  toasts: [],
  formState: emptyForm,
  detailId: null,
  settingsOpen: false,
  trashOpen: false,

  init: async () => {
    const prefs = loadPrefs()
    set({ prefs, view: prefs.defaultView, filters: defaultFilters() })
    await get().refresh()
    await get().loadDeleted()
    set({ ready: true })
  },

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const [events, attachments] = await Promise.all([
        api.events.list(),
        api.attachments.listAll()
      ])
      set({ events, attachments })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载本地数据失败'
      set({ error: message })
      get().pushToast(message, 'error')
    } finally {
      set({ loading: false })
    }
  },

  loadDeleted: async () => {
    try {
      const deletedEvents = await api.events.listDeleted()
      set({ deletedEvents })
    } catch {
      // 回收站加载失败不阻塞主界面
    }
  },

  setSelectedDate: (date) => set({ selectedDate: new Date(date) }),
  setView: (view) => set({ view }),

  setFilter: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  setRange: (patch) =>
    set((state) => ({ filters: { ...state.filters, range: { ...state.filters.range, ...patch } } })),
  toggleTag: (tag) =>
    set((state) => {
      const tags = state.filters.tags.includes(tag)
        ? state.filters.tags.filter((t) => t !== tag)
        : [...state.filters.tags, tag]
      return { filters: { ...state.filters, tags } }
    }),
  toggleColor: (color) =>
    set((state) => {
      const colors = state.filters.colors.includes(color)
        ? state.filters.colors.filter((c) => c !== color)
        : [...state.filters.colors, color]
      return { filters: { ...state.filters, colors } }
    }),
  setQuick: (quick) =>
    set((state) => ({ filters: { ...state.filters, quick } })),
  resetFilters: () => set({ filters: defaultFilters() }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),

  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch }
    savePrefs(prefs)
    set({ prefs })
  },

  pushToast: (message, type = 'success', action) => {
    const id = newId('toast')
    set((state) => ({ toasts: [...state.toasts, { id, type, message, action }] }))
    window.setTimeout(() => get().dismissToast(id), action ? 6000 : 3600)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openCreate: (start, end) => {
    const now = new Date()
    const startAt = start ? new Date(start) : now
    const endAt = end ? new Date(end) : new Date(startAt.getTime() + 60 * 60 * 1000)
    set({
      formState: {
        open: true,
        mode: 'create',
        event: null,
        defaultStart: startAt,
        defaultEnd: endAt
      },
      detailId: null
    })
  },
  openEdit: (event) =>
    set({
      formState: { open: true, mode: 'edit', event, defaultStart: null, defaultEnd: null },
      detailId: null
    }),
  closeForm: () => set({ formState: emptyForm }),
  openDetail: (detailId) => set({ detailId }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setTrashOpen: (trashOpen) => set({ trashOpen }),

  createEvent: async (input) => {
    try {
      const event = await api.events.create(input)
      await get().refresh()
      get().pushToast('事件已创建', 'success')
      return event
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '创建事件失败', 'error')
      return null
    }
  },

  updateEvent: async (id, patch) => {
    try {
      const event = await api.events.update(id, patch)
      await get().refresh()
      get().pushToast('修改已保存', 'success')
      return event
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '保存失败', 'error')
      return null
    }
  },

  deleteEvent: async (id) => {
    const event = get().events.find((e) => e.id === id)
    try {
      await api.events.softDelete(id)
      await get().refresh()
      await get().loadDeleted()
      set({ detailId: null })
      get().pushToast(`「${event?.title ?? '事件'}」已移入回收站`, 'success', {
        label: '撤销',
        run: () => {
          void (async () => {
            await api.events.restore(id)
            await get().refresh()
            await get().loadDeleted()
            get().pushToast('已恢复事件', 'success')
          })()
        }
      })
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  },

  duplicateEvent: async (id) => {
    const source = get().events.find((e) => e.id === id)
    if (!source) return
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, deletedFlag: _f, ...rest } = source
      const copy = await api.events.create({
        ...rest,
        title: `${source.title}（副本）`
      })
      const records = await api.attachments.listByEvent(id)
      for (const record of records) {
        await api.attachments.addRecord({
          ...record,
          id: newId('att'),
          eventId: copy.id,
          createdAt: new Date().toISOString()
        })
      }
      await get().refresh()
      get().pushToast('已创建副本', 'success')
      set({ detailId: copy.id })
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '复制失败', 'error')
    }
  },

  restoreEvent: async (id) => {
    try {
      await api.events.restore(id)
      await get().refresh()
      await get().loadDeleted()
      get().pushToast('事件已恢复', 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '恢复失败', 'error')
    }
  },

  purgeEvent: async (id) => {
    try {
      await api.events.purge(id)
      await get().refresh()
      await get().loadDeleted()
      get().pushToast('已彻底删除', 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '彻底删除失败', 'error')
    }
  },

  emptyTrash: async () => {
    try {
      await api.events.purgeAllDeleted()
      await get().refresh()
      await get().loadDeleted()
      get().pushToast('回收站已清空', 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '清空回收站失败', 'error')
    }
  },

  addAttachments: async (eventId, files) => {
    if (files.length === 0) return
    try {
      for (const file of files) {
        await api.attachments.add(eventId, file)
      }
      await get().refresh()
      get().pushToast(`已添加 ${files.length} 个附件`, 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '附件上传失败', 'error')
    }
  },

  removeAttachment: async (attachment) => {
    try {
      await api.attachments.remove(attachment.id)
      await get().refresh()
      get().pushToast(`已删除附件「${attachment.name}」`, 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '删除附件失败', 'error')
    }
  },

  importBackup: async (file) => {
    try {
      const result = await parseBackupFile(file)
      if (result.events.length === 0 && result.attachments.length === 0) {
        get().pushToast('备份文件中没有可导入的数据', 'info')
        return
      }
      await api.events.upsertMany(result.events)
      for (const item of result.attachments) {
        await api.attachments.addRecord(recordFromImport(item.meta, item.blob))
      }
      await get().refresh()
      await get().loadDeleted()
      get().pushToast(
        `导入完成：${result.events.length} 个事件、${result.attachments.length} 个附件`,
        'success'
      )
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '导入失败', 'error')
    }
  },

  clearAllData: async () => {
    try {
      await api.events.clear()
      await api.attachments.clear()
      await get().refresh()
      await get().loadDeleted()
      get().pushToast('所有本地数据已清空', 'success')
    } catch (err) {
      get().pushToast(err instanceof Error ? err.message : '清空数据失败', 'error')
    }
  }
}))
