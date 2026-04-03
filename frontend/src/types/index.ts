/* ======================================================
 *  核心数据类型 — 单一真相源
 *  PRD 38 FR 所需全部模型定义
 * ====================================================== */

/* ── 心情 · 时段 · 同伴 ── */

export type Mood = '放松' | '社交' | '冒险' | '安静'
export type TimeSlot = '上午' | '下午' | '全天'
export type Companion = '一个人' | '约会' | '和朋友'

/* ── 活动 ── */

export interface Activity {
  id: string
  title: string
  category: string
  date: string
  end_date?: string
  time: string
  location: string
  latitude: number | null
  longitude: number | null
  price: number
  source: string
  source_type: 'xiaohongshu' | 'time_limited' | 'general'
  url: string
  image: string | null
  description: string
  is_time_limited: boolean
  url_verified: boolean
  rating?: number
  created_at: string
}

/* ── 日程项 ── */

export interface ScheduleItem {
  index: number
  time: string
  type: 'activity' | 'restaurant' | 'spot' | 'commute'
  name: string
  location: string
  reason: string
  source?: string
  source_type?: 'xiaohongshu' | 'time_limited' | 'general'
  rating?: number
  distance?: string
  business_hours?: string
  transit_minutes?: number
  url?: string
}

/* ── 日程 ── */

export interface Plan {
  id: string
  user_id: string
  mood: Mood
  time_slot: TimeSlot
  companion: Companion
  items: ScheduleItem[]
  created_at: string
  confirmed: boolean
}

/* ── 用户画像 ── */

export interface UserProfile {
  user_id: string
  name: string
  diet: string[]
  budget: string
  social: string
  preference_weights: Record<string, number>
  created_at: string
}

/* ── 集邮册印章 ── */

export interface Stamp {
  id: string
  user_id: string
  plan_id?: string
  source: 'auto' | 'manual'
  activity_type: string
  area: string
  note?: string
  created_at: string
}

/* ── 调整动作 ── */

export type AdjustAction = 'swap' | 'remove' | 'closer' | 'cheaper'

/* ── API 响应 ── */

export interface PlanSSEEvent {
  type: 'item' | 'done' | 'error'
  data: ScheduleItem | { message: string }
}
