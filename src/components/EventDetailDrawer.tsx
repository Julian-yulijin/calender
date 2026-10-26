import { differenceInCalendarDays, format, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  FileText,
  MapPin,
  Paperclip,
  Pencil,
  Repeat,
  Star,
  Tag,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../api'
import { colorHex, PRIORITY_LABELS, REMINDER_OPTIONS, WEEKDAY_LABELS } from '../lib/constants'
import { humanDuration, humanFileSize } from '../lib/dates'
import { useEscapeKey } from '../lib/hooks'
import { useCalendarStore } from '../store/useCalendarStore'
import type { AttachmentMeta, AttachmentRecord, CalendarEvent } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { IconButton, Modal } from './ui'

type AttachmentWithUrl = AttachmentRecord & { url: string }

function timeRangeText(event: CalendarEvent): string {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  if (event.allDay) {
    const s = format(start, 'M月d日', { locale: zhCN })
    const e = format(end, 'M月d日', { locale: zhCN })
    return s === e ? `${s} · 全天` : `${s} – ${e} · 全天`
  }
  const startText = format(start, 'M月d日 HH:mm', { locale: zhCN })
  const endText = isSameDay(start, end)
    ? format(end, 'HH:mm', { locale: zhCN })
    : format(end, 'M月d日 HH:mm', { locale: zhCN })
  return `${startText} – ${endText}`
}

function durationText(event: CalendarEvent): string {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  if (event.allDay) {
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1)
    return `${days} 天`
  }
  return humanDuration(start, end)
}

function recurrenceText(event: CalendarEvent): string {
  const rule = event.recurrence
  if (!rule) return '不重复'
  const interval = rule.interval || 1
  const prefix = interval > 1 ? `每 ${interval} ` : '每'
  let text = ''
  if (rule.freq === 'daily') text = `${prefix}天`
  else if (rule.freq === 'weekly') {
    const days =
      rule.byWeekday && rule.byWeekday.length > 0
        ? `（${rule.byWeekday
            .map((d) => `周${WEEKDAY_LABELS.find((w) => w.value === d)?.label ?? ''}`)
            .join('、')}）`
        : ''
    text = `${prefix}周${days}`
  } else text = `${prefix}个月`
  if (rule.until) text += `，至 ${rule.until}`
  return text
}

function reminderText(event: CalendarEvent): string {
  if (event.reminderMinutes === null) return '不提醒'
  const option = REMINDER_OPTIONS.find((o) => o.value === event.reminderMinutes)
  return option?.label ?? `提前 ${event.reminderMinutes} 分钟`
}

export function EventDetailDrawer() {
  const detailId = useCalendarStore((s) => s.detailId)
  const events = useCalendarStore((s) => s.events)
  const attachments = useCalendarStore((s) => s.attachments)
  const prefs = useCalendarStore((s) => s.prefs)
  const openDetail = useCalendarStore((s) => s.openDetail)
  const openEdit = useCalendarStore((s) => s.openEdit)
  const deleteEvent = useCalendarStore((s) => s.deleteEvent)
  const duplicateEvent = useCalendarStore((s) => s.duplicateEvent)
  const updateEvent = useCalendarStore((s) => s.updateEvent)
  const removeAttachment = useCalendarStore((s) => s.removeAttachment)

  const event = useMemo(
    () => events.find((e) => e.id === detailId) ?? null,
    [events, detailId]
  )

  const [items, setItems] = useState<AttachmentWithUrl[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingDeleteAttachment, setPendingDeleteAttachment] =
    useState<AttachmentMeta | null>(null)
  const [lightbox, setLightbox] = useState<AttachmentWithUrl | null>(null)

  const attachmentSignature = useMemo(
    () =>
      attachments
        .filter((a) => a.eventId === detailId)
        .map((a) => `${a.id}:${a.createdAt}`)
        .join('|'),
    [attachments, detailId]
  )

  const open = !!event
  useEscapeKey(open && !confirmDelete && !lightbox, () => openDetail(null))

  useEffect(() => {
    if (!event) {
      setItems([])
      return
    }
    let cancelled = false
    let createdUrls: string[] = []
    void api.attachments.listByEvent(event.id).then((records) => {
      if (cancelled) return
      const withUrls = records.map((record) => ({
        ...record,
        url: URL.createObjectURL(record.blob)
      }))
      createdUrls = withUrls.map((r) => r.url)
      setItems(withUrls)
    })
    return () => {
      cancelled = true
      for (const url of createdUrls) URL.revokeObjectURL(url)
    }
  }, [event?.id, attachmentSignature])

  if (!event) return null

  const color = colorHex(event.color)
  const imageItems = items.filter((item) => item.type.startsWith('image/'))
  const fileItems = items.filter((item) => !item.type.startsWith('image/'))
  const created = new Date(event.createdAt)
  const updated = new Date(event.updatedAt)

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-fade-in"
          onClick={() => openDetail(null)}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`事件详情：${event.title}`}
          className="relative flex h-full w-full max-w-md flex-col bg-white shadow-float animate-slide-right dark:bg-slate-900"
        >
          <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: color }} />

          <div className="flex items-start gap-2 px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {event.recurrence && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Repeat size={10} /> 重复事件
                  </span>
                )}
                {event.completed && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                    已完成
                  </span>
                )}
                {event.pinned && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    置顶
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  优先级 {PRIORITY_LABELS[event.priority]}
                </span>
              </div>
              <h2
                className={`mt-2 text-lg font-semibold leading-snug ${
                  event.completed
                    ? 'text-slate-400 line-through dark:text-slate-500'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {event.title}
              </h2>
            </div>
            <IconButton label="关闭详情" onClick={() => openDetail(null)}>
              <X size={18} />
            </IconButton>
          </div>

          <div className="flex items-center gap-1 border-b border-slate-100 px-5 pb-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => void updateEvent(event.id, { completed: !event.completed })}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {event.completed ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} />
              )}
              {event.completed ? '标记未完成' : '标记完成'}
            </button>
            <button
              type="button"
              onClick={() => void updateEvent(event.id, { important: !event.important })}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                event.important
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Star size={14} className={event.important ? 'fill-current' : ''} />
              {event.important ? '重要' : '标为重要'}
            </button>
            <button
              type="button"
              onClick={() => openEdit(event)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Pencil size={13} /> 编辑
            </button>
            <IconButton label="复制事件" onClick={() => void duplicateEvent(event.id)} className="h-8 w-8">
              <Copy size={15} />
            </IconButton>
            <IconButton
              label="删除事件"
              onClick={() => setConfirmDelete(true)}
              className="h-8 w-8 hover:text-rose-600"
            >
              <Trash2 size={15} />
            </IconButton>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <InfoRow icon={<CalendarDays size={15} />} label="时间">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {timeRangeText(event)}
                </span>
                <span className="ml-2 text-xs text-slate-400">共 {durationText(event)}</span>
              </InfoRow>

              <InfoRow icon={<Clock size={15} />} label="重复">
                <span>{recurrenceText(event)}</span>
              </InfoRow>

              <InfoRow icon={<Bell size={15} />} label="提醒">
                <span>{reminderText(event)}</span>
              </InfoRow>

              {event.location && (
                <InfoRow icon={<MapPin size={15} />} label="地点">
                  <span>{event.location}</span>
                </InfoRow>
              )}

              {event.tags.length > 0 && (
                <InfoRow icon={<Tag size={15} />} label="标签">
                  <span className="flex flex-wrap gap-1">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                </InfoRow>
              )}
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                笔记
              </h3>
              {event.description.trim() ? (
                <div className="markdown-body rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  暂无笔记，编辑事件可添加 Markdown 内容
                </p>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  附件
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Paperclip size={11} /> {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  暂无附件，编辑事件可上传图片或文件
                </p>
              ) : (
                <div className="space-y-2">
                  {imageItems.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {imageItems.map((item) => (
                        <div key={item.id} className="group relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setLightbox(item)}
                            className="block aspect-square w-full"
                            aria-label={`预览图片 ${item.name}`}
                          >
                            <img
                              src={item.url}
                              alt={item.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              loading="lazy"
                            />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-slate-950/75 to-transparent px-1.5 pb-1 pt-4">
                            <span className="min-w-0 flex-1 truncate text-[10px] text-white">
                              {item.name}
                            </span>
                            <a
                              href={item.url}
                              download={item.name}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded p-0.5 text-white/90 hover:text-white"
                              aria-label={`下载 ${item.name}`}
                            >
                              <Download size={11} />
                            </a>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteAttachment(item)}
                              className="rounded p-0.5 text-white/90 hover:text-rose-300"
                              aria-label={`删除 ${item.name}`}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fileItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-700"
                    >
                      <FileText size={16} className="shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{humanFileSize(item.size)}</p>
                      </div>
                      <a
                        href={item.url}
                        download={item.name}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                        aria-label={`下载 ${item.name}`}
                      >
                        <Download size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteAttachment(item)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        aria-label={`删除 ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800">
              <p>创建于 {format(created, 'yyyy年M月d日 HH:mm')}</p>
              <p>最后更新 {format(updated, 'yyyy年M月d日 HH:mm')}</p>
              {prefs.showLunar && <p className="mt-1">数据仅保存在本地浏览器</p>}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除事件"
        description={
          event.recurrence
            ? `「${event.title}」是重复事件，删除后会移除整个系列并移入回收站。确定继续吗？`
            : `「${event.title}」将被移入回收站，可在回收站中恢复。确定删除吗？`
        }
        confirmLabel="移入回收站"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteEvent(event.id)
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteAttachment}
        title="删除附件"
        description={`确定要删除附件「${pendingDeleteAttachment?.name ?? ''}」吗？此操作不可撤销。`}
        confirmLabel="删除"
        danger
        onCancel={() => setPendingDeleteAttachment(null)}
        onConfirm={() => {
          if (pendingDeleteAttachment) void removeAttachment(pendingDeleteAttachment)
          setPendingDeleteAttachment(null)
        }}
      />

      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.name ?? '图片预览'}
        subtitle={lightbox ? humanFileSize(lightbox.size) : undefined}
        size="xl"
        footer={
          lightbox && (
            <a
              href={lightbox.url}
              download={lightbox.name}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Download size={14} /> 下载图片
            </a>
          )
        }
      >
        {lightbox && (
          <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        )}
      </Modal>
    </>
  )
}

function InfoRow({
  icon,
  label,
  children
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="w-10 shrink-0 pt-0.5">{label}</span>
      <div className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  )
}
