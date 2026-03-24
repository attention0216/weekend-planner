/* ======================================================
 * 根组件 — Laper AI 风格布局
 * ====================================================== */

import { BrowserRouter, Routes, Route } from "react-router"
import { DiscoverPage } from "./pages/DiscoverPage"
import { PlanPage } from "./pages/PlanPage"
import { ChatPage } from "./pages/ChatPage"

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)]">
        {/* 毛玻璃导航 */}
        <header className="glass sticky top-0 z-50 border-b border-[var(--color-border)]/50">
          <div className="max-w-[600px] mx-auto px-5 h-[52px] flex items-center">
            <h1 className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--color-t1)]">
              周末去哪玩
            </h1>
          </div>
        </header>

        {/* 内容区 */}
        <main className="max-w-[600px] mx-auto px-5 pt-6 pb-24">
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/plan/:id" element={<PlanPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
