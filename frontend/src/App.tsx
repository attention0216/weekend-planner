/* ======================================================
 * 根组件 — Laper AI 风格布局
 * ErrorBoundary · 响应式 · 安全区域
 * ====================================================== */

import { Component, type ReactNode } from "react"
import { BrowserRouter, Routes, Route } from "react-router"
import { DiscoverPage } from "./pages/DiscoverPage"
import { PlanPage } from "./pages/PlanPage"
import { ChatPage } from "./pages/ChatPage"

/* ── 错误边界：防止白屏 ── */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-5">
          <div className="text-center max-w-sm">
            <div className="text-[20px] font-bold text-[var(--color-t1)] mb-3">出了点问题</div>
            <p className="text-[13px] text-[var(--color-t3)] mb-6 leading-relaxed">
              {this.state.error.message}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null })
                window.location.href = "/"
              }}
              className="text-[14px] font-medium text-white bg-[var(--color-accent)] px-6 py-3 rounded-xl"
            >
              返回首页
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-[100dvh] bg-[var(--color-bg)]">
          {/* 毛玻璃导航 */}
          <header className="glass sticky top-0 z-50 border-b border-[var(--color-border)]/50">
            <div className="max-w-[680px] mx-auto px-5 h-[52px] flex items-center">
              <a href="/" className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--color-t1)]">
                周末去哪玩
              </a>
            </div>
          </header>

          {/* 内容区 — 桌面宽一点，移动端全宽 */}
          <main className="max-w-[680px] mx-auto px-5 pt-6 pb-24">
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/plan/:id" element={<PlanPage />} />
              <Route path="/chat/:id" element={<ChatPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
