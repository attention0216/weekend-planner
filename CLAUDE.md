# 周末去哪玩 (weekend-planner)

以活动为锚点的周末配套规划工具。浏览真实活动 → 选中 → AI 生成小红书风格的餐厅推荐 + 景点 + 全天时间线。

## 架构

```
weekend-planner/
├── frontend/                    # React + Vite + Tailwind v4 (PWA)
│   ├── vite.config.ts           # Tailwind + PWA + API 代理
│   └── src/
│       ├── App.tsx              # 根组件 + ErrorBoundary + 底部导航 + 路由
│       ├── index.css            # Laper AI 设计系统（自然绿 · 纸张白 · 响应式）
│       ├── api/
│       │   ├── client.ts        # API 客户端（AbortSignal + 超时 + 画像注入）
│       │   └── planCache.ts     # 日程缓存（内存 + sessionStorage 双层）
│       ├── types/index.ts       # Activity, ScheduleItem, Restaurant, Plan
│       ├── utils/index.ts       # formatDate 智能日期
│       ├── components/
│       │   ├── ActivityCard.tsx  # 活动卡片（原链接 · 收藏 · 极简有机风）
│       │   ├── CategoryFilter.tsx # 分类筛选
│       │   ├── ChatDrawer.tsx   # 底部对话抽屉（内嵌日程调整）
│       │   └── Timeline.tsx     # 可展开时间线（地图链接 · 详情）
│       └── pages/
│           ├── DiscoverPage.tsx  # 活动发现 + 附近推荐（Geolocation）
│           ├── PlanPage.tsx      # 日程规划（缓存 · 分享 · 收藏 · 重新规划）
│           ├── ChatPage.tsx      # 对话调整（保留兼容）
│           └── ProfilePage.tsx   # 用户画像（饮食/社交/预算偏好）
├── backend/                     # FastAPI + SQLite
│   ├── main.py                  # 路由 + 并行加速 + 用户画像 + 附近推荐
│   ├── config.py                # 环境变量入口（LLM/高德/Tavily）
│   ├── db.py                    # SQLite + WAL 模式
│   ├── aggregator.py            # Tavily垂直搜索 + LLM结构化 + URL验证
│   ├── planner.py               # 高德POI + 小红书餐厅 + LLM日程编排
│   ├── seed_data.py             # 降级容错种子数据
│   └── requirements.txt         # Python 依赖
├── Dockerfile                   # 多阶段构建
├── docker-compose.yml           # 一键部署
└── dev.sh                       # 本地开发启动
```

## 数据流

```
Tavily 垂直搜索（site:douban/maoyan/dianping）→ LLM 结构化 → URL HEAD 验证 → SQLite
用户选活动 → [并行] 高德 POI + Tavily 小红书 → LLM 编排日程（注入用户画像）
用户对话调整 → LLM 重新编排 → 前端即时更新时间线
用户定位 → 高德逆地理编码 → 附近搜索 + 小红书推荐
```

## API

- `GET  /api/health` — 健康检查
- `GET  /api/activities?category=AI` — 活动列表
- `GET  /api/activities/:id` — 活动详情
- `POST /api/plan` — 生成配套日程（含用户画像）
- `POST /api/chat` — 对话调整日程
- `POST /api/nearby` — 基于定位的附近推荐
- `POST /api/refresh` — 手动重新聚合

## 开发

```bash
cd frontend && pnpm dev          # localhost:5173
cd backend && uvicorn main:app --reload  # localhost:8000
```

## 配置

`backend/.env`:
- `LLM_API_KEY` — OpenAI 兼容 API Key
- `LLM_BASE_URL` — API 地址
- `LLM_MODEL` — 模型名
- `AMAP_KEY` — 高德地图 Key（POI + 逆地理编码）
- `TAVILY_API_KEY` — Tavily Key（小红书 + 活动搜索）

## 设计系统

Laper AI 有机极简主义：
- 森林绿 `#526c4b` + 纸张白 `#fdfefb`
- Montserrat + Noto Sans SC
- 半像素阴影 · slide-up/fade-up 动画
- 响应式：桌面 hover 微动效 + 安卓触控优化 + safe-area

## 技术决策

- **并行请求**：高德 POI 和小红书搜索同时进行，减少等待
- **双层缓存**：内存 + sessionStorage，返回不重新推理
- **内嵌对话**：底部抽屉替代独立页面，调整即时可见
- **垂直搜索**：site: 限定搜索豆瓣/猫眼/大众点评
- **URL 验证**：HTTP HEAD 检查链接真实性
- **用户画像**：饮食/社交/预算注入所有 LLM 推荐环节
