/* ============================================================
 *  PillGroup — 胶囊按钮组
 *  单选模式，点击即选中高亮
 * ============================================================ */

interface PillGroupProps {
  options: string[]
  value: string | null
  onChange: (value: string) => void
  compact?: boolean
}

export default function PillGroup({ options, value, onChange, compact }: PillGroupProps) {
  return (
    <div
      className="flex flex-wrap gap-3 justify-center"
      role="radiogroup"
      style={{ padding: compact ? 'var(--spacing-2) 0' : 'var(--spacing-4) 0' }}
    >
      {options.map(option => (
        <button
          key={option}
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={`pill ${value === option ? 'pill-selected' : ''}`}
          style={compact ? { padding: 'var(--spacing-2) var(--spacing-3)', fontSize: 'var(--font-size-caption)' } : {}}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
