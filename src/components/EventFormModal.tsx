import { zodResolver } from '@hookform/resolvers/zod'
import { differenceInMinutes, getISODay } from 'date-fns'
import {
  CalendarClock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  Repeat,
  Star,
  Tag,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EVENT_COLORS, REMINDER_OPTIONS, WEEKDAY_LABELS } from '../lib/constants'
import { humanDuration, isoWeekdayOf, toDateKey, toLocalInput } from '../lib/dates'
import { useCalendarStore } from '../store/useCalendarStore'
import type { AttachmentMeta, CalendarEvent, EventColor, EventInput, Priority } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Chip, inputClass, Modal, selectClass, Toggle } from './ui'

const COLOR_KEYS = ['indigo', 'sky', 'emerald', 'amber', 'rose', 'violet', 'slate'] as const

const schema = z
  .object({
    title: z.string().trim().min(1, '请输入事件标题').max(120, '标题不能超过 120 个字符'),
    allDay: z.boolean(),
    start: z.string().min(1, '请选择开始时间'),
    end: z.string().min(1, '请选择结束时间'),
    location: z.string().max(200, '地点不能超过 200 个字符'),
    description: z.string().max(20000, '笔记内容过长'),
    color: z.enum(COLOR_KEYS),
    priority: z.enum(['low', 'normal', 'high']),
    tags: z.string().max(400, '标签过长'),
    reminder: z.string(),
    recurrenceEnabled: z.boolean(),
    recurrenceFreq: z.enum(['daily', 'weekly', 'monthly']),
    recurrenceInterval: z.number().int('间隔必须是整数').min(1, '间隔至少为 1').max(99, '间隔最多为 99'),
    recurrenceUntil: z.string(),
    recurrenceWeekdays: z.array(z.number()),
    important: z.boolean(),
    pinned: z.boolean(),
    completed: z.boolean()
  })
  .refine(
    (data) =>
      data.allDay
        ? data.end >= data.start
        : new Date(data.end).getTime() >= new Date(data.start).getTime(),
    { message: '结束时间不能早于开始时间', path: ['end'] }
  )
  .refine(
    (data) =>
      !data.recurrenceEnabled ||
      !data.recurrenceUntil ||
      toDateKey(new Date(data.start)) <= data.recurrenceUntil,
    { message: '重复结束日期不能早于开始日期', path: ['recurrenceUntil'] }
  )

type FormValues = z.infer<typeof schema>

function splitTags(raw: string): string[] {
  const tags = raw
    .split(/[,，]/)
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
  return [...new Set(tags)].slice(0, 12)
}

function buildDefaults(
  event: CalendarEvent | null,
  defaultStart: Date | null,
  defaultEnd: Date | null,
  defaultReminder: number | null
): FormValues {
  if (event) {
    const startAt = new Date(event.startAt)
    const endAt = new Date(event.endAt)
    const recurrence = event.recurrence
    return {
      title: event.title,
      allDay: event.allDay,
      start: event.allDay ? toDateKey(startAt) : toLocalInput(startAt),
      end: event.allDay ? toDateKey(endAt) : toLocalInput(endAt),
      location: event.location,
      description: event.description,
      color: event.color,
      priority: event.priority,
      tags: event.tags.join(', '),
      reminder: event.reminderMinutes === null ? 'null' : String(event.reminderMinutes),
      recurrenceEnabled: !!recurrence,
      recurrenceFreq: recurrence?.freq ?? 'weekly',
      recurrenceInterval: recurrence?.interval ?? 1,
      recurrenceUntil: recurrence?.until ?? '',
      recurrenceWeekdays: recurrence?.byWeekday ?? [],
      important: event.important,
      pinned: event.pinned,
      completed: event.completed
    }
  }

  const start = defaultStart ?? new Date()
  const end =
    defaultEnd ?? new Date(new Date(start).getTime() + 60 * 60 * 1000)
  return {
    title: '',
    allDay: false,
    start: toLocalInput(start),
    end: toLocalInput(end),
    location: '',
    description: '',
    color: 'indigo',
    priority: 'normal',
    tags: '',
    reminder: defaultReminder === null ? 'null' : String(defaultReminder),
    recurrenceEnabled: false,
    recurrenceFreq: 'weekly',
    recurrenceInterval: 1,
    recurrenceUntil: '',
    recurrenceWeekdays: [isoWeekdayOf(start)],
    important: false,
    pinned: false,
    completed: false
  }
}

export function EventFormModal() {
  const openState = useCalendarStore((s) => s.formState)
  const prefs = useCalendarStore((s) => s.prefs)
  const attachments = useCalendarStore((s) => s.attachments)
  const closeForm = useCalendarStore((s) => s.closeForm)
  const createEvent = useCalendarStore((s) => s.createEvent)
  const updateEvent = useCalendarStore((s) => s.updateEvent)
  const addAttachments = useCalendarStore((s) => s.addAttachments)
  const removeAttachment = useCalendarStore((s) => s.removeAttachment)

  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AttachmentMeta | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editing = openState.mode === 'edit' ? openState.event : null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(
      openState.event,
      openState.defaultStart,
      openState.defaultEnd,
      prefs.defaultReminder
    )
  })

  useEffect(() => {
    if (!openState.open) return
    reset(
      buildDefaults(openState.event, openState.defaultStart, openState.defaultEnd, prefs.defaultReminder)
    )
    setFiles([])
    setDragging(false)
  }, [openState.open, openState.event, openState.defaultStart, openState.defaultEnd, prefs.defaultReminder, reset])

  useEffect(() => {
    const urls = files.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    )
    setPreviews(urls)
    return () => {
      for (const url of urls) if (url) URL.revokeObjectURL(url)
    }
  }, [files])

  const allDay = watch('allDay')
  const startValue = watch('start')
  const endValue = watch('end')
  const color = watch('color')
  const recurrenceEnabled = watch('recurrenceEnabled')
  const recurrenceFreq = watch('recurrenceFreq')
  const weekdays = watch('recurrenceWeekdays')
  const important = watch('important')
  const pinned = watch('pinned')
  const completed = watch('completed')

  const durationText = useMemo(() => {
    if (!startValue || !endValue) return ''
    const start = new Date(startValue)
    const end = new Date(endValue)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
    if (end <= start) return ''
    if (allDay) {
      const days = Math.round(differenceInMinutes(end, start) / 60 / 24) + 1
      return `${days} 天（全天）`
    }
    return humanDuration(start, end)
  }, [startValue, endValue, allDay])

  const existingAttachments = useMemo(
    () => (editing ? attachments.filter((a) => a.eventId === editing.id) : []),
    [attachments, editing]
  )

  const toggleWeekday = (value: number) => {
    const next = weekdays.includes(value)
      ? weekdays.filter((d) => d !== value)
      : [...weekdays, value].sort((a, b) => a - b)
    setValue('recurrenceWeekdays', next, { shouldDirty: true })
  }

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    if (list.length === 0) return
    setFiles((prev) => [...prev, ...list])
  }

  const onSubmit = handleSubmit(async (values) => {
    const startDate = values.allDay
      ? new Date(`${values.start}T00:00:00`)
      : new Date(values.start)
    let endDate = values.allDay
      ? new Date(`${values.end}T23:59:59.999`)
      : new Date(values.end)

    if (!values.allDay && endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
    }

    const tags = splitTags(values.tags)
    const defaultWeekday = getISODay(startDate)
    const recurrence = values.recurrenceEnabled
      ? {
          freq: values.recurrenceFreq,
          interval: Math.max(1, values.recurrenceInterval || 1),
          until: values.recurrenceUntil || null,
          byWeekday:
            values.recurrenceFreq === 'weekly'
              ? values.recurrenceWeekdays.length > 0
                ? [...values.recurrenceWeekdays].sort((a, b) => a - b)
                : [defaultWeekday]
              : []
        }
      : null

    const input: EventInput = {
      title: values.title.trim(),
      description: values.description,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      allDay: values.allDay,
      tags,
      color: values.color as EventColor,
      priority: values.priority as Priority,
      location: values.location.trim(),
      reminderMinutes:
        values.reminder === 'null' ? null : Number(values.reminder),
      completed: values.completed,
      important: values.important,
      pinned: values.pinned,
      recurrence
    }

    const saved =
      editing ? await updateEvent(editing.id, input) : await createEvent(input)
    if (!saved) return

    if (files.length > 0) {
      await addAttachments(saved.id, files)
    }
    closeForm()
  })

  const title = editing ? '编辑事件' : '新建事件'

  return (
    <>
      <Modal
        open={openState.open}
        onClose={closeForm}
        title={title}
        subtitle={editing ? '修改后点击保存，重复事件会更新整个系列' : '支持文字、Markdown 笔记与图片/文件附件'}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              {...register('title')}
              autoFocus
              placeholder="事件标题"
              className={`${inputClass} border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-lg font-semibold focus:ring-0 dark:border-slate-700 ${
                errors.title ? 'border-rose-400' : ''
              }`}
              aria-label="事件标题"
            />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <CalendarClock size={14} /> 时间
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                全天事件
                <Toggle
                  checked={allDay}
                  onChange={(v) => {
                    setValue('allDay', v, { shouldDirty: true })
                    if (v) {
                      setValue('start', startValue.slice(0, 10), { shouldDirty: true })
                      setValue('end', (endValue || startValue).slice(0, 10), { shouldDirty: true })
                    } else {
                      setValue('start', `${startValue.slice(0, 10)}T09:00`, { shouldDirty: true })
                      setValue('end', `${(endValue || startValue).slice(0, 10)}T10:00`, {
                        shouldDirty: true
                      })
                    }
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  开始{allDay ? '日期' : '时间'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  {...register('start')}
                  className={inputClass}
                />
                {errors.start && (
                  <p className="mt-1 text-xs text-rose-600">{errors.start.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  结束{allDay ? '日期（含当天）' : '时间'}
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  {...register('end')}
                  className={inputClass}
                />
                {errors.end && <p className="mt-1 text-xs text-rose-600">{errors.end.message}</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{durationText ? `持续时间：${durationText}` : '结束时间需晚于开始时间'}</span>
              <span>支持跨天事件</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <MapPin size={12} /> 地点
              </label>
              <input {...register('location')} placeholder="可选" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Tag size={12} /> 标签（用逗号分隔）
              </label>
              <input {...register('tags')} placeholder="工作, 学习" className={inputClass} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => setValue('color', item.key, { shouldDirty: true })}
                    className={`h-7 w-7 rounded-full transition ${
                      color === item.key
                        ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  优先级
                </label>
                <select {...register('priority')} className={selectClass}>
                  <option value="low">低</option>
                  <option value="normal">普通</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  提醒
                </label>
                <select {...register('reminder')} className={selectClass}>
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={String(opt.value)} value={opt.value === null ? 'null' : String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>笔记（支持 Markdown）</span>
              <span className="text-slate-400">**粗体** · - 列表 · `代码`</span>
            </label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="记录细节、链接、清单…"
              className={`${inputClass} resize-y font-mono text-[13px] leading-6`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Repeat size={14} /> 重复事件
              </span>
              <Toggle
                checked={recurrenceEnabled}
                onChange={(v) => setValue('recurrenceEnabled', v, { shouldDirty: true })}
              />
            </div>
            {recurrenceEnabled && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      频率
                    </label>
                    <select {...register('recurrenceFreq')} className={selectClass}>
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      每 N 次（间隔）
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      {...register('recurrenceInterval', { valueAsNumber: true })}
                      className={inputClass}
                    />
                    {errors.recurrenceInterval && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.recurrenceInterval.message}
                      </p>
                    )}
                  </div>
                </div>
                {recurrenceFreq === 'weekly' && (
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      重复的星期
                    </label>
                    <div className="flex gap-1">
                      {WEEKDAY_LABELS.map((day) => (
                        <Chip
                          key={day.value}
                          active={weekdays.includes(day.value)}
                          onClick={() => toggleWeekday(day.value)}
                          className="min-w-7 justify-center"
                        >
                          {day.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                    重复结束日期（可选）
                  </label>
                  <input type="date" {...register('recurrenceUntil')} className={inputClass} />
                  {errors.recurrenceUntil && (
                    <p className="mt-1 text-xs text-rose-600">{errors.recurrenceUntil.message}</p>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  重复事件按时间范围自动展开，暂不支持单独修改某一天
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Paperclip size={14} /> 附件
              {(existingAttachments.length > 0 || files.length > 0) && (
                <span className="text-slate-400">
                  （{existingAttachments.length + files.length}）
                </span>
              )}
            </div>

            {existingAttachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {existingAttachments.map((meta) => (
                  <li
                    key={meta.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60"
                  >
                    {meta.type.startsWith('image/') ? (
                      <ImageIcon size={14} className="shrink-0 text-brand-500" />
                    ) : (
                      <FileText size={14} className="shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                      {meta.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`删除附件 ${meta.name}`}
                      onClick={() => setPendingDelete(meta)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <ul className="mb-2 space-y-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 px-2 py-1.5 dark:border-brand-500/30 dark:bg-brand-500/10"
                  >
                    {previews[index] ? (
                      <img
                        src={previews[index]}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <FileText size={14} className="shrink-0 text-brand-500" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      aria-label={`移除 ${file.name}`}
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                addFiles(e.dataTransfer.files)
              }}
              className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition ${
                dragging
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <UploadCloud size={18} className="text-slate-400" />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                拖拽文件到这里，或
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-1 font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  选择文件
                </button>
              </p>
              <p className="text-[10px] text-slate-400">支持多选，图片与办公文件均可</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pb-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Toggle
                checked={important}
                onChange={(v) => setValue('important', v, { shouldDirty: true })}
              />
              <span className="inline-flex items-center gap-1">
                <Star size={12} className="text-amber-500" /> 重要
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Toggle
                checked={pinned}
                onChange={(v) => setValue('pinned', v, { shouldDirty: true })}
              />
              置顶显示
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Toggle
                checked={completed}
                onChange={(v) => setValue('completed', v, { shouldDirty: true })}
              />
              已完成
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除附件"
        description={`确定要删除附件「${pendingDelete?.name ?? ''}」吗？文件将从本地数据库中永久移除。`}
        confirmLabel="删除"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void removeAttachment(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </>
  )
}

