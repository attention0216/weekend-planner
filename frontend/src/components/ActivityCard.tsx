/* ======================================================
 * 活动卡片 — 有机极简风
 * 微阴影 · 紧凑字距 · 自然绿强调
 * ====================================================== */

import type { Activity } from "../types"
import { formatDate } from "../utils"

interface Props {
  activity: Activity
  onPlan: (id: string) => void
}

const categoryStyle: Record<string, string> = {
  AI: "bg-[#e8f4e8] text-[#2d6a4f]",
  读书会: "bg-[#e8ecf4] text-[#3d5a80]",
  电影: "bg-[#f4e8e8] text-[#9b4d4d]",
  景点: "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
  美食: "bg-[#f5f0e1] text-[#9b7d4c]",
  活动: "bg-[var(--color-bg-dim)] text-[var(--color-t2)]",
}

export function ActivityCard({ activity, onPlan }: Props) {
  const pillClass = categoryStyle[activity.category] ?? categoryStyle["活动"]

  return (
    <div className="shadow-card bg-[var(--color-bg-card)] rounded-2xl p-5 transition-all duration-200 hover:shadow-card-hover">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-md ${pillClass}`}>
          {activity.category}
        </span>
        <span className="text-[11px] text-[var(--color-t3)]">{activity.source}</span>
      </div>

      {/* 标题 */}
      <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-t1)] mb-2">
        {activity.title}
      </h3>

      {/* 描述 */}
      {activity.description && (
        <p className="text-[13px] leading-relaxed text-[var(--color-t2)] mb-3 line-clamp-2">
          {activity.description}
        </p>
      )}

      {/* 信息行 */}
      <div className="flex flex-col gap-1.5 text-[12px] text-[var(--color-t3)] mb-4">
        <div className="flex items-center gap-2">
          <span className="w-4 text-center text-[11px]">📅</span>
          <span>{formatDate(activity.date)}{activity.time ? ` · ${activity.time}` : ""}</span>
        </div>
        {activity.location && (
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-[11px]">📍</span>
            <span className="truncate">{activity.location}</span>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-divider)]">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-t1)]">
          {activity.price === 0 ? "免费" : `¥${activity.price}`}
        </span>
        <button
          onClick={() => onPlan(activity.id)}
          className="text-[13px] font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-5 py-2 rounded-lg transition-colors duration-200"
        >
          规划这一天
        </button>
      </div>
    </div>
  )
}
