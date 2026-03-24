/* ======================================================
 * 对话调整页 — 有机极简风
 * 品牌色气泡 · 自然灰回复 · 优雅输入栏
 * ====================================================== */

import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router"
import { api } from "../api/client"
import type { ScheduleItem, Activity } from "../types"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const state = location.state as { schedule?: ScheduleItem[]; activity?: Activity } | null
  const [schedule, setSchedule] = useState<ScheduleItem[]>(state?.schedule ?? [])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "日程已经为你准备好了 ✨\n\n想调整什么？比如：\n「午餐换一家便宜点的」\n「加一个下午茶」\n「晚上想早点回家」",
    },
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || !id || sending) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setSending(true)

    try {
      const { reply, schedule: newSchedule } = await api.chat(id, text, schedule)
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
      setSchedule(newSchedule)
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `抱歉，调整失败：${e instanceof Error ? e.message : "未知错误"}`,
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100svh-52px-96px)]">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={() => navigate(`/plan/${id}`)}
          className="text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1"
        >
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mt-px">
            <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回日程
        </button>
      </div>

      {/* 当前日程摘要 */}
      {schedule.length > 0 && (
        <div className="bg-[var(--color-bg-dim)] rounded-xl p-4 mb-4">
          <div className="text-[11px] font-medium text-[var(--color-t3)] tracking-[0.05em] uppercase mb-2">当前日程</div>
          <div className="space-y-1">
            {schedule.map((s, i) => (
              <div key={i} className="text-[12px] text-[var(--color-t2)]">
                <span className="font-mono text-[var(--color-t3)]">{s.time}</span>
                <span className="mx-1.5 text-[var(--color-divider)]">·</span>
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] text-[13px] leading-relaxed rounded-2xl px-4 py-3 whitespace-pre-wrap animate-fade-up ${
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
      <div className="flex gap-2 pt-3 border-t border-[var(--color-divider)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
          placeholder="说说想怎么调整..."
          disabled={sending}
          className="flex-1 text-[13px] bg-[var(--color-bg-dim)] rounded-xl px-4 py-[10px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-50 placeholder:text-[var(--color-t3)] transition-shadow duration-200"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl disabled:opacity-30 transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
