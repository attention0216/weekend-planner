/* ======================================================
 * 日程规划页 — 有机极简风
 * 品牌色 hero · 时间线 · 小红书餐厅推荐
 * ====================================================== */

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Timeline } from "../components/Timeline"
import { api } from "../api/client"
import { formatDate } from "../utils"
import type { Plan } from "../types"

export function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError("")
    api.createPlan(id)
      .then(setPlan)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  /* ── 加载态：骨架屏 + 进度提示 ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="skeleton h-4 w-16" />
        <div className="rounded-2xl p-6 bg-[var(--color-bg-dim)]">
          <div className="skeleton h-3 w-24 mb-3" />
          <div className="skeleton h-6 w-3/4 mb-2" />
          <div className="skeleton h-4 w-1/2" />
        </div>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          <p className="text-[13px] text-[var(--color-t3)] animate-pulse">
            正在搜索附近餐厅和景点，为你编排日程...
          </p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="ml-3 pl-8 pb-4">
            <div className="skeleton h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-[#faf2f2] text-[var(--color-error)] text-[13px] rounded-xl p-5 mb-5">
          规划失败：{error}
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-[13px] text-[var(--color-accent)] font-medium"
        >
          返回活动列表
        </button>
      </div>
    )
  }

  if (!plan) return null

  const { activity, schedule, nearby_restaurants, nearby_spots } = plan

  return (
    <div className="flex flex-col gap-6">
      {/* 返回 */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1 -ml-1"
      >
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
          <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        返回
      </button>

      {/* Hero 卡片 */}
      <div className="bg-[var(--color-accent)] rounded-2xl p-6 text-white animate-fade-up">
        <div className="text-[11px] font-medium text-white/50 tracking-[0.05em] uppercase mb-2">
          {formatDate(activity.date)} · {activity.category}
        </div>
        <h2 className="text-[20px] font-bold tracking-[-0.03em] leading-tight mb-2">
          {activity.title}
        </h2>
        <div className="flex flex-col gap-1 text-[13px] text-white/70">
          {activity.location && <span>📍 {activity.location}</span>}
          <span>
            {activity.time}{activity.time ? " · " : ""}
            {activity.price === 0 ? "免费" : `¥${activity.price}`}
          </span>
        </div>
        {activity.description && (
          <p className="text-[12px] text-white/50 mt-3 leading-relaxed line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      {/* 时间线 */}
      <div>
        <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-4">
          你的一天
        </h3>
        <Timeline items={schedule} />
      </div>

      {/* 小红书餐厅推荐 */}
      {nearby_restaurants.length > 0 && (
        <div>
          <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-3">
            附近吃什么
          </h3>
          <div className="flex flex-col gap-2">
            {nearby_restaurants.slice(0, 4).map((r, i) => (
              <div
                key={i}
                className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[14px] font-semibold text-[var(--color-t1)] tracking-[-0.02em]">
                    {r.name}
                  </span>
                  {r.rating > 0 && (
                    <span className="text-[12px] font-medium text-[var(--color-warning)]">
                      {r.rating}分
                    </span>
                  )}
                </div>
                {r.reason && (
                  <p className="text-[12px] text-[var(--color-t2)] leading-relaxed mb-2">
                    {r.reason}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {r.per_capita > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-dim)] text-[var(--color-t3)]">
                      人均¥{r.per_capita}
                    </span>
                  )}
                  {r.tags?.map((tag, j) => (
                    <span key={j} className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      {tag}
                    </span>
                  ))}
                  {r.distance_desc && (
                    <span className="text-[11px] text-[var(--color-t3)]">
                      {r.distance_desc}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 附近景点 */}
      {nearby_spots.length > 0 && (
        <div>
          <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-3">
            附近逛什么
          </h3>
          <div className="flex flex-col gap-2">
            {nearby_spots.map((s, i) => (
              <div key={i} className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4">
                <div className="text-[14px] font-semibold text-[var(--color-t1)]">{s.name}</div>
                <div className="text-[12px] text-[var(--color-t3)] mt-1">{s.distance}m · {s.address}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作区 */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => navigate(`/chat/${id}`, { state: { schedule, activity } })}
          className="w-full py-[13px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl text-[14px] font-semibold transition-colors duration-200 tracking-[-0.01em]"
        >
          调整日程
        </button>

        {activity.location && (
          <a
            href={`https://uri.amap.com/search?keyword=${encodeURIComponent(activity.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-[13px] bg-[var(--color-bg-dim)] text-[var(--color-accent)] rounded-xl text-[14px] font-medium text-center block transition-colors duration-200 hover:bg-[var(--color-border)]"
          >
            在高德地图中查看
          </a>
        )}
      </div>
    </div>
  )
}
