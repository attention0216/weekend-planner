/* ======================================================
 * 时间线组件
 * 垂直时间线展示日程安排
 * ====================================================== */

import type { ScheduleItem } from "../types"

interface Props {
  items: ScheduleItem[]
}

// 日程类型对应的图标和颜色
const typeConfig: Record<string, { icon: string; dot: string }> = {
  lunch: { icon: "🍜", dot: "bg-orange-400" },
  dinner: { icon: "🍽️", dot: "bg-red-400" },
  activity: { icon: "🎯", dot: "bg-purple-500" },
  explore: { icon: "🚶", dot: "bg-green-400" },
}

export function Timeline({ items }: Props) {
  return (
    <div className="relative pl-8">
      {/* 竖线 */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />

      {items.map((item, i) => {
        const cfg = typeConfig[item.type] ?? { icon: "📌", dot: "bg-gray-400" }
        return (
          <div key={i} className="relative pb-6 last:pb-0">
            {/* 圆点 */}
            <div className={`absolute left-[-20px] top-1 w-2.5 h-2.5 rounded-full ${cfg.dot} ring-2 ring-white`} />

            {/* 内容 */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400">{item.time}</span>
                <span>{cfg.icon}</span>
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
              <p className="text-xs text-gray-500">{item.reason}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
