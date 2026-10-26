export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

export function showBrowserNotification(title: string, body: string, tag?: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false

  const options: NotificationOptions = {
    body,
    tag,
    icon: './pwa-192.png',
    badge: './pwa-192.png'
  }

  try {
    // 移动端 Chrome / 已安装的 PWA 需要通过 Service Worker 展示通知
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration) {
            void registration.showNotification(title, options)
          } else {
            const notification = new Notification(title, options)
            notification.onclick = () => {
              window.focus()
              notification.close()
            }
          }
        })
        .catch(() => {
          try {
            new Notification(title, options)
          } catch {
            // 忽略通知失败，页面内 Toast 仍会提醒
          }
        })
      return true
    }

    const notification = new Notification(title, options)
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return true
  } catch {
    return false
  }
}
