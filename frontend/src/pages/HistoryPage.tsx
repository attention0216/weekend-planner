/* ======================================================
 * 规划历史页 — 最近规划过的活动
 * ====================================================== */

import { useState, useEffect } from "react"
import { useNavigate } from "react-router"

interface HistoryEntry {
  id: string
  title: string
  date: string
  category: string
  location: string
  planTime: string
}

/* ── 类型标签 emoji ── */
const CAT_EMOJI: Record<string, string> = {
  展览: "🎨", 运动: "⚽", 户外: "🏕️", 读书会: "📖", 市集: "🛍️",
  音乐: "🎵", 脱口秀: "🎤", 咖啡: "☕", 电影: "🎬", 公园: "🌿",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("plan_history") || "[]")
      setHistory(data)
    } catch { /* ignore */ }
  }, [])

  function handleClear() {
    localStorage.removeItem("plan_history")
    setHistory([])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-extrabold tracking-[-0.05em] leading-[1.1] text-[var(--color-t1)]">
          历史
        </h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[12px] text-[var(--color-t3)] hover:text-[var(--color-error)] transition-colors"
          >
            清空
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[18px] font-bold text-[var(--color-t1)]">还没有规划过</p>
          <p className="text-[13px] text-[var(--color-t3)] mt-2">去发现页选个活动试试</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 text-[14px] font-medium text-[var(--color-accent)]"
          >
            去发现
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((h, i) => (
            <button
              key={`${h.id}-${i}`}
              onClick={() => navigate(`/plan/${h.id}`)}
              className="shadow-card bg-[var(--color-bg-card)] rounded-xl p-4 text-left animate-fade-up transition-shadow hover:shadow-card-hover"
              style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{CAT_EMOJI[h.category] || "📌"}</span>
                <span className="text-[14px] font-semibold text-[var(--color-t1)] tracking-[-0.02em] line-clamp-1">
                  {h.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--color-t3)]">
                <span>{h.category}</span>
                {h.location && <><span>·</span><span className="line-clamp-1">{h.location}</span></>}
                <span className="ml-auto shrink-0">{relativeTime(h.planTime)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
