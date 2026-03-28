/* ======================================================
 * 活动发现页 — V8 天气感知 + 心情发现
 * 天气卡片 · 心情气泡 · 帮我选 FAB · 动态分类
 * ====================================================== */

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { ActivityCard } from "../components/ActivityCard"
import { CategoryFilter } from "../components/CategoryFilter"
import { api } from "../api/client"
import type { Activity, Restaurant } from "../types"

/* ── 滚动位置记忆 ── */
const SCROLL_KEY = "discover_scroll"
function saveScroll() { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)) }
function restoreScroll() {
  const y = Number(sessionStorage.getItem(SCROLL_KEY) || 0)
  if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y))
}

/* ── 心情配置 ── */
const MOODS = [
  { key: "relax", label: "想放松", emoji: "🧘" },
  { key: "social", label: "想社交", emoji: "🎉" },
  { key: "adventure", label: "想冒险", emoji: "🏔️" },
  { key: "quiet", label: "想安静", emoji: "📚" },
] as const

type WeatherDay = {
  date: string; condition: string; code: string; emoji: string
  temp_high: number; temp_low: number; prefer_indoor: boolean
}

export function DiscoverPage() {
  const [category, setCategory] = useState("全部")
  const [mood, setMood] = useState("")
  const [search, setSearch] = useState("")
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [weather, setWeather] = useState<WeatherDay[]>([])
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)
  const restoredRef = useRef(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  /* ── 附近推荐 ── */
  const [nearbyMode, setNearbyMode] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyData, setNearbyData] = useState<{
    location_name: string
    nearby_restaurants: Restaurant[]
    nearby_spots: Array<{ name: string; address: string; type: string; distance: string }>
  } | null>(null)
  const [nearbyError, setNearbyError] = useState("")

  /* ── 加载天气 ── */
  useEffect(() => {
    api.weather().then(setWeather).catch(() => {})
  }, [])

  /* ── 加载活动 ── */
  useEffect(() => {
    if (nearbyMode) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError("")
    api.listActivities(mood ? "" : category, ctrl.signal, mood || undefined, search || undefined)
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setActivities(data)
          if (!restoredRef.current) { restoredRef.current = true; setTimeout(restoreScroll, 50) }
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e.message)
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [category, nearbyMode, mood, search])

  function handlePlan(aid: string) { saveScroll(); navigate(`/plan/${aid}`) }

  function handleRefresh() {
    setRefreshing(true)
    api.refresh()
      .then(() => api.listActivities(category))
      .then(setActivities)
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }

  /* ── 帮我选：随机活动直接规划 ── */
  function handleLucky() {
    if (activities.length === 0) return
    const pick = activities[Math.floor(Math.random() * activities.length)]
    saveScroll()
    navigate(`/plan/${pick.id}`)
  }

  function handleMood(key: string) {
    setMood((prev) => prev === key ? "" : key)
    setCategory("全部")
  }

  function handleCategory(cat: string) {
    setCategory(cat)
    setMood("")
    setSearch("")
  }

  function handleSearch(value: string) {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      if (value) { setMood(""); setCategory("全部") }
    }, 300)
  }

  /* ── 附近推荐 ── */
  function handleNearby() {
    if (nearbyMode) { setNearbyMode(false); return }
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
        const msg = err.code === 1 ? "请允许定位权限后重试" : "获取位置失败"
        setNearbyError(msg)
        setNearbyLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const todayWeather = weather[0]

  return (
    <div className="flex flex-col gap-5">
      {/* ── 天气卡片 ── */}
      {todayWeather && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--color-bg-card)] shadow-card animate-fade-up">
          <span className="text-[28px]">{todayWeather.emoji}</span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[var(--color-t1)]">
              {todayWeather.condition} {todayWeather.temp_low}°~{todayWeather.temp_high}°
            </div>
            <div className="text-[12px] text-[var(--color-t3)]">
              {todayWeather.prefer_indoor ? "适合室内活动" : "适合户外出行"}
            </div>
          </div>
          {weather.length > 1 && (
            <div className="flex gap-2">
              {weather.slice(1, 3).map((w) => (
                <div key={w.date} className="text-center">
                  <div className="text-[16px]">{w.emoji}</div>
                  <div className="text-[10px] text-[var(--color-t3)]">{w.temp_high}°</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Apple 风格大标题 ── */}
      <div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.05em] leading-[1.1] text-[var(--color-t1)]">
          发现
        </h1>
        <p className="text-[14px] text-[var(--color-t3)] mt-1">
          选一个活动，AI 帮你规划完整一天
        </p>
      </div>

      {/* ── 心情气泡 ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => handleMood(m.key)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
              mood === m.key
                ? "bg-[var(--color-accent)] text-white shadow-card"
                : "bg-[var(--color-bg-card)] text-[var(--color-t2)] shadow-card hover:shadow-card-hover"
            }`}
          >
            <span>{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── 搜索栏 ── */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-t3)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="搜索活动..."
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] text-[13px] text-[var(--color-t1)] placeholder:text-[var(--color-t3)] shadow-card outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-shadow"
        />
      </div>

      {/* ── 操作栏 ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNearby}
            className={`flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-[6px] rounded-full transition-all duration-200 ${
              nearbyMode
                ? "bg-[var(--color-t1)] text-white"
                : "bg-[var(--color-bg-dim)] text-[var(--color-t3)] hover:text-[var(--color-t2)]"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            {nearbyMode ? "返回列表" : "附近"}
          </button>
        </div>

        {!nearbyMode && !mood && (
          <CategoryFilter
            active={category}
            onChange={handleCategory}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {mood && (
          <div className="text-[12px] text-[var(--color-accent)] font-medium">
            {MOODS.find((m) => m.key === mood)?.emoji} 为你筛选「{MOODS.find((m) => m.key === mood)?.label}」相关活动
          </div>
        )}
      </div>

      {/* ── 附近推荐 ── */}
      {nearbyMode && (
        <div className="flex flex-col gap-4">
          {nearbyLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-t1)] rounded-full animate-spin" />
              <p className="text-[13px] text-[var(--color-t3)]">获取你的位置...</p>
            </div>
          )}
          {nearbyError && (
            <div className="bg-[#faf2f2] text-[var(--color-error)] text-[13px] rounded-xl p-5 text-center">{nearbyError}</div>
          )}
          {nearbyData && !nearbyLoading && (
            <>
              <div className="text-[13px] text-[var(--color-t3)] font-medium">{nearbyData.location_name}</div>
              {nearbyData.nearby_restaurants.length > 0 && (
                <div>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-3">附近吃什么</h3>
                  <div className="flex flex-col gap-2">
                    {nearbyData.nearby_restaurants.map((r, i) => (
                      <div key={`${r.name}-${i}`} className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[14px] font-semibold text-[var(--color-t1)]">{r.name}</span>
                          {r.rating > 0 && <span className="text-[12px] font-medium text-[var(--color-warning)]">{r.rating}分</span>}
                        </div>
                        {r.reason && <p className="text-[12px] text-[var(--color-t2)] leading-relaxed mb-2">{r.reason}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.per_capita > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-bg-dim)] text-[var(--color-t3)]">人均¥{r.per_capita}</span>}
                          {r.tags?.map((tag) => <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">{tag}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nearbyData.nearby_spots.length > 0 && (
                <div>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-3">附近逛什么</h3>
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
            </>
          )}
        </div>
      )}

      {/* ── 活动列表 ── */}
      {!nearbyMode && (
        <>
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-5 bg-[var(--color-bg-card)]">
                  <div className="skeleton h-4 w-16 mb-3 rounded-full" />
                  <div className="skeleton h-5 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2 mb-4" />
                  <div className="flex justify-between items-center pt-3">
                    <div className="skeleton h-5 w-12" />
                    <div className="skeleton h-8 w-24 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-[#faf2f2] text-[var(--color-error)] text-[13px] rounded-xl p-5 text-center">
              加载失败：{error}
              <button
                onClick={() => { setError(""); setLoading(true); setCategory((c) => c === "全部" ? "全部" : c); setTimeout(() => setCategory(category), 0) }}
                className="block mx-auto mt-3 text-[var(--color-accent)] font-medium"
              >
                点击重试
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="text-[12px] text-[var(--color-t3)] font-medium">
                {activities.length} 个活动
              </div>
              <div className="flex flex-col gap-3">
                {activities.map((a, i) => (
                  <div key={a.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}>
                    <ActivityCard activity={a} onPlan={handlePlan} />
                  </div>
                ))}
              </div>
              {activities.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-[18px] font-bold text-[var(--color-t1)]">暂无活动</p>
                  <p className="text-[13px] text-[var(--color-t3)] mt-2">换个心情或分类试试</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── 帮我选 FAB ── */}
      {!nearbyMode && activities.length > 0 && (
        <button
          onClick={handleLucky}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full gradient-hero text-white shadow-elevated flex items-center justify-center z-40 active:scale-95 transition-transform animate-scale-in"
          aria-label="帮我选"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM17 17m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
          </svg>
        </button>
      )}
    </div>
  )
}
