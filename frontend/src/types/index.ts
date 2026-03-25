/* ======================================================
 * 核心数据类型 — 单一真相源
 * ====================================================== */

/* 分类现在是动态的，不再硬编码 */
export type Category = string

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
  type: "lunch" | "dinner" | "activity" | "explore" | "commute"
  name: string
  reason: string
  location?: string
}

export interface Restaurant {
  name: string
  cuisine: string
  per_capita: number
  rating: number
  reason: string
  tags: string[]
  distance_desc: string
}

export interface Plan {
  activity: Activity
  schedule: ScheduleItem[]
  nearby_restaurants: Restaurant[]
  nearby_spots: Array<{
    name: string
    address: string
    type: string
    distance: string
  }>
}
