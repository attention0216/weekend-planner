/* ======================================================
 * 核心数据类型
 * 所有模块共享的类型定义，单一真相源
 * ====================================================== */

// 活动分类
export type Category = "AI" | "读书会" | "电影" | "景点" | "美食" | "全部"

// 活动条目
export interface Activity {
  id: string
  title: string
  category: string
  date: string
  time: string
  location: string
  price: number
  source: string
  image: string | null
}

// 日程项
export interface ScheduleItem {
  time: string
  type: "lunch" | "dinner" | "activity" | "explore"
  name: string
  reason: string
}

// 配套日程
export interface Plan {
  activity_id: string
  schedule: ScheduleItem[]
}
