/* ======================================================
 * 底部对话抽屉 — 在日程页内嵌调整对话
 * 不跳页 · 即时反馈 · 流畅动画
 * ====================================================== */

import { useState, useRef, useEffect } from "react"
import { api } from "../api/client"
import { updateCachedSchedule } from "../api/planCache"
import type { ScheduleItem, Activity } from "../types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface Props {
  activityId: string
  activity: Activity
  schedule: ScheduleItem[]
  onScheduleUpdate: (schedule: ScheduleItem[]) => void
  open: boolean
  onClose: () => void
}

let msgSeq = 0

export function ChatDrawer({ activityId, schedule, onScheduleUpdate, open, onClose }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "想调整什么？比如：\n「午餐换一家便宜点的」\n「加一个下午茶」\n「晚上想早点回家」",
    },
  ])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    return () => abortRef.current?.abort()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || !activityId || sending) return

    const userMsg: Message = { id: `u-${++msgSeq}`, role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setSending(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const { reply, schedule: newSchedule } = await api.chat(activityId, text, schedule, ctrl.signal)
      setMessages((prev) => [...prev, { id: `a-${++msgSeq}`, role: "assistant", content: reply }])
      onScheduleUpdate(newSchedule)
      updateCachedSchedule(activityId, newSchedule)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setMessages((prev) => [...prev, {
        id: `e-${++msgSeq}`,
        role: "assistant",
        content: `抱歉，调整失败：${e instanceof Error ? e.message : "未知错误"}`,
      }])
    } finally {
      if (!ctrl.signal.aborted) setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 抽屉面板 */}
      <div className="relative bg-[var(--color-bg)] rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up safe-bottom">
        {/* 拖拽指示 + 关闭 */}
        <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
          <div className="w-8 h-1 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2 min-h-0" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] text-[13px] leading-relaxed rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
                msg.role === "user"
                  ? "self-end bg-[var(--color-accent)] text-white"
                  : "self-start bg-[var(--color-bg-dim)] text-[var(--color-t1)]"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {sending && (
            <div className="self-start bg-[var(--color-bg-dim)] rounded-2xl px-4 py-2.5">
              <div className="flex gap-[5px] items-center h-[16px]">
                <div className="w-[4px] h-[4px] bg-[var(--color-t3)] rounded-full animate-bounce" />
                <div className="w-[4px] h-[4px] bg-[var(--color-t3)] rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-[4px] h-[4px] bg-[var(--color-t3)] rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入栏 */}
        <div className="flex gap-2 px-5 py-3 border-t border-[var(--color-divider)] shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder="说说想怎么调整..."
            disabled={sending}
            aria-label="调整意见"
            className="flex-1 text-[13px] bg-[var(--color-bg-dim)] rounded-xl px-4 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-50 placeholder:text-[var(--color-t3)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="发送"
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl disabled:opacity-30 transition-all duration-200 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
