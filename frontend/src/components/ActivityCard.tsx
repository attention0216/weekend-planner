/* ======================================================
 * 活动卡片组件
 * 展示单个活动的摘要信息，点击触发规划
 * ====================================================== */

import type { Activity } from "../types"

interface Props {
  activity: Activity
  onPlan: (id: string) => void
}

// 分类对应的标签颜色
const categoryColors: Record<string, string> = {
  AI: "bg-purple-100 text-purple-700",
  读书会: "bg-blue-100 text-blue-700",
  电影: "bg-red-100 text-red-700",
  景点: "bg-green-100 text-green-700",
  美食: "bg-orange-100 text-orange-700",
}

export function ActivityCard({ activity, onPlan }: Props) {
  const colorClass = categoryColors[activity.category] ?? "bg-gray-100 text-gray-700"

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      {/* 头部：分类 + 来源 */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
          {activity.category}
        </span>
        <span className="text-xs text-gray-400">{activity.source}</span>
      </div>

      {/* 标题 */}
      <h3 className="text-base font-semibold text-gray-900 leading-snug">
        {activity.title}
      </h3>

      {/* 信息行 */}
      <div className="flex flex-col gap-1 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <span>📅</span>
          <span>{activity.date} {activity.time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📍</span>
          <span>{activity.location}</span>
        </div>
      </div>

      {/* 底部：价格 + 规划按钮 */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {activity.price === 0 ? "免费" : `¥${activity.price}`}
        </span>
        <button
          onClick={() => onPlan(activity.id)}
          className="text-sm font-medium text-white bg-gray-900 px-4 py-1.5 rounded-lg active:scale-95 transition-transform"
        >
          帮我规划这一天
        </button>
      </div>
    </div>
  )
}
