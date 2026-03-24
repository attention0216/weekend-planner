/* ======================================================
 * 日程规划页
 * 调用后端 Plan API，以锚点活动展示配套日程
 * ====================================================== */

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Timeline } from "../components/Timeline"
import { api } from "../api/client"
import type { Plan } from "../types"

export function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError("")
    api.createPlan(id)
      .then(setPlan)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">正在为你规划行程...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-4 mb-4">
          规划失败：{error}
        </div>
        <button onClick={() => navigate("/")} className="text-sm text-gray-900 underline">
          返回活动列表
        </button>
      </div>
    )
  }

  if (!plan) return null

  const { activity, schedule, nearby_restaurants, nearby_spots } = plan

  return (
    <div className="flex flex-col gap-5">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-sm text-gray-500 flex items-center gap-1"
      >
        ← 返回活动列表
      </button>

      {/* 锚点活动概要 */}
      <div className="bg-gray-900 text-white rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-1">{activity.date} · {activity.category}</div>
        <h2 className="text-lg font-semibold mb-1">{activity.title}</h2>
        <div className="text-sm text-gray-300">📍 {activity.location}</div>
        <div className="text-sm text-gray-300">
          {activity.time} · {activity.price === 0 ? "免费" : `¥${activity.price}`}
        </div>
        {activity.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{activity.description}</p>
        )}
      </div>

      {/* 日程时间线 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">为你规划的一天</h3>
        <Timeline items={schedule} />
      </div>

      {/* 附近推荐 */}
      {nearby_restaurants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">附近餐厅</h3>
          <div className="flex flex-col gap-2">
            {nearby_restaurants.slice(0, 3).map((r, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {r.rating && `${r.rating}分 · `}
                  {r.cost && `人均¥${r.cost} · `}
                  {r.distance}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nearby_spots.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">附近景点</h3>
          <div className="flex flex-col gap-2">
            {nearby_spots.map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 text-sm">
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500 mt-1">{s.distance}m · {s.address}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <button
        onClick={() => navigate(`/chat/${id}`, { state: { schedule, activity } })}
        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:bg-gray-200 transition-colors"
      >
        💬 不满意？聊聊调整一下
      </button>

      {activity.location && (
        <a
          href={`https://uri.amap.com/search?keyword=${encodeURIComponent(activity.location)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium text-center block"
        >
          🗺️ 在高德地图中查看
        </a>
      )}
    </div>
  )
}
