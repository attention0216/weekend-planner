/* ======================================================
 * 活动发现页 — 有机极简风
 * AbortController 竞态保护 · 骨架屏 · 渐入动画
 * ====================================================== */

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { ActivityCard } from "../components/ActivityCard"
import { CategoryFilter } from "../components/CategoryFilter"
import { api } from "../api/client"
import type { Activity, Category } from "../types"

export function DiscoverPage() {
  const [category, setCategory] = useState<Category>("全部")
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    /* ── 取消上一次请求，防止竞态 ── */
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError("")
    api.listActivities(category, ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setActivities(data)
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e.message)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })

    return () => ctrl.abort()
  }, [category])

  return (
    <div className="flex flex-col gap-5">
      {/* 标题区 */}
      <div className="pt-2 pb-1">
        <h2 className="text-[26px] font-bold tracking-[-0.04em] leading-tight text-[var(--color-t1)]">
          发现周末好去处
        </h2>
        <p className="text-[14px] text-[var(--color-t3)] mt-1.5 tracking-[-0.01em]">
          选一个感兴趣的，剩下的交给我
        </p>
      </div>

      {/* 分类筛选 */}
      <CategoryFilter active={category} onChange={setCategory} />

      {/* 骨架屏加载态 */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-5 bg-[var(--color-bg-card)]">
              <div className="skeleton h-4 w-16 mb-3" />
              <div className="skeleton h-5 w-3/4 mb-2" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-3 w-1/2 mb-4" />
              <div className="flex justify-between items-center pt-3 border-t border-[var(--color-divider)]">
                <div className="skeleton h-5 w-12" />
                <div className="skeleton h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 错误态 */}
      {error && (
        <div className="bg-[#faf2f2] text-[var(--color-error)] text-[13px] rounded-xl p-5 text-center">
          加载失败：{error}
          <button
            onClick={() => setCategory(category)}
            className="block mx-auto mt-3 text-[var(--color-accent)] font-medium"
          >
            重试
          </button>
        </div>
      )}

      {/* 活动列表 */}
      {!loading && !error && (
        <>
          <div className="text-[12px] text-[var(--color-t3)] tracking-wide">
            {activities.length} 个活动
          </div>

          <div className="flex flex-col gap-3">
            {activities.map((a, i) => (
              <div key={a.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
                <ActivityCard activity={a} onPlan={(aid) => navigate(`/plan/${aid}`)} />
              </div>
            ))}
          </div>

          {activities.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[16px] font-semibold text-[var(--color-t1)] tracking-[-0.02em]">暂无活动</p>
              <p className="text-[13px] text-[var(--color-t3)] mt-1">换个分类试试？</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
