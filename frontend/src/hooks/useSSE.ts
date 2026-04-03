/* ======================================================
 *  useSSE — SSE 流式消费 hook
 *  POST 请求 → text/event-stream → 逐事件回调
 * ====================================================== */

import { useRef, useCallback } from 'react'
import { useUserStore } from '../stores/userStore'

interface SSECallbacks {
  onItem: (index: number, item: any) => void
  onDone: (planId: string) => void
  onError: (message: string) => void
}

export function useSSE() {
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    callbacks: SSECallbacks,
  ) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const token = useUserStore.getState().accessToken

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        callbacks.onError(text || `请求失败 (${resp.status})`)
        return
      }

      const reader = resp.body?.getReader()
      if (!reader) { callbacks.onError('无响应流'); return }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'item') callbacks.onItem(evt.index, evt.item)
            else if (evt.type === 'done') callbacks.onDone(evt.planId)
            else if (evt.type === 'error') callbacks.onError(evt.message)
          } catch { /* 忽略非 JSON 行 */ }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        callbacks.onError(e.message || '网络错误')
      }
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { start, abort }
}
