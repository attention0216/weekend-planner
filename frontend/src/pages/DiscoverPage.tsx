/* ======================================================
 * 活动发现页
 * 卡片列表 + 分类筛选，核心浏览入口
 * ====================================================== */

import { useState } from "react"
import { useNavigate } from "react-router"
import { ActivityCard } from "../components/ActivityCard"
import { CategoryFilter } from "../components/CategoryFilter"
import type { Activity, Category } from "../types"

// 假数据——Phase 2 替换为 API 调用
const mockActivities: Activity[] = [
  {
    id: "1",
    title: "AI 黑客松：大模型应用开发",
    category: "AI",
    date: "2026-03-28",
    time: "14:00-18:00",
    location: "海淀区中关村创业大街",
    price: 0,
    source: "豆瓣同城",
    image: null,
  },
  {
    id: "2",
    title: "三体精装典藏版读书会",
    category: "读书会",
    date: "2026-03-29",
    time: "10:00-12:00",
    location: "朝阳区三里屯 PageOne 书店",
    price: 39,
    source: "豆瓣同城",
    image: null,
  },
  {
    id: "3",
    title: "封神第三部：朝歌风云",
    category: "电影",
    date: "2026-03-28",
    time: "全天",
    location: "各大影院",
    price: 45,
    source: "猫眼电影",
    image: null,
  },
  {
    id: "4",
    title: "故宫博物院·春日限定夜场",
    category: "景点",
    date: "2026-03-29",
    time: "18:00-21:00",
    location: "东城区景山前街4号",
    price: 80,
    source: "小红书",
    image: null,
  },
  {
    id: "5",
    title: "簋街深夜美食探店团",
    category: "美食",
    date: "2026-03-28",
    time: "20:00-23:00",
    location: "东城区东直门内大街",
    price: 0,
    source: "公众号",
    image: null,
  },
]

export function DiscoverPage() {
  const [category, setCategory] = useState<Category>("全部")
  const navigate = useNavigate()

  const filtered =
    category === "全部"
      ? mockActivities
      : mockActivities.filter((a) => a.category === category)

  function handlePlan(id: string) {
    navigate(`/plan/${id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter active={category} onChange={setCategory} />

      <div className="text-xs text-gray-400">
        {filtered.length} 个活动 · 本周末
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((a) => (
          <ActivityCard key={a.id} activity={a} onPlan={handlePlan} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12">暂无该类活动</p>
      )}
    </div>
  )
}
