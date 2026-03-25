/* ======================================================
 * 根组件 — V7 沉浸式布局
 * AuthGate · ErrorBoundary · 毛玻璃导航 · 底部标签栏
 * ====================================================== */

import { Component, useState, type ReactNode } from "react"
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router"
import { LoginCard } from "./components/LoginCard"
import { DiscoverPage } from "./pages/DiscoverPage"
import { PlanPage } from "./pages/PlanPage"
import { ChatPage } from "./pages/ChatPage"
import { ProfilePage } from "./pages/ProfilePage"
import { HistoryPage } from "./pages/HistoryPage"

/* ── 用户名读写 ── */
export function getUserName(): string {
  return localStorage.getItem("user_name") || ""
}

export function setUserName(name: string): void {
  localStorage.setItem("user_name", name)
}

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

/* ── 底部导航 ── */
function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  if (path.startsWith("/plan/") || path.startsWith("/chat/")) return null

  const tabs = [
    { path: "/", label: "发现", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-accent)" : "var(--color-t3)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
      </svg>
    )},
    { path: "/history", label: "历史", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-accent)" : "var(--color-t3)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    )},
    { path: "/profile", label: "我的", icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--color-accent)" : "var(--color-t3)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
      </svg>
    )},
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-border)]/50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[680px] mx-auto flex">
        {tabs.map((tab) => {
          const active = path === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px]"
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? "text-[var(--color-accent)]" : "text-[var(--color-t3)]"}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ── 主 Header — 显示用户名首字母 ── */
function AppHeader() {
  const name = getUserName()
  const initial = name ? name[0].toUpperCase() : "?"

  return (
    <header className="glass sticky top-0 z-50 border-b border-[var(--color-border)]/30">
      <div className="max-w-[680px] mx-auto px-5 h-[52px] flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.04em] text-[var(--color-t1)]">
          <span className="w-7 h-7 rounded-lg gradient-hero flex items-center justify-center text-white text-[13px] shadow-card">
            W
          </span>
          周末去哪玩
        </a>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[var(--color-t3)] tracking-wide">
            {new Date().toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" })}
          </span>
          <div className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[12px] font-bold text-[var(--color-accent)]">
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getUserName())

  if (!loggedIn) {
    return (
      <ErrorBoundary>
        <LoginCard onLogin={(name) => {
          setUserName(name)
          setLoggedIn(true)
        }} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-[100dvh] bg-[var(--color-bg)]">
          <AppHeader />

          <main className="max-w-[680px] mx-auto px-5 pt-6 pb-24">
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/plan/:id" element={<PlanPage />} />
              <Route path="/chat/:id" element={<ChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>

          <BottomNav />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
