/* ======================================================
 * API 客户端 — 唯一通信层
 * AbortSignal · 超时控制 · 认证令牌注入
 * ====================================================== */

import type { Activity, Stamp, UserProfile } from '../types'
import { useUserStore } from '../stores/userStore'

const BASE = import.meta.env.VITE_API_URL || '/api'

/* ── 获取认证头 ── */
function authHeaders(): Record<string, string> {
  const token = useUserStore.getState().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
  url: string,
  options?: RequestInit & { timeout?: number; retries?: number },
): Promise<T> {
  const { timeout = 60000, retries = 1, ...fetchOptions } = options ?? {}

  const timeoutCtrl = new AbortController()
  const timer = setTimeout(() => timeoutCtrl.abort(), timeout)
  const externalSignal = fetchOptions.signal as AbortSignal | undefined

  if (externalSignal?.aborted) {
    clearTimeout(timer)
    throw new DOMException('Aborted', 'AbortError')
  }

  const onExternalAbort = () => timeoutCtrl.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)

  try {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(`${BASE}${url}`, {
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          ...fetchOptions,
          signal: timeoutCtrl.signal,
        })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')
          throw new Error(text || `请求失败 (${resp.status})`)
        }
        return await resp.json()
      } catch (e) {
        lastError = e as Error
        if (e instanceof DOMException && e.name === 'AbortError') throw e
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
      }
    }
    throw lastError!
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      if (externalSignal?.aborted) throw new DOMException('已取消', 'AbortError')
      throw new Error('请求超时，请稍后重试')
    }
    throw e
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

/* ── 公共 API ── */

export const api = {
  /* 活动 */
  listActivities(params?: { category?: string; mood?: string; q?: string }, signal?: AbortSignal): Promise<Activity[]> {
    const qs = new URLSearchParams()
    if (params?.category && params.category !== '全部') qs.set('category', params.category)
    if (params?.mood) qs.set('mood', params.mood)
    if (params?.q) qs.set('q', params.q)
    const q = qs.toString() ? `?${qs}` : ''
    return request(`/activities${q}`, { timeout: 15000, signal })
  },

  categories(): Promise<Array<{ name: string; count: number }>> {
    return request('/categories', { timeout: 5000 })
  },

  /* 画像 */
  getProfile(): Promise<UserProfile> {
    return request('/profile', { timeout: 5000 })
  },

  updateProfile(data: { name?: string; diet?: string[]; budget?: string; social?: string }): Promise<UserProfile> {
    return request('/profile', { method: 'PUT', body: JSON.stringify(data), timeout: 5000 })
  },

  /* 日程 — SSE 由 useSSE hook 处理，这里不包含 POST /plan */
  adjustPlan(planId: string, itemIndex: number, action: string): Promise<{ items: any[] }> {
    return request('/plan/adjust', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, item_index: itemIndex, action }),
      timeout: 15000,
    })
  },

  confirmPlan(planId: string): Promise<{ confirmed: boolean }> {
    return request(`/plan/${planId}/confirm`, { method: 'POST', timeout: 5000 })
  },

  listPlans(): Promise<any[]> {
    return request('/plans', { timeout: 10000 })
  },

  /* 集邮册 */
  listStamps(): Promise<Stamp[]> {
    return request('/stamps', { timeout: 5000 })
  },

  createStamp(data: { activity_type: string; area: string; note?: string }): Promise<Stamp> {
    return request('/stamps', { method: 'POST', body: JSON.stringify(data), timeout: 5000 })
  },

  /* 反馈 */
  reportFeedback(planId: string, itemIndex: number): Promise<void> {
    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, item_index: itemIndex }),
      timeout: 5000,
    })
  },

  /* 聚合 */
  refresh(): Promise<{ refreshed: number; total: number }> {
    return request('/refresh', { method: 'POST', timeout: 120000 })
  },

  config(): Promise<{ default_address: string }> {
    return request('/config', { timeout: 5000 })
  },
}
