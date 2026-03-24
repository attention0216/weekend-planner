/* ======================================================
 * 对话调整页 — 有机极简风
 * 日程同步缓存 · AbortController · 安全返回
 * ====================================================== */

import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router"
import { api } from "../api/client"
import { updateCachedSchedule } from "../api/planCache"
import type { ScheduleItem, Activity } from "../types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

let msgSeq = 0

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const state = location.state as { schedule?: ScheduleItem[]; activity?: Activity } | null
  const [schedule, setSchedule] = useState<ScheduleItem[]>(state?.schedule ?? [])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "日程已经为你准备好了\n\n想调整什么？比如：\n「午餐换一家便宜点的」\n「加一个下午茶」\n「晚上想早点回家」",
    },
  ])

  /* ── 卸载时取消进行中的请求 ── */
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || !id || sending) return

    const userMsg: Message = { id: `u-${++msgSeq}`, role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setSending(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const { reply, schedule: newSchedule } = await api.chat(id, text, schedule, ctrl.signal)
      setMessages((prev) => [...prev, { id: `a-${++msgSeq}`, role: "assistant", content: reply }])
      setSchedule(newSchedule)
      /* ── 关键：同步更新缓存，返回 PlanPage 时不重新推理 ── */
      updateCachedSchedule(id, newSchedule)
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

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 52px - 48px)" }}>
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 pb-3 shrink-0">
        <button
          onClick={() => navigate(`/plan/${id}`)}
          className="text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1 min-h-[44px]"
          aria-label="返回日程"
        >
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
            <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回日程
        </button>
      </div>

      {/* 当前日程摘要 */}
      {schedule.length > 0 && (
        <div className="bg-[var(--color-bg-dim)] rounded-xl p-4 mb-3 shrink-0">
          <div className="text-[11px] font-medium text-[var(--color-t3)] tracking-[0.05em] uppercase mb-2">当前日程</div>
          <div className="space-y-1">
            {schedule.map((s, i) => (
              <div key={`${s.time}-${i}`} className="text-[12px] text-[var(--color-t2)]">
                <span className="font-mono text-[var(--color-t3)]">{s.time}</span>
                <span className="mx-1.5 text-[var(--color-divider)]">·</span>
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4 min-h-0" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] text-[13px] leading-relaxed rounded-2xl px-4 py-3 whitespace-pre-wrap animate-fade-up ${
              msg.role === "user"
                ? "self-end bg-[var(--color-accent)] text-white"
                : "self-start bg-[var(--color-bg-dim)] text-[var(--color-t1)]"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {/* 打字指示器 */}
        {sending && (
          <div className="self-start bg-[var(--color-bg-dim)] rounded-2xl px-4 py-3">
            <div className="flex gap-[5px] items-center h-[18px]">
              <div className="w-[5px] h-[5px] bg-[var(--color-t3)] rounded-full animate-bounce" />
              <div className="w-[5px] h-[5px] bg-[var(--color-t3)] rounded-full animate-bounce [animation-delay:0.15s]" />
              <div className="w-[5px] h-[5px] bg-[var(--color-t3)] rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 */}
      <div className="flex gap-2 pt-3 border-t border-[var(--color-divider)] shrink-0 pb-[env(safe-area-inset-bottom)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
          placeholder="说说想怎么调整..."
          disabled={sending}
          aria-label="调整意见"
          className="flex-1 text-[13px] bg-[var(--color-bg-dim)] rounded-xl px-4 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-50 placeholder:text-[var(--color-t3)] transition-shadow duration-200"
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
  )
}
