# 周末去哪玩 (weekend-planner)

以活动为锚点的周末配套规划工具。浏览活动 → 选中 → 自动生成当天餐厅+景点+时间线。

## 架构

```
weekend-planner/
├── frontend/                    # React + Vite + Tailwind (PWA)
│   ├── index.html               # PWA meta tags + viewport
│   ├── vite.config.ts           # Tailwind + PWA + API 代理
│   └── src/
│       ├── App.tsx              # BrowserRouter 路由定义
│       ├── main.tsx             # 应用挂载点
│       ├── index.css            # Tailwind v4 入口
│       ├── api/
│       │   └── client.ts        # 后端 API 客户端（唯一通信层）
│       ├── types/
│       │   └── index.ts         # Activity, ScheduleItem, Plan, Category
│       ├── components/
│       │   ├── ActivityCard.tsx  # 活动卡片（分类标签+信息+规划按钮）
│       │   ├── CategoryFilter.tsx # 分类横滚筛选栏
│       │   └── Timeline.tsx     # 垂直时间线（日程可视化）
│       └── pages/
│           ├── DiscoverPage.tsx  # 活动发现：卡片列表+筛选+loading/error
│           ├── PlanPage.tsx      # 日程规划：锚点活动+时间线+附近推荐
│           └── ChatPage.tsx      # 对话调整：聊天UI+日程实时更新
├── backend/                     # FastAPI + SQLite
│   ├── main.py                  # API 路由 + 静态文件服务（生产）
│   ├── config.py                # 环境变量统一入口
│   ├── db.py                    # SQLite 数据库层
│   ├── aggregator.py            # RSSHub 活动聚合引擎
│   ├── planner.py               # 高德+Claude 配套规划引擎
│   ├── seed_data.py             # 种子数据（RSSHub 不可用时降级）
│   ├── requirements.txt         # Python 依赖
│   └── .env.example             # 环境变量模板
├── Dockerfile                   # 多阶段构建（前端build+后端run）
├── docker-compose.yml           # 一键部署
├── dev.sh                       # 本地开发启动脚本
└── .gitignore
```

## API

- `GET  /api/health` — 健康检查（含活动数量）
- `GET  /api/activities?category=AI&limit=50` — 活动列表
- `GET  /api/activities/:id` — 活动详情
- `POST /api/plan` — 以活动为锚点生成配套日程（高德POI+Claude）
- `POST /api/chat` — 对话调整日程
- `POST /api/refresh` — 手动触发聚合

## 开发

```bash
# 一键启动
./dev.sh

# 或分别启动
cd frontend && pnpm dev          # localhost:5173
cd backend && uvicorn main:app --reload  # localhost:8000
```

## 部署

```bash
# Docker
cp backend/.env.example backend/.env  # 填入 API Keys
docker compose up -d
```

## 配置

复制 `backend/.env.example` 为 `backend/.env`，按需填入：
- `AMAP_KEY` — 高德地图 Web 服务 API Key（周边搜索+地理编码）
- `CLAUDE_API_KEY` — Claude API Key（日程规划+对话）
- `TAVILY_API_KEY` — Tavily 搜索 Key（餐厅口碑）
- `RSSHUB_BASE` — 自部署 RSSHub 实例地址（公共实例限流严重）
- `DOUBAN_CITY_ID` — 豆瓣同城城市代码

无 API Key 时自动降级：种子数据 + fallback 日程规划。

## 技术决策

- **Vite 而非 Next.js**：纯客户端 SPA，无需 SSR，PWA/Capacitor 兼容好
- **Tailwind v4**：`@tailwindcss/vite` 插件集成，零配置
- **SQLite**：活动数据量小，单文件零运维
- **LLM 分层**：DeepSeek 做结构化提取（便宜），Claude 做规划推荐（质量）
- **优雅降级**：RSS 不可用→种子数据，无 API Key→fallback plan
