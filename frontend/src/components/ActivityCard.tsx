/* ======================================================
 * 活动卡片 — Laper × Apple 风格
 * 大气留白 · 精致阴影 · 可展开预览 · 原链接
 * ====================================================== */

import { useState } from "react"
import type { Activity } from "../types"
import { formatDate } from "../utils"

interface Props {
  activity: Activity
  onPlan: (id: string) => void
}

/* ── 分类颜色映射（动态分类兜底） ── */
const colorMap: Record<string, string> = {
  电影:   "bg-[#faf0f0] text-[#9b4d4d]",
  展览:   "bg-[#f0f3fa] text-[#4a5d8a]",
  运动:   "bg-[#edf8f0] text-[#2d7a4f]",
  户外:   "bg-[#edf8f0] text-[#2d7a4f]",
  音乐:   "bg-[#faf5ed] text-[#8a6a30]",
  演出:   "bg-[#faf5ed] text-[#8a6a30]",
  脱口秀: "bg-[#faf5ed] text-[#8a6a30]",
  美食:   "bg-[#fdf8ed] text-[#9b7d4c]",
  市集:   "bg-[#f5f0fa] text-[#6a4d8a]",
  读书会: "bg-[#f0f3fa] text-[#3d5a80]",
  AI:     "bg-[#edf5ed] text-[#2d6a4f]",
}
const defaultColor = "bg-[var(--color-bg-dim)] text-[var(--color-t2)]"

export function ActivityCard({ activity, onPlan }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pillClass = colorMap[activity.category] ?? defaultColor

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-card transition-all duration-300 hover:shadow-card-hover overflow-hidden">
      {/* 主体 — 可点击展开 */}
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 头部行 */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[11px] font-semibold tracking-[0.04em] px-2.5 py-[3px] rounded-full ${pillClass}`}>
            {activity.category}
          </span>
          <div className="flex items-center gap-2">
            {activity.source && (
              <span className="text-[10px] text-[var(--color-t3)] font-medium">{activity.source}</span>
            )}
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-t3)" strokeWidth="1.5" strokeLinecap="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h3 className="text-[17px] font-bold leading-snug tracking-[-0.03em] text-[var(--color-t1)] mb-1.5">
          {activity.title}
        </h3>

        {/* 信息行 — 紧凑 */}
        <div className="flex items-center gap-3 text-[12px] text-[var(--color-t3)]">
          <span>{formatDate(activity.date)}{activity.time ? ` · ${activity.time}` : ""}</span>
          <span className="font-semibold text-[var(--color-t1)]">
            {activity.price === 0 ? "免费" : `¥${activity.price}`}
          </span>
        </div>

        {activity.location && (
          <div className="text-[12px] text-[var(--color-t3)] mt-1 truncate">
            📍 {activity.location}
          </div>
        )}
      </div>

      {/* 展开预览区 */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 animate-fade-up" style={{ animationDuration: "0.2s" }}>
          {activity.description && (
            <p className="text-[13px] leading-relaxed text-[var(--color-t2)] mb-4">
              {activity.description}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPlan(activity.id) }}
              className="flex-1 text-[13px] font-semibold text-white bg-[var(--color-t1)] hover:bg-[var(--color-accent-hover)] py-2.5 rounded-xl transition-colors duration-200 active:scale-[0.97]"
            >
              规划这一天
            </button>
            {activity.url && (
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-[12px] font-medium text-[var(--color-accent)] px-4 py-2.5 rounded-xl bg-[var(--color-accent-light)] hover:bg-[var(--color-accent-soft)] transition-colors"
              >
                查看详情 ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* 未展开时的快捷操作 */}
      {!expanded && (
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activity.url && (
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[var(--color-accent)] hover:underline"
              >
                详情 ↗
              </a>
            )}
          </div>
          <button
            onClick={() => onPlan(activity.id)}
            className="text-[12px] font-semibold text-white bg-[var(--color-t1)] hover:bg-[var(--color-accent-hover)] px-5 py-2 rounded-xl transition-colors duration-200 active:scale-[0.97]"
          >
            规划这一天
          </button>
        </div>
      )}
    </div>
  )
}
