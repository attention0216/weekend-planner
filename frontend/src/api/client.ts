/* ======================================================
 * API 客户端 — 唯一通信层
 * AbortSignal · 超时控制 · 认证令牌注入
 * ====================================================== */

import type { Activity } from '../types'
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

export const api = {
  listActivities(category?: string, signal?: AbortSignal, mood?: string, q?: string): Promise<Activity[]> {
    const params = new URLSearchParams()
    if (category && category !== '全部') params.set('category', category)
    if (mood) params.set('mood', mood)
    if (q) params.set('q', q)
    const qs = params.toString() ? `?${params}` : ''
    return request(`/activities${qs}`, { timeout: 15000, signal })
  },

  categories(): Promise<Array<{ name: string; count: number }>> {
    return request('/categories', { timeout: 5000 })
  },

  refresh(): Promise<{ refreshed: number; total: number }> {
    return request('/refresh', { method: 'POST', timeout: 120000 })
  },

  config(): Promise<{ default_address: string }> {
    return request('/config', { timeout: 5000 })
  },
}
