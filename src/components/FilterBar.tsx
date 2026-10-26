import { CalendarRange, Filter, Paperclip, Search, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import {
  ATTACHMENT_KIND_LABELS,
  EVENT_COLORS
} from '../lib/constants'
import { isEditableTarget } from '../lib/hooks'
import { isImageAttachment, attachmentKind } from '../lib/attachments'
import { useCalendarStore } from '../store/useCalendarStore'
import type { AttachmentKind, EventColor, QuickFilter } from '../types'
import { Chip, inputClass, selectClass } from './ui'

const QUICK_FILTERS: { key: QuickFilter; label: string; icon?: typeof Paperclip }[] = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今天', icon: CalendarRange },
  { key: 'week', label: '本周', icon: CalendarRange },
  { key: 'hasAttachment', label: '有附件', icon: Paperclip },
  { key: 'important', label: '重要', icon: Star },
  { key: 'incomplete', label: '未完成' }
]

export function FilterBar() {
  const filters = useCalendarStore((s) => s.filters)
  const filtersOpen = useCalendarStore((s) => s.filtersOpen)
  const setFilter = useCalendarStore((s) => s.setFilter)
  const setRange = useCalendarStore((s) => s.setRange)
  const toggleTag = useCalendarStore((s) => s.toggleTag)
  const toggleColor = useCalendarStore((s) => s.toggleColor)
  const setQuick = useCalendarStore((s) => s.setQuick)
  const resetFilters = useCalendarStore((s) => s.resetFilters)
  const setFiltersOpen = useCalendarStore((s) => s.setFiltersOpen)
  const events = useCalendarStore((s) => s.events)
  const attachments = useCalendarStore((s) => s.attachments)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || isEditableTarget(e.target)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      for (const tag of event.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .map(([tag]) => tag)
  }, [events])

  const advancedCount =
    filters.tags.length +
    filters.colors.length +
    (filters.attachmentKind !== 'any' ? 1 : 0) +
    (filters.range.from ? 1 : 0) +
    (filters.range.to ? 1 : 0)

  const attachmentKinds = useMemo(() => {
    const kinds = new Set<AttachmentKind>()
    for (const meta of attachments) kinds.add(attachmentKind(meta.type, meta.name))
    return kinds
  }, [attachments])

  const hasImageAttachment = useMemo(
    () => attachments.some((a) => isImageAttachment(a)),
    [attachments]
  )

  return (
    <div className="border-b border-slate-200/70 bg-white/70 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-2 px-3 py-2 md:px-5">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchRef}
              value={filters.query}
              onChange={(e) => setFilter({ query: e.target.value })}
              placeholder="搜索标题、描述、地点、标签…"
              className={`${inputClass} py-1.5 pl-8 pr-8 text-xs`}
              aria-label="搜索事件"
            />
            {filters.query && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setFilter({ query: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="scrollbar-thin -my-1 flex flex-1 items-center gap-1.5 overflow-x-auto py-1">
            {QUICK_FILTERS.map((item) => (
              <Chip
                key={item.key}
                active={filters.quick === item.key}
                onClick={() => setQuick(item.key)}
              >
                {item.label}
              </Chip>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              filtersOpen || advancedCount > 0
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Filter size={13} />
            <span className="hidden sm:inline">筛选</span>
            {advancedCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {advancedCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="mb-1.5 font-semibold text-slate-600 dark:text-slate-300">标签</p>
              {tags.length === 0 ? (
                <p className="text-slate-400">还没有标签</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                      #{tag}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-600 dark:text-slate-300">颜色</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    key={color.key}
                    type="button"
                    title={color.label}
                    aria-label={`筛选颜色 ${color.label}`}
                    onClick={() => toggleColor(color.key as EventColor)}
                    className={`h-6 w-6 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-slate-900 ${
                      filters.colors.includes(color.key)
                        ? 'ring-brand-500'
                        : 'ring-transparent hover:ring-slate-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-600 dark:text-slate-300">附件</p>
              <select
                value={filters.attachmentKind}
                onChange={(e) =>
                  setFilter({ attachmentKind: e.target.value as AttachmentKind | 'any' })
                }
                className={`${selectClass} py-1.5 text-xs`}
              >
                <option value="any">全部类型</option>
                {(['image', 'document', 'other'] as const).map((kind) => (
                  <option key={kind} value={kind} disabled={!attachmentKinds.has(kind)}>
                    {ATTACHMENT_KIND_LABELS[kind]}
                    {!attachmentKinds.has(kind) ? '（暂无）' : ''}
                  </option>
                ))}
              </select>
              {hasImageAttachment && (
                <p className="mt-1 text-[11px] text-slate-400">包含图片附件的事件可筛选图片</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 font-semibold text-slate-600 dark:text-slate-300">日期范围</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.range.from ?? ''}
                  onChange={(e) => setRange({ from: e.target.value || null })}
                  className={`${inputClass} py-1 text-xs`}
                  aria-label="起始日期"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="date"
                  value={filters.range.to ?? ''}
                  onChange={(e) => setRange({ to: e.target.value || null })}
                  className={`${inputClass} py-1 text-xs`}
                  aria-label="结束日期"
                />
              </div>
            </div>

            <div className="flex items-center justify-end md:col-span-2 xl:col-span-4">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                重置全部筛选
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
