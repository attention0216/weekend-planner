# 周末去哪玩 (weekend-planner)

以活动为锚点的周末配套规划工具。浏览活动 → 选中 → 自动生成当天餐厅+景点+时间线。

## 架构

```
weekend-planner/
├── frontend/                # React + Vite + Tailwind (PWA)
│   └── src/
│       ├── App.tsx          # 根组件，BrowserRouter 路由定义
│       ├── main.tsx         # 应用挂载点
│       ├── index.css        # Tailwind v4 入口
│       ├── types/
│       │   └── index.ts     # Activity, ScheduleItem, Plan, Category
│       ├── components/
│       │   ├── ActivityCard.tsx    # 活动卡片（分类标签+信息+规划按钮）
│       │   ├── CategoryFilter.tsx # 分类横滚筛选栏
│       │   └── Timeline.tsx       # 垂直时间线（日程可视化）
│       └── pages/
│           ├── DiscoverPage.tsx   # 活动发现：卡片列表+筛选
│           ├── PlanPage.tsx       # 日程规划：锚点活动+时间线+地图链接
│           └── ChatPage.tsx       # 对话调整：聊天UI微调日程
├── backend/                 # FastAPI + SQLite
│   ├── main.py              # API 入口，路由定义
│   └── requirements.txt
└── .gitignore
```

## API

- `GET  /api/health` — 健康检查
- `GET  /api/activities` — 活动列表
- `POST /api/plan` — 以活动为锚点生成配套日程
- `POST /api/chat` — 对话调整日程（待实现）
- `PUT  /api/feedback` — 用户反馈（待实现）

## 开发

```bash
# 前端
cd frontend && pnpm dev    # localhost:5173

# 后端
cd backend && uvicorn main:app --reload   # localhost:8000
```

前端 Vite 配置了 `/api` 代理到后端，开发时前后端可独立启动。

## 技术决策

- **Vite 而非 Next.js**：纯客户端应用，无需 SSR，PWA/Capacitor 兼容性更好
- **Tailwind v4**：通过 `@tailwindcss/vite` 插件集成，无需配置文件
- **SQLite**：活动数据量小，单文件数据库零运维
- **LLM 分层**：DeepSeek 做结构化提取（便宜），Claude 做规划推荐（质量）
