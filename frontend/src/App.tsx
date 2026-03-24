function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">周末去哪玩</h1>
          <span className="text-sm text-gray-400">v0.1</span>
        </div>
      </header>

      {/* 活动列表占位 */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-gray-500 text-center py-20">
          活动列表即将上线
        </p>
      </main>
    </div>
  )
}

export default App
