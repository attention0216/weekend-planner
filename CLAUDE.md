# 周末去哪玩 (weekend-planner)

以活动为锚点的周末配套规划工具。浏览真实活动 → 选中 → AI 生成小红书风格的餐厅推荐 + 景点 + 全天时间线。

## 架构

```
weekend-planner/
├── frontend/                    # React + Vite + Tailwind v4 (PWA)
│   ├── vite.config.ts           # Tailwind + PWA + API 代理
│   └── src/
│       ├── App.tsx              # 根组件 + 路由定义
│       ├── index.css            # Laper AI 设计系统（自然绿 · 纸张白）
│       ├── api/client.ts        # API 客户端（唯一通信层）
│       ├── types/index.ts       # Activity, ScheduleItem, Restaurant, Plan
│       ├── components/
│       │   ├── ActivityCard.tsx  # 活动卡片（极简有机风）
│       │   ├── CategoryFilter.tsx # 分类筛选
│       │   └── Timeline.tsx     # 垂直时间线（入场动画）
│       └── pages/
│           ├── DiscoverPage.tsx  # 活动发现（骨架屏 + 渐入动画）
│           ├── PlanPage.tsx      # 日程规划（小红书餐厅推荐）
│           └── ChatPage.tsx      # 对话调整日程
├── backend/                     # FastAPI + SQLite
│   ├── main.py                  # API 路由 + 生命周期管理
│   ├── config.py                # 环境变量入口（LLM/高德/Tavily）
│   ├── db.py                    # SQLite 数据层
│   ├── aggregator.py            # LLM + Tavily 真实活动聚合
│   ├── planner.py               # 高德 POI + 小红书餐厅 + LLM 日程编排
│   ├── seed_data.py             # 降级容错种子数据
│   └── requirements.txt         # Python 依赖
├── Dockerfile                   # 多阶段构建
├── docker-compose.yml           # 一键部署
└── dev.sh                       # 本地开发启动
```

## 数据流

```
Tavily 搜索北京活动 → LLM 结构化为活动列表 → SQLite
用户选活动 → 高德 POI + Tavily 小红书搜索 → LLM 编排日程
用户对话调整 → LLM 重新编排 → 前端实时更新
```

## API

- `GET  /api/health` — 健康检查
- `GET  /api/activities?category=AI` — 活动列表
- `GET  /api/activities/:id` — 活动详情
- `POST /api/plan` — 生成配套日程（含小红书餐厅推荐）
- `POST /api/chat` — 对话调整日程
- `POST /api/refresh` — 手动重新聚合

## 开发

```bash
cd frontend && pnpm dev          # localhost:5173
cd backend && uvicorn main:app --reload  # localhost:8000
```

## 配置

`backend/.env`:
- `LLM_API_KEY` — OpenAI 兼容 API Key（活动发现 + 日程规划 + 对话）
- `LLM_BASE_URL` — API 地址（默认 https://llm.listenhub.dev/v1）
- `LLM_MODEL` — 模型名（默认 claude-opus-4-6）
- `AMAP_KEY` — 高德地图 Key（POI 搜索，可选）
- `TAVILY_API_KEY` — Tavily Key（小红书搜索，可选）

无 API Key 时自动降级：种子数据 + fallback 日程。

## 设计系统

采用 Laper AI 有机极简主义：
- **色彩**：森林绿 `#526c4b` + 纸张白 `#fdfefb`，不用纯黑纯白
- **字体**：Montserrat + Noto Sans SC
- **阴影**：半像素级精致阴影（`0 1px 2px #0000000f`）
- **动画**：`fade-up` 入场 + `cubic-bezier(0.16, 1, 0.3, 1)` 缓动
- **圆角**：xl(16px) 为主，lg(12px) 为辅

## 技术决策

- **OpenAI 兼容 API**：统一调用接口，支持多种 LLM 提供商
- **Tavily 搜小红书**：无需登录，搜索引擎索引的小红书内容
- **LLM 活动聚合**：RSS 不可靠，用 AI 生成真实活动数据
- **Tailwind v4**：CSS 原生变量，`@theme` 声明设计 token
- **PWA**：离线缓存 + 添加到主屏
