/* ======================================================
 * 核心数据类型
 * 所有模块共享的类型定义，单一真相源
 * ====================================================== */

export type Category = "AI" | "读书会" | "电影" | "景点" | "美食" | "活动" | "全部"

export interface Activity {
  id: string
  title: string
  category: string
  date: string
  time: string
  location: string
  latitude: number | null
  longitude: number | null
  price: number
  source: string
  url: string
  image: string | null
  description: string
}

export interface ScheduleItem {
  time: string
  type: "lunch" | "dinner" | "activity" | "explore"
  name: string
  reason: string
}

export interface Plan {
  activity: Activity
  schedule: ScheduleItem[]
  nearby_restaurants: Array<{
    name: string
    address: string
    rating: string
    cost: string
    distance: string
  }>
  nearby_spots: Array<{
    name: string
    address: string
    type: string
    distance: string
  }>
}
