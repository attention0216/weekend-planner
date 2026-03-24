/* ======================================================
 * 活动发现页 — 有机极简风
 * 附近推荐 · 分类筛选 · AbortController 竞态保护
 * ====================================================== */

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { ActivityCard } from "../components/ActivityCard"
import { CategoryFilter } from "../components/CategoryFilter"
import { api } from "../api/client"
import type { Activity, Category, Restaurant } from "../types"

export function DiscoverPage() {
  const [category, setCategory] = useState<Category>("全部")
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)

  /* ── 附近推荐状态 ── */
  const [nearbyMode, setNearbyMode] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyData, setNearbyData] = useState<{
    location_name: string
    nearby_restaurants: Restaurant[]
    nearby_spots: Array<{ name: string; address: string; type: string; distance: string }>
  } | null>(null)
  const [nearbyError, setNearbyError] = useState("")

  useEffect(() => {
    if (nearbyMode) return

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
  }, [category, nearbyMode])

  /* ── 获取附近推荐 ── */
  function handleNearby() {
    if (nearbyMode) {
      setNearbyMode(false)
      return
    }
    setNearbyMode(true)
    setNearbyLoading(true)
    setNearbyError("")

    if (!navigator.geolocation) {
      setNearbyError("你的浏览器不支持定位功能")
      setNearbyLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api.nearby(pos.coords.latitude, pos.coords.longitude)
          .then(setNearbyData)
          .catch((e) => setNearbyError(e.message))
          .finally(() => setNearbyLoading(false))
      },
      (err) => {
        const msg = err.code === 1 ? "请允许定位权限后重试" : "获取位置失败，请稍后重试"
        setNearbyError(msg)
        setNearbyLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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

      {/* 操作栏：附近 + 分类 */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleNearby}
          className={`self-start flex items-center gap-1.5 text-[13px] font-medium px-4 py-[7px] rounded-lg transition-all duration-200 ${
            nearbyMode
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          {nearbyMode ? "返回活动列表" : "附近推荐"}
        </button>

        {!nearbyMode && <CategoryFilter active={category} onChange={setCategory} />}
      </div>

      {/* ── 附近推荐视图 ── */}
      {nearbyMode && (
        <div className="flex flex-col gap-4">
          {nearbyLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
              <p className="text-[13px] text-[var(--color-t3)] animate-pulse">正在获取你的位置...</p>
            </div>
          )}

          {nearbyError && (
            <div className="bg-[#faf2f2] text-[var(--color-error)] text-[13px] rounded-xl p-5 text-center">
              {nearbyError}
            </div>
          )}

          {nearbyData && !nearbyLoading && (
            <>
              <div className="text-[12px] text-[var(--color-t3)]">
                📍 {nearbyData.location_name}
              </div>

              {/* 附近餐厅 */}
              {nearbyData.nearby_restaurants.length > 0 && (
                <div>
                  <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[var(--color-t1)] mb-3">附近吃什么</h3>
                  <div className="flex flex-col gap-2">
                    {nearbyData.nearby_restaurants.map((r, i) => (
                      <div key={`${r.name}-${i}`} className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[14px] font-semibold text-[var(--color-t1)]">{r.name}</span>
                          {r.rating > 0 && <span className="text-[12px] font-medium text-[var(--color-warning)]">{r.rating}分</span>}
                        </div>
                        {r.reason && <p className="text-[12px] text-[var(--color-t2)] leading-relaxed mb-2">{r.reason}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.per_capita > 0 && <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-dim)] text-[var(--color-t3)]">人均¥{r.per_capita}</span>}
                          {r.tags?.map((tag) => <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)]">{tag}</span>)}
                          {r.distance_desc && <span className="text-[11px] text-[var(--color-t3)]">{r.distance_desc}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 附近景点 */}
              {nearbyData.nearby_spots.length > 0 && (
                <div>
                  <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[var(--color-t1)] mb-3">附近逛什么</h3>
                  <div className="flex flex-col gap-2">
                    {nearbyData.nearby_spots.map((s, i) => (
                      <div key={`${s.name}-${i}`} className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4">
                        <div className="text-[14px] font-semibold text-[var(--color-t1)]">{s.name}</div>
                        <div className="text-[12px] text-[var(--color-t3)] mt-1">{s.distance}m · {s.address}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nearbyData.nearby_restaurants.length === 0 && nearbyData.nearby_spots.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[16px] font-semibold text-[var(--color-t1)]">附近暂无推荐</p>
                  <p className="text-[13px] text-[var(--color-t3)] mt-1">试试切换到活动列表看看？</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 活动列表视图 ── */}
      {!nearbyMode && (
        <>
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
        </>
      )}
    </div>
  )
}
