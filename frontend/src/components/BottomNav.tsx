/* ============================================================
 *  BottomNav — 底部 Tab 导航
 *  4 Tab: 发现 / 日程 / 集邮册 / 我的
 * ============================================================ */

import { useLocation, useNavigate } from 'react-router'

const tabs = [
  { path: '/', label: '发现', icon: '◎' },
  { path: '/plan', label: '日程', icon: '▣' },
  { path: '/stamps', label: '集邮册', icon: '◉' },
  { path: '/profile', label: '我的', icon: '○' },
] as const

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{ background: 'var(--color-paper)', borderTop: '1px solid var(--color-warm)' }}
      role="tablist"
      aria-label="主导航"
    >
      <div className="content-narrow flex justify-around items-center" style={{ height: 56 }}>
        {tabs.map(tab => {
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              role="tab"
              aria-selected={active}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1"
              style={{
                color: active ? 'var(--color-forest)' : 'var(--color-muted)',
                minHeight: 44,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-size-small)',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
