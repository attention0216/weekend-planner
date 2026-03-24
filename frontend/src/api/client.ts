/* ======================================================
 * API 客户端
 * 前端与后端的唯一通信层
 * ====================================================== */

import type { Activity, Plan } from "../types"

const BASE = "/api"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`)
  }
  return resp.json()
}

export const api = {
  /** 活动列表 */
  listActivities(category?: string): Promise<Activity[]> {
    const params = category && category !== "全部" ? `?category=${encodeURIComponent(category)}` : ""
    return request(`/activities${params}`)
  },

  /** 生成配套日程 */
  createPlan(activityId: string): Promise<Plan> {
    return request("/plan", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId }),
    })
  },

  /** 对话调整日程 */
  chat(activityId: string, message: string, currentPlan: Plan["schedule"]): Promise<{
    reply: string
    schedule: Plan["schedule"]
  }> {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({
        activity_id: activityId,
        message,
        current_plan: currentPlan,
      }),
    })
  },

  /** 手动刷新聚合 */
  refresh(): Promise<{ refreshed: number; total: number }> {
    return request("/refresh", { method: "POST" })
  },
}
