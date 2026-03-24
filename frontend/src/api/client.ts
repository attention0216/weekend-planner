/* ======================================================
 * API 客户端 — 唯一通信层
 * 带超时控制 + 错误友好化
 * ====================================================== */

import type { Activity, Plan } from "../types"

const BASE = "/api"

async function request<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = 120000, ...fetchOptions } = options ?? {}
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const resp = await fetch(`${BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...fetchOptions,
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText)
      throw new Error(text || `${resp.status}`)
    }
    return resp.json()
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("请求超时，请稍后重试")
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  listActivities(category?: string): Promise<Activity[]> {
    const params = category && category !== "全部" ? `?category=${encodeURIComponent(category)}` : ""
    return request(`/activities${params}`, { timeout: 15000 })
  },

  createPlan(activityId: string): Promise<Plan> {
    return request("/plan", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId }),
      timeout: 120000,
    })
  },

  chat(activityId: string, message: string, currentPlan: Plan["schedule"]): Promise<{
    reply: string
    schedule: Plan["schedule"]
  }> {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId, message, current_plan: currentPlan }),
      timeout: 90000,
    })
  },

  refresh(): Promise<{ refreshed: number; total: number }> {
    return request("/refresh", { method: "POST", timeout: 120000 })
  },
}
