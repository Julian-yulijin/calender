import { saveAs } from 'file-saver'
import {
  Bell,
  Database,
  Download,
  Info,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  Upload
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { api } from '../api'
import { backupFileName, buildJsonBackup, buildZipBackup } from '../lib/backup'
import { REMINDER_OPTIONS } from '../lib/constants'
import {
  currentPermission,
  ensureNotificationPermission,
  notificationsSupported
} from '../lib/notifications'
import { useCalendarStore } from '../store/useCalendarStore'
import type { Preferences } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal, selectClass, Toggle } from './ui'

const LAST_BACKUP_KEY = 'calendar.lastBackupAt'

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

function writeLastBackup() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  } catch {
    // 忽略存储失败
  }
}

export function SettingsModal() {
  const open = useCalendarStore((s) => s.settingsOpen)
  const setSettingsOpen = useCalendarStore((s) => s.setSettingsOpen)
  const prefs = useCalendarStore((s) => s.prefs)
  const setPrefs = useCalendarStore((s) => s.setPrefs)
  const events = useCalendarStore((s) => s.events)
  const deletedEvents = useCalendarStore((s) => s.deletedEvents)
  const attachments = useCalendarStore((s) => s.attachments)
  const setTrashOpen = useCalendarStore((s) => s.setTrashOpen)
  const importBackup = useCalendarStore((s) => s.importBackup)
  const clearAllData = useCalendarStore((s) => s.clearAllData)
  const pushToast = useCalendarStore((s) => s.pushToast)

  const [exporting, setExporting] = useState<'json' | 'zip' | null>(null)
  const [pendingImport, setPendingImport] = useState<File | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(readLastBackup())
  const [permission, setPermission] = useState(currentPermission())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const close = () => setSettingsOpen(false)

  const themeOptions: { value: Preferences['theme']; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: '亮色', icon: Sun },
    { value: 'dark', label: '暗色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor }
  ]

  const requestPermission = async () => {
    const granted = await ensureNotificationPermission()
    setPermission(currentPermission())
    pushToast(
      granted ? '浏览器通知已开启' : '未获得通知权限，可稍后在浏览器设置中允许',
      granted ? 'success' : 'info'
    )
  }

  const handleExportJson = () => {
    try {
      setExporting('json')
      const all = [...events, ...deletedEvents]
      const blob = buildJsonBackup(all)
      saveAs(blob, backupFileName('json'))
      writeLastBackup()
      setLastBackup(readLastBackup())
      pushToast(`已导出 JSON 备份（${all.length} 个事件，不含附件文件）`, 'success')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '导出失败', 'error')
    } finally {
      setExporting(null)
    }
  }

  const handleExportZip = async () => {
    try {
      setExporting('zip')
      const all = [...events, ...deletedEvents]
      const records = []
      for (const event of all) {
        records.push(...(await api.attachments.listByEvent(event.id)))
      }
      const blob = await buildZipBackup(all, records)
      saveAs(blob, backupFileName('zip'))
      writeLastBackup()
      setLastBackup(readLastBackup())
      pushToast(`已导出 ZIP 备份（${all.length} 个事件、${records.length} 个附件）`, 'success')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '导出失败', 'error')
    } finally {
      setExporting(null)
    }
  }

  const storageText = (() => {
    if (!navigator.storage?.estimate) return '浏览器本地存储'
    return 'IndexedDB + localStorage'
  })()

  return (
    <>
      <Modal open={open} onClose={close} title="设置" subtitle="个人偏好与本地数据管理" size="lg">
        <div className="space-y-6 pb-2">
          <section>
            <SectionTitle icon={<Palette size={14} />} title="外观" />
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const active = prefs.theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrefs({ theme: option.value })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle icon={<Database size={14} />} title="日历显示" />
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <SettingRow
                label="每周起始日"
                description="影响月视图与周视图的排列"
                control={
                  <select
                    value={prefs.weekStartsOn}
                    onChange={(e) =>
                      setPrefs({ weekStartsOn: Number(e.target.value) === 0 ? 0 : 1 })
                    }
                    className={`${selectClass} w-28 py-1.5 text-xs`}
                  >
                    <option value={1}>周一</option>
                    <option value={0}>周日</option>
                  </select>
                }
              />
              <SettingRow
                label="显示农历"
                description="在时钟与当日侧栏显示农历日期"
                control={
                  <Toggle
                    checked={prefs.showLunar}
                    onChange={(v) => setPrefs({ showLunar: v })}
                  />
                }
              />
              <SettingRow
                label="默认视图"
                description="打开应用时默认展示的视图"
                control={
                  <select
                    value={prefs.defaultView}
                    onChange={(e) =>
                      setPrefs({ defaultView: e.target.value as Preferences['defaultView'] })
                    }
                    className={`${selectClass} w-28 py-1.5 text-xs`}
                  >
                    <option value="dayGridMonth">月视图</option>
                    <option value="timeGridWeek">周视图</option>
                    <option value="timeGridDay">日视图</option>
                    <option value="listWeek">议程</option>
                  </select>
                }
              />
            </div>
          </section>

          <section>
            <SectionTitle icon={<Bell size={14} />} title="提醒与通知" />
            <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <SettingRow
                label="启用事件提醒"
                description="在事件开始前通过浏览器通知提醒"
                control={
                  <Toggle
                    checked={prefs.remindersEnabled}
                    onChange={(v) => {
                      setPrefs({ remindersEnabled: v })
                      if (v && permission !== 'granted') void requestPermission()
                    }}
                  />
                }
              />
              <SettingRow
                label="默认提醒时间"
                description="新建事件时预填的提醒"
                control={
                  <select
                    value={prefs.defaultReminder === null ? 'null' : String(prefs.defaultReminder)}
                    onChange={(e) =>
                      setPrefs({
                        defaultReminder: e.target.value === 'null' ? null : Number(e.target.value)
                      })
                    }
                    className={`${selectClass} w-32 py-1.5 text-xs`}
                  >
                    {REMINDER_OPTIONS.map((option) => (
                      <option
                        key={String(option.value)}
                        value={option.value === null ? 'null' : String(option.value)}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                }
              />
              <SettingRow
                label="浏览器通知权限"
                description={
                  !notificationsSupported()
                    ? '当前浏览器不支持 Notification API'
                    : permission === 'granted'
                      ? '已授权，可接收系统通知'
                      : permission === 'denied'
                        ? '已被拒绝，请到浏览器站点设置中允许通知'
                        : '尚未请求授权'
                }
                control={
                  <button
                    type="button"
                    disabled={!notificationsSupported() || permission === 'granted'}
                    onClick={() => void requestPermission()}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {permission === 'granted' ? '已开启' : '请求授权'}
                  </button>
                }
              />
              <p className="text-[11px] text-slate-400">
                提示：提醒需要应用页面处于打开状态；安装为 PWA 后体验更稳定。
              </p>
            </div>
          </section>

          <section>
            <SectionTitle icon={<Shield size={14} />} title="数据与备份" />
            <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  事件 {events.length}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  附件 {attachments.length}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  回收站 {deletedEvents.length}
                </span>
                <span className="text-slate-400">存储：{storageText}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={!!exporting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {exporting === 'zip' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  导出 ZIP（含附件）
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={!!exporting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {exporting === 'json' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  导出 JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Upload size={13} /> 导入备份
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.zip,application/json,application/zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) setPendingImport(file)
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    close()
                    setTrashOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw size={13} /> 回收站
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={13} /> 清空数据
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                上次备份：
                {lastBackup
                  ? new Date(lastBackup).toLocaleString('zh-CN', { hour12: false })
                  : '尚未备份，建议立即导出'}
              </p>
              <p className="text-[11px] leading-5 text-slate-400">
                ZIP 备份会把事件与附件文件一起打包；JSON 只包含事件与附件元数据。
                清空浏览器数据、更换浏览器或使用隐私模式会导致数据丢失，请定期备份。
              </p>
            </div>
          </section>

          <section>
            <SectionTitle icon={<Info size={14} />} title="关于" />
            <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <p>个人日历 v1.0 · 本地优先的个人事项管理工具</p>
              <p>无需登录、无云端依赖，数据保存在浏览器 IndexedDB。</p>
              <p>
                数据层通过统一 api 出口访问，当前适配器：
                <span className="ml-1 font-mono text-slate-600 dark:text-slate-300">
                  {api.adapterName}
                </span>
              </p>
              <p className="mt-1">
                快捷键：N 新建 · T 回到今天 · / 搜索 · Esc 关闭弹窗
              </p>
            </div>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingImport}
        title="导入备份"
        description="导入会与现有数据合并：相同 ID 的事件与附件将被覆盖，其余数据保留。确定要导入吗？"
        confirmLabel="开始导入"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) void importBackup(pendingImport)
          setPendingImport(null)
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空所有数据"
        description="将永久删除全部事件、回收站内容与附件文件，此操作不可恢复。建议先导出 ZIP 备份。确定继续吗？"
        confirmLabel="永久清空"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false)
          void clearAllData()
        }}
      />
    </>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      <span className="text-slate-400">{icon}</span>
      {title}
    </h3>
  )
}

function SettingRow({
  label,
  description,
  control
}: {
  label: string
  description: string
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
      </div>
      {control}
    </div>
  )
}
