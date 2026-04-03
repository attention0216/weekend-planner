/* ======================================================
 *  AdjustBar — 底部调整操作栏
 *  换一个 · 不要了 · 换近点的 · 换便宜的
 * ====================================================== */

import type { AdjustAction } from '../types'

const ACTIONS: { action: AdjustAction; label: string; icon: string }[] = [
  { action: 'swap', label: '换一个', icon: '↻' },
  { action: 'remove', label: '不要了', icon: '✕' },
  { action: 'closer', label: '换近点的', icon: '◎' },
  { action: 'cheaper', label: '换便宜的', icon: '¥' },
]

interface AdjustBarProps {
  visible: boolean
  onAction: (action: AdjustAction) => void
  onClose: () => void
}

export default function AdjustBar({ visible, onAction, onClose }: AdjustBarProps) {
  if (!visible) return null

  return (
    <>
      {/* 遮罩 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.2)',
        }}
      />

      {/* 操作栏 */}
      <div
        className="animate-slide-up"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
          background: 'var(--color-paper)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          boxShadow: 'var(--shadow-elevated)',
          padding: 'var(--spacing-5) var(--spacing-4)',
          paddingBottom: 'calc(var(--spacing-5) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="content-narrow">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {ACTIONS.map(({ action, label, icon }) => (
              <button
                key={action}
                onClick={() => onAction(action)}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  background: 'var(--color-warm)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-3) var(--spacing-2)',
                  cursor: 'pointer', minHeight: 64,
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-ink)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
