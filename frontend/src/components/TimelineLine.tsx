/* ======================================================
 *  TimelineLine — 时间线连接线
 *  森林绿竖线 + 交通时间标注
 * ====================================================== */

interface Props {
  transitMinutes?: number
}

export default function TimelineLine({ transitMinutes }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
      padding: 'var(--spacing-1) 0 var(--spacing-1) 19px',
    }}>
      <div style={{
        width: 2, height: 32, background: 'var(--color-forest)',
        opacity: 0.3, borderRadius: 1,
      }} />
      {transitMinutes != null && transitMinutes > 0 && (
        <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-muted)' }}>
          {transitMinutes} 分钟
        </span>
      )}
    </div>
  )
}
