/* ======================================================
 * API 客户端 — 唯一通信层
 * AbortSignal 支持 · 超时控制 · 错误友好化
 * ====================================================== */

import type { Activity, Plan } from "../types"
import { loadProfile } from "../pages/ProfilePage"

const BASE = import.meta.env.VITE_API_URL || "/api"

/* ── 获取当前用户名 ── */
function userName(): string {
  return localStorage.getItem("user_name") || ""
}

async function request<T>(
  url: string,
  options?: RequestInit & { timeout?: number; retries?: number },
): Promise<T> {
  const { timeout = 60000, retries = 1, ...fetchOptions } = options ?? {}

  /* ── 合并外部 signal 与超时 signal ── */
  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(), timeout)
  const externalSignal = fetchOptions.signal as AbortSignal | undefined

  /* 如果外部已取消，直接抛 */
  if (externalSignal?.aborted) {
    clearTimeout(timer)
    throw new DOMException("Aborted", "AbortError")
  }

  /* 监听外部取消 → 联动超时 controller */
  const onExternalAbort = () => timeoutCtrl.abort()
  externalSignal?.addEventListener("abort", onExternalAbort)

  try {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(`${BASE}${url}`, {
          headers: {
            "Content-Type": "application/json",
            ...(userName() ? { "X-User-Name": encodeURIComponent(userName()) } : {}),
          },
          ...fetchOptions,
          signal: timeoutCtrl.signal,
        })
        if (!resp.ok) {
          const text = await resp.text().catch(() => "")
          throw new Error(text || `请求失败 (${resp.status})`)
        }
        return await resp.json()
      } catch (e) {
        lastError = e as Error
        if (e instanceof DOMException && e.name === "AbortError") throw e
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
      }
    }
    throw lastError!
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      if (externalSignal?.aborted) throw new DOMException("已取消", "AbortError")
      throw new Error("请求超时，请稍后重试")
    }
    throw e
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener("abort", onExternalAbort)
  }
}

export const api = {
  listActivities(category?: string, signal?: AbortSignal, mood?: string, q?: string): Promise<Activity[]> {
    const params = new URLSearchParams()
    if (category && category !== "全部") params.set("category", category)
    if (mood) params.set("mood", mood)
    if (q) params.set("q", q)
    const qs = params.toString() ? `?${params}` : ""
    return request(`/activities${qs}`, { timeout: 15000, signal })
  },

  createPlan(activityId: string, signal?: AbortSignal): Promise<Plan> {
    const profile = loadProfile()
    return request("/plan", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId, user_profile: profile }),
      timeout: 120000,
      signal,
    })
  },

  chat(activityId: string, message: string, currentPlan: Plan["schedule"], signal?: AbortSignal): Promise<{
    reply: string
    schedule: Plan["schedule"]
  }> {
    const profile = loadProfile()
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId, message, current_plan: currentPlan, user_profile: profile }),
      timeout: 90000,
      signal,
    })
  },

  refresh(): Promise<{ refreshed: number; total: number }> {
    return request("/refresh", { method: "POST", timeout: 120000 })
  },

  nearby(lat: number, lng: number): Promise<{
    location_name: string
    nearby_restaurants: Plan["nearby_restaurants"]
    nearby_spots: Plan["nearby_spots"]
  }> {
    const profile = loadProfile()
    return request("/nearby", {
      method: "POST",
      body: JSON.stringify({ latitude: lat, longitude: lng, user_profile: profile }),
      timeout: 60000,
    })
  },

  categories(): Promise<Array<{ name: string; count: number }>> {
    return request("/categories", { timeout: 5000 })
  },

  config(): Promise<{ default_address: string }> {
    return request("/config", { timeout: 5000 })
  },

  weather(): Promise<Array<{
    date: string; condition: string; code: string; emoji: string
    temp_high: number; temp_low: number; prefer_indoor: boolean
  }>> {
    return request("/weather", { timeout: 5000 })
  },
}
