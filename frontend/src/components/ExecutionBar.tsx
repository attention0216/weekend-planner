/* ======================================================
 * 执行模式浮窗 — 行程追踪器
 * 当前步骤 · 进度指示 · 一键导航 · 前后切换
 * ====================================================== */

import { useState, useCallback } from "react"
import { navigateToItem, amapNavHref } from "../utils/amap"
import type { ScheduleItem } from "../types"

/* ── 解析 HH:MM 为分钟数 ── */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/* ── 自动检测当前步骤 ── */
function detectCurrentStep(items: ScheduleItem[]): number {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  let idx = 0
  for (let i = 0; i < items.length; i++) {
    if (parseTime(items[i].time) <= nowMin) idx = i
  }
  return idx
}

const typeEmoji: Record<string, string> = {
  lunch: "🍜", dinner: "🍽️", activity: "🎯", explore: "🚶", commute: "🚇",
}

interface Props {
  items: ScheduleItem[]
  onExit: () => void
}

export function ExecutionBar({ items, onExit }: Props) {
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
              {nextItem ? (
                <div className="text-[11px] text-[var(--color-t3)] mt-0.5 truncate">
                  下一站 · {nextItem.time} {nextItem.name}
                </div>
              ) : (
                <div className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">
                  最后一站，旅程结束
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={goPrev}
                disabled={stepIdx === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-dim)] disabled:opacity-30 transition-colors"
                aria-label="上一步"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-t2)" strokeWidth="2" strokeLinecap="round"><path d="M8 3L4 7l4 4" /></svg>
              </button>

              {/* 导航按钮 — 点击唤起高德 App */}
              <button
                onClick={() => navigateToItem(item)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-card animate-nav-pulse"
                aria-label="导航到这里"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
              </button>

              <button
                onClick={goNext}
                disabled={stepIdx === items.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-dim)] disabled:opacity-30 transition-colors"
                aria-label="下一步"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-t2)" strokeWidth="2" strokeLinecap="round"><path d="M6 3l4 4-4 4" /></svg>
              </button>

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
