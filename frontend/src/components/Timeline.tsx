/* ======================================================
 * 时间线组件 — 精致垂直连线
 * ====================================================== */

import type { ScheduleItem } from "../types"

interface Props {
  items: ScheduleItem[]
}

const typeConfig: Record<string, { icon: string; color: string }> = {
  lunch:    { icon: "🍜", color: "bg-[#e8a852]" },
  dinner:   { icon: "🍽️", color: "bg-[#c75c5c]" },
  activity: { icon: "🎯", color: "bg-[var(--color-accent)]" },
  explore:  { icon: "🚶", color: "bg-[var(--color-tech-green)]" },
}

export function Timeline({ items }: Props) {
  return (
    <div className="relative ml-3">
      {/* 竖线 */}
      <div className="absolute left-[5px] top-3 bottom-3 w-[1.5px] bg-[var(--color-divider)]" />

      {items.map((item, i) => {
        const cfg = typeConfig[item.type] ?? { icon: "📌", color: "bg-[var(--color-t3)]" }
        const isMain = item.type === "activity"

        return (
          <div key={i} className="relative pl-8 pb-5 last:pb-0 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            {/* 圆点 */}
            <div className={`absolute left-0 top-[14px] w-[11px] h-[11px] rounded-full ${cfg.color} ring-[3px] ring-[var(--color-bg)]`} />

            {/* 卡片 */}
            <div className={`rounded-xl p-4 transition-all duration-200 ${
              isMain
                ? "bg-[var(--color-accent)] text-white shadow-card"
                : "bg-[var(--color-bg-card)] shadow-card hover:shadow-card-hover"
            }`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-[12px] font-mono tabular-nums ${isMain ? "text-white/60" : "text-[var(--color-t3)]"}`}>
                  {item.time}
                </span>
                <span className="text-[14px]">{cfg.icon}</span>
                <span className={`text-[14px] font-semibold tracking-[-0.02em] ${isMain ? "text-white" : "text-[var(--color-t1)]"}`}>
                  {item.name}
                </span>
              </div>
              <p className={`text-[12px] leading-relaxed ${isMain ? "text-white/70" : "text-[var(--color-t3)]"}`}>
                {item.reason}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
