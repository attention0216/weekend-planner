/* ======================================================
 *  DiscoverPage — 活动发现
 *  分类筛选 · 活动卡片列表 · SourceBadge
 * ====================================================== */

import { useState, useEffect } from 'react'
import { useUserStore } from '../stores/userStore'
import SourceBadge from '../components/SourceBadge'
import type { Activity } from '../types'

/* ── 分类筛选 ── */

function CategoryBar({ categories, active, onSelect }: {
  categories: string[]
  active: string
  onSelect: (c: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar" style={{ padding: 'var(--spacing-2) 0' }}>
      {['全部', ...categories].map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`pill ${active === cat ? 'pill-selected' : ''}`}
          style={{ fontSize: 'var(--font-size-caption)', padding: 'var(--spacing-1) var(--spacing-3)', minHeight: 36, whiteSpace: 'nowrap' }}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

/* ── 主页面 ── */

export default function DiscoverPage() {
  const { accessToken } = useUserStore()
  const [activities, setActivities] = useState<Activity[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

    Promise.all([
      fetch('/api/activities?' + new URLSearchParams(
        activeCategory !== '全部' ? { category: activeCategory } : {}
      ), { headers }).then(r => r.json()),
      categories.length === 0
        ? fetch('/api/categories', { headers }).then(r => r.json())
        : Promise.resolve(null),
    ]).then(([acts, cats]) => {
      setActivities(acts)
      if (cats) setCategories(cats.map((c: any) => c.name))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeCategory, accessToken, categories.length])

  return (
    <section className="animate-fade-up" style={{ paddingTop: 'var(--spacing-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 700, color: 'var(--color-ink)' }}>
        发现
      </h1>
      <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-2)' }}>
        周末有什么好玩的
      </p>

      <CategoryBar categories={categories} active={activeCategory} onSelect={setActiveCategory} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="card" style={{ marginTop: 'var(--spacing-6)', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>◎</span>
          <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-3)' }}>
            暂无活动，稍后再来看看
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
          {activities.map(act => {
            const expanded = expandedId === act.id
            return (
              <button
                key={act.id}
                onClick={() => setExpandedId(expanded ? null : act.id)}
                className="card-paper animate-fade-up"
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer', border: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-body)' }}>{act.title}</div>
                    <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)', marginTop: 4 }}>
                      {act.category} · {act.date}
                    </div>
                  </div>
                  <SourceBadge type={act.source_type} />
                </div>

                {expanded && (
                  <div className="animate-fade-up" style={{ marginTop: 'var(--spacing-3)', paddingTop: 'var(--spacing-3)', borderTop: '1px solid var(--color-warm)' }}>
                    {act.location && <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)' }}>📍 {act.location}</p>}
                    {act.time && <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)' }}>🕐 {act.time}</p>}
                    {act.description && <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-ink-light)', marginTop: 4 }}>{act.description}</p>}
                    {act.url && (
                      <a
                        href={act.url}
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
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
