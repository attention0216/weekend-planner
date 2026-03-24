/* ======================================================
 * 对话调整页
 * 调用后端 Chat API，自然语言微调日程
 * ====================================================== */

import { useState } from "react"
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

  const state = location.state as { schedule?: ScheduleItem[]; activity?: Activity } | null
  const [schedule, setSchedule] = useState<ScheduleItem[]>(state?.schedule ?? [])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我已经为你生成了日程规划。有什么想调整的吗？比如：\n\n- 「午餐换一家便宜点的」\n- 「加一个下午茶」\n- 「晚上想早点回家」",
    },
  ])

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
    <div className="flex flex-col h-[calc(100svh-56px)]">
      {/* 顶部 */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <button onClick={() => navigate(`/plan/${id}`)} className="text-sm text-gray-500">
          ← 返回日程
        </button>
        <span className="text-sm font-medium text-gray-700">调整日程</span>
      </div>

      {/* 当前日程预览 */}
      {schedule.length > 0 && (
        <div className="py-3 border-b border-gray-100">
          <div className="text-xs text-gray-400 mb-2">当前日程</div>
          <div className="text-xs text-gray-600 space-y-1">
            {schedule.map((s, i) => (
              <div key={i}>{s.time} · {s.name}</div>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] text-sm rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
              msg.role === "user"
                ? "self-end bg-gray-900 text-white"
                : "self-start bg-gray-100 text-gray-800"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {sending && (
          <div className="self-start bg-gray-100 rounded-2xl px-4 py-2.5">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
          placeholder="说说想怎么调整..."
          disabled={sending}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-gray-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 text-sm font-medium bg-gray-900 text-white px-4 rounded-xl disabled:opacity-30 transition-opacity"
        >
          发送
        </button>
      </div>
    </div>
  )
}
