/* ======================================================
 * API 客户端 — 唯一通信层
 * AbortSignal 支持 · 超时控制 · 错误友好化
 * ====================================================== */

import type { Activity, Plan } from "../types"

const BASE = "/api"

async function request<T>(
  url: string,
  options?: RequestInit & { timeout?: number },
): Promise<T> {
  const { timeout = 60000, ...fetchOptions } = options ?? {}

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
    const resp = await fetch(`${BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      ...fetchOptions,
      signal: timeoutCtrl.signal,
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw new Error(text || `请求失败 (${resp.status})`)
    }
    return await resp.json()
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
  listActivities(category?: string, signal?: AbortSignal): Promise<Activity[]> {
    const params = category && category !== "全部" ? `?category=${encodeURIComponent(category)}` : ""
    return request(`/activities${params}`, { timeout: 15000, signal })
  },

  createPlan(activityId: string, signal?: AbortSignal): Promise<Plan> {
    return request("/plan", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId }),
      timeout: 120000,
      signal,
    })
  },

  chat(activityId: string, message: string, currentPlan: Plan["schedule"], signal?: AbortSignal): Promise<{
    reply: string
    schedule: Plan["schedule"]
  }> {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId, message, current_plan: currentPlan }),
      timeout: 90000,
      signal,
    })
  },

  refresh(): Promise<{ refreshed: number; total: number }> {
    return request("/refresh", { method: "POST", timeout: 120000 })
  },
}
