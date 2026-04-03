/* ======================================================
 *  根组件 — Laper 有机极简
 *  ErrorBoundary · 认证门控 · 底部导航 · 四页路由
 * ====================================================== */

import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import BottomNav from './components/BottomNav'
import { useAuth } from './hooks/useAuth'
import { useUserStore } from './stores/userStore'
import DiscoverPage from './pages/DiscoverPage'
import PlanPage from './pages/PlanPage'
import StampPage from './pages/StampPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'

/* ── 错误边界：防止白屏 ── */

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ padding: 'var(--spacing-5)' }}>
          <div className="text-center" style={{ maxWidth: 320 }}>
            <h1 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 700, marginBottom: 'var(--spacing-3)' }}>
              出了点问题
            </h1>
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-muted)', marginBottom: 'var(--spacing-6)' }}>
              {this.state.error.message}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              className="btn-primary"
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

/* ── 主应用 ── */

export default function App() {
  useAuth()
  const { userId, loading } = useUserStore()

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--color-paper)' }}>
        <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 8 }} />
      </div>
    )
  }

  if (!userId) return <LoginPage />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-[100dvh]" style={{ background: 'var(--color-paper)' }}>
          <main className="content-narrow" style={{ padding: 'var(--spacing-5) var(--spacing-4) 96px' }}>
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/stamps" element={<StampPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
