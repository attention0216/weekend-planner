/* ======================================================
 * 时间线组件 — 视觉分级 + 当前时间 + 一键导航
 * 主活动放大 · 回程虚线 · 正在进行高亮 · 导航到这里
 * ====================================================== */

import { useState, useMemo } from "react"
import type { ScheduleItem } from "../types"

interface Props {
  items: ScheduleItem[]
  activityUrl?: string
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  lunch:    { icon: "🍜", color: "bg-[#e8a852]", label: "午餐" },
  dinner:   { icon: "🍽️", color: "bg-[#c75c5c]", label: "晚餐" },
  activity: { icon: "🎯", color: "bg-[var(--color-accent)]", label: "主活动" },
  explore:  { icon: "🚶", color: "bg-[var(--color-tech-green)]", label: "探索" },
  commute:  { icon: "🚇", color: "bg-[#5b7bb5]", label: "回程" },
}

/* ── 高德导航 URI ── */
function navUrl(item: ScheduleItem): string {
  const dest = item.location || item.name
  return `https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(dest)}&mode=walk&callnative=1`
}

/* ── 高德搜索 URI ── */
function searchUrl(item: ScheduleItem): string | null {
  const kw = item.location || item.name
  return kw ? `https://uri.amap.com/search?keyword=${encodeURIComponent(kw)}` : null
}

/* ── 解析 HH:MM 为分钟数 ── */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/* ── 计算当前正在进行的项目索引 ── */
function useCurrentIndex(items: ScheduleItem[]): number {
  return useMemo(() => {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    let current = -1
    for (let i = 0; i < items.length; i++) {
      if (parseTime(items[i].time) <= nowMin) current = i
    }
    return current
  }, [items])
}

export function Timeline({ items, activityUrl }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const currentIdx = useCurrentIndex(items)

  return (
    <div className="relative ml-3">
      {/* 竖线 — 已完成部分用品牌色 */}
      <div className="absolute left-[6px] top-3 bottom-3 w-[1.5px] bg-[var(--color-divider)]" />
      {currentIdx >= 0 && (
        <div
          className="absolute left-[6px] top-3 w-[1.5px] bg-[var(--color-accent)] transition-all duration-500"
          style={{ height: `${Math.min((currentIdx + 1) / items.length * 100, 100)}%` }}
        />
      )}

      {items.map((item, i) => {
        const cfg = typeConfig[item.type] ?? { icon: "📌", color: "bg-[var(--color-t3)]", label: "其他" }
        const isMain = item.type === "activity"
        const isCommute = item.type === "commute"
        const isExpanded = expanded === i
        const nextItem = items[i + 1]
        const isCurrent = i === currentIdx
        const isPast = currentIdx >= 0 && i < currentIdx

        /* 圆点尺寸：主活动 15px，回程 9px，其余 11px */
        const dotSize = isMain ? "w-[15px] h-[15px]" : isCommute ? "w-[9px] h-[9px]" : "w-[11px] h-[11px]"
        const dotOffset = isMain ? "left-[-1px] top-[12px]" : isCommute ? "left-[1px] top-[16px]" : "left-0 top-[14px]"

        return (
          <div key={`${item.time}-${i}`} className={`relative pl-8 pb-5 last:pb-0 animate-fade-up`} style={{ animationDelay: `${i * 80}ms` }}>
            {/* 回程项上方虚线段 */}
            {isCommute && (
              <div className="absolute left-[6px] -top-2 h-4 w-[1.5px] border-l-[1.5px] border-dashed border-[var(--color-divider)]" />
            )}

            {/* 圆点 — 当前项脉动 */}
            <div className={`absolute ${dotOffset} ${dotSize} rounded-full ${cfg.color} ring-[3px] ring-[var(--color-bg)] ${isCurrent ? "animate-pulse" : ""} ${isPast ? "opacity-60" : ""}`} />

            {/* 正在进行标签 */}
            {isCurrent && (
              <div className="absolute -left-1 -top-5 text-[10px] font-semibold text-[var(--color-accent)] tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                进行中
              </div>
            )}

            {/* 卡片 */}
            <div
              onClick={() => setExpanded(isExpanded ? null : i)}
              className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                isMain
                  ? "bg-[var(--color-accent)] text-white shadow-card"
                  : isCommute
                    ? "bg-[#f0f3f8] shadow-card hover:shadow-card-hover border border-dashed border-[#c5cfe0]"
                    : "bg-[var(--color-bg-card)] shadow-card hover:shadow-card-hover"
              } ${isCurrent ? "ring-2 ring-[var(--color-accent)] ring-offset-2" : ""} ${isPast ? "opacity-70" : ""}`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-[12px] font-mono tabular-nums ${isMain ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                  {item.time}
                </span>
                <span className="text-[14px]">{cfg.icon}</span>
                <span className={`text-[14px] font-semibold tracking-[-0.02em] flex-1 ${isMain ? "text-white" : "text-[var(--color-t1)]"}`}>
                  {item.name}
                </span>
                {/* 类型标签 */}
                {isCommute && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#5b7bb5]/10 text-[#5b7bb5]">
                    回程
                  </span>
                )}
                {/* 展开指示器 */}
                <svg
                  width="12" height="12" viewBox="0 0 12 12"
                  className={`shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${isMain ? "text-white/40" : "text-[var(--color-t3)]"}`}
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </div>
              <p className={`text-[12px] leading-relaxed ${isMain ? "text-white/70" : "text-[var(--color-t3)]"}`}>
                {item.reason}
              </p>

              {/* 展开详情 */}
              {isExpanded && (
                <div className={`mt-3 pt-3 border-t flex flex-col gap-2 ${isMain ? "border-white/20" : "border-[var(--color-divider)]"}`}>
                  {item.location && (
                    <div className={`text-[12px] ${isMain ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                      📍 {item.location}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={navUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                        isMain
                          ? "bg-white/25 text-white hover:bg-white/35"
                          : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z" />
                      </svg>
                      {isCommute ? "导航到地铁站" : "导航到这里"}
                    </a>
                    {searchUrl(item) && (
                      <a
                        href={searchUrl(item)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          isMain
                            ? "bg-white/15 text-white/80 hover:bg-white/25"
                            : "bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
                        }`}
                      >
                        在地图中查看
                      </a>
                    )}
                    {isMain && activityUrl && (
                      <a
                        href={activityUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-white/15 text-white/80 hover:bg-white/25 transition-colors"
                      >
                        查看活动详情
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 下一站快捷导航 */}
            {nextItem && (
              <a
                href={navUrl(nextItem)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 ml-1 px-3 py-2 rounded-lg bg-[var(--color-bg-dim)] hover:bg-[var(--color-border)] transition-colors group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
                <span className="text-[11px] text-[var(--color-t3)] group-hover:text-[var(--color-accent)] transition-colors">
                  前往下一站 · {nextItem.name}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[var(--color-t3)] group-hover:text-[var(--color-accent)] ml-auto shrink-0 transition-colors">
                  <path d="M3 1l4 4-4 4" />
                </svg>
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
