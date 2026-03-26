/* ======================================================
 * 分类筛选 — 动态分类 + 换一批
 * 从后端获取实际分类，不硬编码
 * ====================================================== */

import { useState, useEffect } from "react"
import { api } from "../api/client"

interface Props {
  active: string
  onChange: (c: string) => void
  onRefresh?: () => void
  refreshing?: boolean
}

export function CategoryFilter({ active, onChange, onRefresh, refreshing }: Props) {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    api.categories().then((cats) => {
      setCategories(cats.map((c) => c.name))
    }).catch(() => {})
  }, [])

  const all = ["全部", ...categories]

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1">
        {all.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`shrink-0 text-[12px] font-medium px-3.5 py-[6px] rounded-full transition-all duration-200 ${
              active === c
                ? "bg-[var(--color-t1)] text-white"
                : "bg-[var(--color-bg-dim)] text-[var(--color-t3)] hover:text-[var(--color-t2)] hover:bg-[var(--color-border)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 换一批 */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)] px-3 py-[6px] rounded-full bg-[var(--color-accent-light)] hover:bg-[var(--color-accent-soft)] transition-colors disabled:opacity-50"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {refreshing ? "刷新中" : "换一批"}
        </button>
      )}
    </div>
  )
}
