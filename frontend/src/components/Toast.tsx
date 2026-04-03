/* ======================================================
 *  Toast — 全局反馈通知
 *  成功(绿) · 错误(红+重试) · 顶部滑入 · 2s 自动消失
 * ====================================================== */

import { useState, useEffect, useCallback } from 'react'

type ToastType = 'success' | 'error'

interface ToastState {
  message: string
  type: ToastType
  onRetry?: () => void
}

let _show: (t: ToastState) => void = () => {}

/* ── 全局调用接口 ── */

export function showToast(message: string, type: ToastType = 'success', onRetry?: () => void) {
  _show({ message, type, onRetry })
}

/* ── 组件 ── */

export default function Toast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)

  const show = useCallback((t: ToastState) => {
    setToast(t)
    setVisible(true)
  }, [])

  useEffect(() => { _show = show }, [show])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [visible, toast])

  if (!toast || !visible) return null

  const isError = toast.type === 'error'

  return (
    <div
      role="alert"
      aria-live="polite"
      className="animate-slide-up"
      style={{
        position: 'fixed', top: 'env(safe-area-inset-top, 12px)',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: 'calc(100vw - 32px)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        borderRadius: 'var(--radius-md)',
        background: isError ? 'var(--color-red)' : 'var(--color-forest)',
        color: 'white', fontSize: 'var(--font-size-caption)',
        fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span>{toast.message}</span>
      {isError && toast.onRetry && (
        <button
          onClick={() => { setVisible(false); toast.onRetry?.() }}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-small)', cursor: 'pointer',
          }}
        >
          重试
        </button>
      )}
    </div>
  )
}
