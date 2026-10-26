import { useEffect, useRef } from 'react'

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  )
}

const escapeStack: symbol[] = []

/**
 * 多层弹窗时只有最上层响应 Esc，避免嵌套确认框同时关闭父级弹窗。
 */
export function useEscapeKey(enabled: boolean, handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const id = Symbol('dialog')
    escapeStack.push(id)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escapeStack[escapeStack.length - 1] !== id) return
      e.preventDefault()
      e.stopImmediatePropagation()
      handlerRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      const index = escapeStack.indexOf(id)
      if (index >= 0) escapeStack.splice(index, 1)
    }
  }, [enabled])
}

export function useInterval(callback: () => void, delay: number | null) {
  useEffect(() => {
    if (delay === null) return
    const id = window.setInterval(callback, delay)
    return () => window.clearInterval(id)
  }, [callback, delay])
}
