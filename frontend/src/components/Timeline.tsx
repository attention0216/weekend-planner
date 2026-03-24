/* ======================================================
 * 时间线组件 — 精致垂直连线 + 一键导航
 * 展开详情 · 导航到这里 · 下一站快捷导航
 * ====================================================== */

import { useState } from "react"
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
}

/* ── 高德导航 URI（步行模式，从当前位置出发） ── */
function navUrl(item: ScheduleItem): string {
  const dest = item.location || item.name
  return `https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(dest)}&mode=walk&callnative=1`
}

/* ── 高德搜索 URI ── */
function searchUrl(item: ScheduleItem): string | null {
  const kw = item.location || item.name
  return kw ? `https://uri.amap.com/search?keyword=${encodeURIComponent(kw)}` : null
}

export function Timeline({ items, activityUrl }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="relative ml-3">
      {/* 竖线 */}
      <div className="absolute left-[5px] top-3 bottom-3 w-[1.5px] bg-[var(--color-divider)]" />

      {items.map((item, i) => {
        const cfg = typeConfig[item.type] ?? { icon: "📌", color: "bg-[var(--color-t3)]", label: "其他" }
        const isMain = item.type === "activity"
        const isExpanded = expanded === i
        const nextItem = items[i + 1]

        return (
          <div key={`${item.time}-${i}`} className="relative pl-8 pb-5 last:pb-0 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            {/* 圆点 */}
            <div className={`absolute left-0 top-[14px] w-[11px] h-[11px] rounded-full ${cfg.color} ring-[3px] ring-[var(--color-bg)]`} />

            {/* 卡片 — 可点击展开 */}
            <div
              onClick={() => setExpanded(isExpanded ? null : i)}
              className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                isMain
                  ? "bg-[var(--color-accent)] text-white shadow-card"
                  : "bg-[var(--color-bg-card)] shadow-card hover:shadow-card-hover"
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-[12px] font-mono tabular-nums ${isMain ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                  {item.time}
                </span>
                <span className="text-[14px]">{cfg.icon}</span>
                <span className={`text-[14px] font-semibold tracking-[-0.02em] flex-1 ${isMain ? "text-white" : "text-[var(--color-t1)]"}`}>
                  {item.name}
                </span>
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

              {/* 展开详情：地址 + 导航 + 查看 */}
              {isExpanded && (
                <div className={`mt-3 pt-3 border-t flex flex-col gap-2 ${isMain ? "border-white/20" : "border-[var(--color-divider)]"}`}>
                  {item.location && (
                    <div className={`text-[12px] ${isMain ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                      📍 {item.location}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {/* 导航到这里 — 最重要的按钮 */}
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
                      导航到这里
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

            {/* ── 下一站快捷导航条 ── */}
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
