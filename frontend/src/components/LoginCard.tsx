/* ======================================================
 * 登录卡片 — 极简名字输入
 * 无密码 · 无验证 · 纯身份标记
 * ====================================================== */

import { useState } from "react"

interface Props {
  onLogin: (name: string) => void
}

export function LoginCard({ onLogin }: Props) {
  const [name, setName] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onLogin(trimmed)
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] flex items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center shadow-elevated">
            <span className="text-white text-[28px] font-bold">W</span>
          </div>
        </div>

        <h1 className="text-[24px] font-bold tracking-[-0.04em] text-[var(--color-t1)] text-center mb-2">
          周末去哪玩
        </h1>
        <p className="text-[14px] text-[var(--color-t3)] text-center mb-8">
          告诉我你的名字，开始探索
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字"
          autoFocus
          maxLength={20}
          className="w-full px-4 py-3 text-[16px] text-[var(--color-t1)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-card focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent placeholder:text-[var(--color-t3)] transition-shadow"
        />

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full mt-4 py-3 gradient-hero text-white text-[15px] font-semibold rounded-xl shadow-card transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
        >
          进入
        </button>
      </form>
    </div>
  )
}
