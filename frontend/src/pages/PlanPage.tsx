/* ======================================================
 * 日程规划页 — V6 沉浸式体验
 * 缓存优先 · 执行模式 · 内嵌对话 · 收藏 · 分享
 * ====================================================== */

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router"
import { Timeline } from "../components/Timeline"
import { ChatDrawer } from "../components/ChatDrawer"
import { api } from "../api/client"
import { getCachedPlan, setCachedPlan, clearPlanCache } from "../api/planCache"
import { formatDate } from "../utils"
import type { Plan, ScheduleItem } from "../types"

/* ── 收藏管理 ── */
function isFavorite(id: string): boolean {
  try {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]
    return favs.includes(id)
  } catch { return false }
}

function toggleFavorite(id: string): boolean {
  try {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]
    localStorage.setItem("favorites", JSON.stringify(next))
    return next.includes(id)
  } catch { return false }
}

/* ── 解析 HH:MM 为分钟数 ── */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/* ── 自动检测当前步骤 ── */
function detectCurrentStep(items: ScheduleItem[]): number {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let idx = 0
  for (let i = 0; i < items.length; i++) {
    if (parseTime(items[i].time) <= nowMin) idx = i
  }
  return idx
}

/* ── 高德导航 URI ── */
function navUrl(item: ScheduleItem): string {
  const dest = item.location || item.name
  return `https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(dest)}&mode=walk&callnative=1`
}

/* ── 执行模式浮窗 ── */
const typeEmoji: Record<string, string> = {
  lunch: "🍜", dinner: "🍽️", activity: "🎯", explore: "🚶", commute: "🚇",
}

function ExecutionBar({ items, onExit }: { items: ScheduleItem[]; onExit: () => void }) {
  const [stepIdx, setStepIdx] = useState(() => detectCurrentStep(items))
  const item = items[stepIdx]
  const nextItem = items[stepIdx + 1]
  const progress = ((stepIdx + 1) / items.length) * 100

  const goPrev = useCallback(() => setStepIdx((i) => Math.max(0, i - 1)), [])
  const goNext = useCallback(() => setStepIdx((i) => Math.min(items.length - 1, i + 1)), [items.length])

  if (!item) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] safe-bottom animate-slide-up">
      {/* 进度条 */}
      <div className="h-[3px] bg-[var(--color-border)]">
        <div
          className="h-full progress-animated rounded-r-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="glass border-t border-[var(--color-border)]/50">
        <div className="max-w-[680px] mx-auto px-4 py-3">
          {/* 当前步骤信息 */}
          <div className="flex items-center gap-3">
            {/* 步骤指示 */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[20px]">{typeEmoji[item.type] ?? "📌"}</span>
              <span className="text-[10px] font-mono text-[var(--color-t3)] tabular-nums mt-0.5">
                {stepIdx + 1}/{items.length}
              </span>
            </div>

            {/* 步骤详情 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-mono tabular-nums text-[var(--color-accent)] font-semibold">
                  {item.time}
                </span>
                <span className="text-[14px] font-bold text-[var(--color-t1)] truncate">
                  {item.name}
                </span>
              </div>
              {nextItem && (
                <div className="text-[11px] text-[var(--color-t3)] mt-0.5 truncate">
                  下一站 · {nextItem.time} {nextItem.name}
                </div>
              )}
              {!nextItem && (
                <div className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">
                  最后一站，享受旅程 ✨
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 上一步 */}
              <button
                onClick={goPrev}
                disabled={stepIdx === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-dim)] disabled:opacity-30 transition-colors"
                aria-label="上一步"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-t2)" strokeWidth="2" strokeLinecap="round"><path d="M8 3L4 7l4 4" /></svg>
              </button>

              {/* 导航 */}
              <a
                href={navUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-card animate-nav-pulse"
                aria-label="导航到这里"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
              </a>

              {/* 下一步 */}
              <button
                onClick={goNext}
                disabled={stepIdx === items.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-dim)] disabled:opacity-30 transition-colors"
                aria-label="下一步"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-t2)" strokeWidth="2" strokeLinecap="round"><path d="M6 3l4 4-4 4" /></svg>
              </button>

              {/* 退出执行模式 */}
              <button
                onClick={onExit}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-dim)] ml-1 transition-colors"
                aria-label="退出执行模式"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-t3)" strokeWidth="2" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
              </button>
            </div>
          </div>

          {/* 步骤点指示器 */}
          <div className="flex items-center gap-1 mt-2 justify-center">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setStepIdx(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === stepIdx
                    ? "w-4 h-1.5 bg-[var(--color-accent)]"
                    : i < stepIdx
                      ? "w-1.5 h-1.5 bg-[var(--color-accent)]/40"
                      : "w-1.5 h-1.5 bg-[var(--color-border)]"
                }`}
                aria-label={`步骤 ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [chatOpen, setChatOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [faved, setFaved] = useState(false)
  const [shared, setShared] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!id) return
    setFaved(isFavorite(id))

    const cached = getCachedPlan(id)
    if (cached) {
      setPlan(cached)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError("")
    api.createPlan(id, ctrl.signal)
      .then((p) => {
        setPlan(p)
        setCachedPlan(id, p)
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e.message)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })

    return () => ctrl.abort()
  }, [id])

  /* ── 分享日程到剪贴板 ── */
  function handleShare() {
    if (!plan) return
    const text = `📅 ${plan.activity.title}\n${formatDate(plan.activity.date)}${plan.activity.time ? ` ${plan.activity.time}` : ""}\n📍 ${plan.activity.location || ""}\n\n🗓 日程安排：\n${plan.schedule.map((s) => `${s.time} ${s.name} — ${s.reason}`).join("\n")}`
    navigator.clipboard.writeText(text).then(() => {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }).catch(() => {
      /* fallback: 选择文本 */
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    })
  }

  /* ── 重新规划（清缓存） ── */
  function handleReplan() {
    if (!id) return
    clearPlanCache(id)
    setPlan(null)
    setLoading(true)
    setError("")
    const ctrl = new AbortController()
    abortRef.current = ctrl
    api.createPlan(id, ctrl.signal)
      .then((p) => { setPlan(p); setCachedPlan(id, p) })
      .catch((e) => { if (!(e instanceof DOMException)) setError(e.message) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
  }
  function handleScheduleUpdate(newSchedule: ScheduleItem[]) {
    if (!plan) return
    const updated = { ...plan, schedule: newSchedule }
    setPlan(updated)
    if (id) setCachedPlan(id, updated)
  }

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
    <>
      <div className="flex flex-col gap-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1 -ml-1 min-h-[44px]"
            aria-label="返回活动列表"
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
              <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回
          </button>

          {/* 收藏按钮 */}
          <button
            onClick={() => id && setFaved(toggleFavorite(id))}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={faved ? "取消收藏" : "收藏"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={faved ? "var(--color-accent)" : "none"} stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

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
          {activity.url && (
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-[12px] text-white/60 hover:text-white/90 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7M7 1h4v4M11 1L5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              查看活动详情
            </a>
          )}
        </div>

        {/* 时间线 */}
        <div>
          <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-t1)] mb-4">
            你的一天
          </h3>
          <Timeline items={schedule} activityUrl={activity.url} />
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
                  key={`${r.name}-${i}`}
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
                    {r.tags?.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
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
                <div key={`${s.name}-${i}`} className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4">
                  <div className="text-[14px] font-semibold text-[var(--color-t1)]">{s.name}</div>
                  <div className="text-[12px] text-[var(--color-t3)] mt-1">{s.distance}m · {s.address}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作区 */}
        <div className="flex flex-col gap-3 pt-2">
          {/* 主CTA: 开始行程 / 调整日程 */}
          <div className="flex gap-3">
            <button
              onClick={() => setExecuting(true)}
              className="flex-[2] py-[13px] gradient-hero text-white rounded-xl text-[14px] font-semibold transition-all duration-200 tracking-[-0.01em] active:scale-[0.98] flex items-center justify-center gap-2 shadow-card"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
              开始行程
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className="flex-1 py-[13px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] rounded-xl text-[14px] font-semibold transition-colors duration-200 tracking-[-0.01em] active:scale-[0.98]"
            >
              调整
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className={`flex-1 py-[13px] rounded-xl text-[14px] font-medium text-center transition-colors duration-200 ${
                shared
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
              }`}
            >
              {shared ? "已复制 ✓" : "分享日程"}
            </button>
            <button
              onClick={handleReplan}
              className="flex-1 py-[13px] bg-[var(--color-bg-dim)] text-[var(--color-t2)] rounded-xl text-[14px] font-medium text-center transition-colors duration-200 hover:bg-[var(--color-border)]"
            >
              重新规划
            </button>
          </div>
        </div>
      </div>

      {/* 执行模式浮窗 */}
      {executing && (
        <ExecutionBar items={schedule} onExit={() => setExecuting(false)} />
      )}

      {/* 内嵌对话抽屉 — 不跳页！ */}
      <ChatDrawer
        activityId={id || ""}
        activity={activity}
        schedule={schedule}
        onScheduleUpdate={handleScheduleUpdate}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
