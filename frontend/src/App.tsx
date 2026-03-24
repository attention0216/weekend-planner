/* ======================================================
 * 根组件
 * 路由定义 + 全局布局（移动端优先）
 * ====================================================== */

import { BrowserRouter, Routes, Route } from "react-router"
import { DiscoverPage } from "./pages/DiscoverPage"
import { PlanPage } from "./pages/PlanPage"
import { ChatPage } from "./pages/ChatPage"

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">周末去哪玩</h1>
            <span className="text-xs text-gray-400">v0.1</span>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="max-w-lg mx-auto px-4 py-4">
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
