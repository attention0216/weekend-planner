/* ======================================================
 *  TimelineNode — 时间线节点
 *  折叠/展开 · 点击呼出 AdjustBar · SourceBadge
 * ====================================================== */

import { useState } from 'react'
import SourceBadge from './SourceBadge'
import type { ScheduleItem } from '../types'

interface Props {
  item: ScheduleItem
  active: boolean
  editable: boolean
  onTap: () => void
}

export default function TimelineNode({ item, active, editable, onTap }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isCommute = item.type === 'commute'

  return (
    <button
      onClick={() => {
        if (editable && !isCommute) onTap()
        else setExpanded(!expanded)
      }}
      className="card-paper"
      aria-expanded={expanded}
      style={{
        display: 'flex', gap: 'var(--spacing-3)',
        alignItems: 'flex-start', width: '100%',
        textAlign: 'left', cursor: editable || !isCommute ? 'pointer' : 'default',
        border: active ? '2px solid var(--color-forest)' : '2px solid transparent',
        transition: 'border-color 0.2s',
      }}
    >
      {/* 时间圆 */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: isCommute ? 'var(--color-warm)' : 'var(--color-forest)',
        color: isCommute ? 'var(--color-ink)' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--font-size-caption)', fontWeight: 600,
        flexShrink: 0,
      }}>
        {item.time?.slice(0, 5) || '·'}
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-body)' }}>{item.name}</div>
        {item.location && (
          <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)', marginTop: 2 }}>
            {item.location}
          </div>
        )}
        {item.reason && (
          <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)', marginTop: 4 }}>
            {item.reason}
          </div>
        )}

        {/* 来源标记 */}
        {(item.source_type === 'xiaohongshu' || item.source_type === 'time_limited') && (
          <div style={{ marginTop: 6 }}>
            <SourceBadge type={item.source_type} />
          </div>
        )}

        {/* 展开详情 */}
        {expanded && (
          <div className="animate-fade-up" style={{
            marginTop: 'var(--spacing-3)', paddingTop: 'var(--spacing-3)',
            borderTop: '1px solid var(--color-warm)',
          }}>
            {item.business_hours && (
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)' }}>
                🕐 {item.business_hours}
              </p>
            )}
            {item.distance && (
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)' }}>
                📏 {item.distance}
              </p>
            )}
            {item.rating != null && (
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)' }}>
                ★ {item.rating}
              </p>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="btn-ghost"
                style={{ fontSize: 'var(--font-size-caption)', padding: 'var(--spacing-2) 0', marginTop: 4 }}
              >
                查看来源 →
              </a>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
