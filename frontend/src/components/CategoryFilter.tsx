/* ======================================================
 * 分类筛选栏
 * 横向滚动的标签列表，点击切换活动类别
 * ====================================================== */

import type { Category } from "../types"

const categories: Category[] = ["全部", "AI", "读书会", "电影", "景点", "美食"]

interface Props {
  active: Category
  onChange: (c: Category) => void
}

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors ${
            active === c
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
