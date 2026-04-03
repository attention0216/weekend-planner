/* ======================================================
 *  MoodCard — 心情选择卡片
 *  2×2 网格，选中放大动效
 * ====================================================== */

import type { Mood } from '../types'

const MOODS: { mood: Mood; emoji: string; label: string; color: string }[] = [
  { mood: '放松', emoji: '🌿', label: '放松', color: 'var(--color-forest-light)' },
  { mood: '社交', emoji: '🎉', label: '社交', color: 'var(--color-amber)' },
  { mood: '冒险', emoji: '🏔️', label: '冒险', color: 'var(--color-red)' },
  { mood: '安静', emoji: '📖', label: '安静', color: 'var(--color-forest)' },
]

interface MoodCardProps {
  selected: Mood | null
  onSelect: (mood: Mood) => void
}

export default function MoodCard({ selected, onSelect }: MoodCardProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)', padding: 'var(--spacing-4) 0' }}
      role="radiogroup"
      aria-label="选择心情"
    >
      {MOODS.map(({ mood, emoji, label, color }) => {
        const active = selected === mood
        return (
          <button
            key={mood}
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(mood)}
            className="card-paper animate-fade-up"
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 'var(--spacing-2)',
              minHeight: 120, cursor: 'pointer',
              border: active ? `2px solid ${color}` : '2px solid transparent',
              transform: active ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: active ? 'var(--shadow-elevated)' : 'var(--shadow-card)',
            }}
          >
            <span style={{ fontSize: 40 }}>{emoji}</span>
            <span style={{
              fontSize: 'var(--font-size-body)', fontWeight: 600,
              color: active ? color : 'var(--color-ink)',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
