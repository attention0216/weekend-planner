/* ======================================================
 *  StampPage — 集邮册
 *  时间线浏览 · 手动打卡 · 盖章动画
 * ====================================================== */

import { useState, useEffect } from 'react'
import { useUserStore } from '../stores/userStore'
import PillGroup from '../components/PillGroup'
import type { Stamp } from '../types'

const TYPE_OPTIONS = ['展览', '美食', '户外', '购物', '文化', '其他']
const AREA_OPTIONS = ['朝阳', '海淀', '东城', '西城', '丰台', '其他']

export default function StampPage() {
  const { accessToken } = useUserStore()
  const [stamps, setStamps] = useState<Stamp[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  /* 打卡表单 */
  const [type, setType] = useState('展览')
  const [area, setArea] = useState('朝阳')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justStamped, setJustStamped] = useState(false)

  function loadStamps() {
    fetch('/api/stamps', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => { setStamps(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadStamps() }, [accessToken])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await fetch('/api/stamps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ activity_type: type, area, note }),
      })
      setJustStamped(true)
      setTimeout(() => { setJustStamped(false); setShowForm(false); setNote('') }, 1500)
      loadStamps()
    } catch {
      /* 静默 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="animate-fade-up" style={{ paddingTop: 'var(--spacing-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--color-ink)' }}>
            集邮册
          </h1>
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-1)' }}>
            {stamps.length} 个印章
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary" style={{ fontSize: 'var(--font-size-caption)' }}>
          {showForm ? '取消' : '手动打卡'}
        </button>
      </div>

      {/* 打卡表单 */}
      {showForm && (
        <div className="card-paper animate-slide-up" style={{ marginTop: 'var(--spacing-4)' }}>
          {justStamped ? (
            <div className="animate-stamp" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
              <span style={{ fontSize: 64 }}>◉</span>
              <p style={{ fontWeight: 600, marginTop: 'var(--spacing-3)', color: 'var(--color-forest)' }}>盖章成功！</p>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600 }}>活动类型</h3>
              <PillGroup options={TYPE_OPTIONS} value={type} onChange={setType} compact />

              <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, marginTop: 'var(--spacing-4)' }}>区域</h3>
              <PillGroup options={AREA_OPTIONS} value={area} onChange={setArea} compact />

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="记点什么...（可选）"
                rows={2}
                style={{
                  width: '100%', marginTop: 'var(--spacing-4)',
                  padding: 'var(--spacing-3)',
                  border: '1.5px solid var(--color-muted)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-body)',
                  resize: 'none', outline: 'none',
                  background: 'var(--color-paper)',
                }}
              />

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', marginTop: 'var(--spacing-4)' }}
              >
                {submitting ? '打卡中...' : '盖章'}
              </button>
            </>
          )}
        </div>
      )}

      {/* 印章列表 */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : stamps.length === 0 ? (
        <div className="card" style={{ marginTop: 'var(--spacing-6)', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>◉</span>
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-3)' }}>
            完成第一次周末规划后，印章会自动出现在这里
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
          {stamps.map((stamp, i) => (
            <div
              key={stamp.id}
              className="card-paper animate-fade-up"
              style={{ animationDelay: `${i * 50}ms`, display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: stamp.source === 'auto' ? 'var(--color-forest)' : 'var(--color-amber)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                ◉
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-body)' }}>
                  {stamp.activity_type || '周末活动'}
                </div>
                <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)' }}>
                  {stamp.area} · {stamp.created_at?.slice(0, 10)}
                  {stamp.source === 'auto' && ' · AI 规划'}
                </div>
                {stamp.note && (
                  <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)', marginTop: 2 }}>
                    {stamp.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
