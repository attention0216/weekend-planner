/* ======================================================
 * 活动发现页
 * 卡片列表 + 分类筛选，数据来自后端 API
 * ====================================================== */

import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { ActivityCard } from "../components/ActivityCard"
import { CategoryFilter } from "../components/CategoryFilter"
import { api } from "../api/client"
import type { Activity, Category } from "../types"

export function DiscoverPage() {
  const [category, setCategory] = useState<Category>("全部")
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    setError("")
    api.listActivities(category)
      .then(setActivities)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [category])

  function handlePlan(id: string) {
    navigate(`/plan/${id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter active={category} onChange={setCategory} />

      {/* 加载态 */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      )}

      {/* 错误态 */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-4 text-center">
          加载失败：{error}
        </div>
      )}

      {/* 正常态 */}
      {!loading && !error && (
        <>
          <div className="text-xs text-gray-400">
            {activities.length} 个活动 · 本周末
          </div>

          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} onPlan={handlePlan} />
            ))}
          </div>

          {activities.length === 0 && (
            <p className="text-center text-gray-400 py-12">暂无该类活动</p>
          )}
        </>
      )}
    </div>
  )
}
