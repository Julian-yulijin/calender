import { format } from 'date-fns'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { colorHex } from '../lib/constants'
import { useCalendarStore } from '../store/useCalendarStore'
import type { CalendarEvent } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './ui'

export function TrashModal() {
  const open = useCalendarStore((s) => s.trashOpen)
  const setTrashOpen = useCalendarStore((s) => s.setTrashOpen)
  const deletedEvents = useCalendarStore((s) => s.deletedEvents)
  const attachments = useCalendarStore((s) => s.attachments)
  const restoreEvent = useCalendarStore((s) => s.restoreEvent)
  const purgeEvent = useCalendarStore((s) => s.purgeEvent)
  const emptyTrash = useCalendarStore((s) => s.emptyTrash)

  const [purgeTarget, setPurgeTarget] = useState<CalendarEvent | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const close = () => setTrashOpen(false)

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title="回收站"
        subtitle="已删除的事件会保留在这里，可恢复或彻底删除"
        size="md"
        footer={
          deletedEvents.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmEmpty(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <Trash2 size={13} /> 清空回收站
            </button>
          ) : undefined
        }
      >
        {deletedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Trash2 size={26} className="text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              回收站是空的
            </p>
            <p className="mt-1 text-xs text-slate-400">删除的事件会先进入这里，避免误删</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {deletedEvents.map((event) => {
              const attachmentCount = attachments.filter((a) => a.eventId === event.id).length
              return (
                <li
                  key={event.id}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
                >
                  <span
                    className="mt-1 h-8 w-1 shrink-0 rounded-full opacity-60"
                    style={{ backgroundColor: colorHex(event.color) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      事件时间 {format(new Date(event.startAt), 'yyyy-MM-dd HH:mm')}
                      {attachmentCount > 0 ? ` · ${attachmentCount} 个附件` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      删除于{' '}
                      {event.deletedAt
                        ? format(new Date(event.deletedAt), 'yyyy-MM-dd HH:mm')
                        : '未知'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void restoreEvent(event.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      <RotateCcw size={12} /> 恢复
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurgeTarget(event)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={12} /> 彻底删除
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!purgeTarget}
        title="彻底删除事件"
        description={`「${purgeTarget?.title ?? ''}」及其附件将从本地数据库中永久删除，无法恢复。确定继续吗？`}
        confirmLabel="永久删除"
        danger
        onCancel={() => setPurgeTarget(null)}
        onConfirm={() => {
          if (purgeTarget) void purgeEvent(purgeTarget.id)
          setPurgeTarget(null)
        }}
      />

      <ConfirmDialog
        open={confirmEmpty}
        title="清空回收站"
        description={`将永久删除回收站中的 ${deletedEvents.length} 个事件及其附件，无法恢复。确定继续吗？`}
        confirmLabel="全部永久删除"
        danger
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={() => {
          setConfirmEmpty(false)
          void emptyTrash()
        }}
      />
    </>
  )
}
