/* ======================================================
 * 分类筛选栏 — 有机极简 pill
 * ====================================================== */

import type { Category } from "../types"

const categories: Category[] = ["全部", "AI", "读书会", "电影", "景点", "美食"]

interface Props {
  active: Category
  onChange: (c: Category) => void
}

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`shrink-0 text-[13px] font-medium px-4 py-[7px] rounded-lg transition-all duration-200 ${
            active === c
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-bg-dim)] text-[var(--color-t2)] hover:bg-[var(--color-border)]"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
