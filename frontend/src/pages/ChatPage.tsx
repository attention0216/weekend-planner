/* ======================================================
 * 对话调整页
 * 简易聊天界面，用自然语言微调日程
 * ====================================================== */

import { useState } from "react"
import { useParams, useNavigate } from "react-router"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我已经为你生成了日程规划。有什么想调整的吗？比如：\n\n- 「午餐换一家便宜点的」\n- 「加一个下午茶」\n- 「晚上想早点回家」",
    },
  ])

  function handleSend() {
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")

    // 假回复——Phase 2 替换为 Claude API
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `好的，我来调整一下。「${text}」——这个功能在 Phase 2 接入 Claude API 后就能真正工作了 🚀`,
        },
      ])
    }, 800)
  }

  return (
    <div className="flex flex-col h-[calc(100svh-56px)]">
      {/* 顶部 */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <button
          onClick={() => navigate(`/plan/${id}`)}
          className="text-sm text-gray-500"
        >
          ← 返回日程
        </button>
        <span className="text-sm font-medium text-gray-700">调整日程</span>
      </div>

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
      </div>

      {/* 输入框 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
          placeholder="说说想怎么调整..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="shrink-0 text-sm font-medium bg-gray-900 text-white px-4 rounded-xl disabled:opacity-30 transition-opacity"
        >
          发送
        </button>
      </div>
    </div>
  )
}
