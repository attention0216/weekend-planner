# 周末去哪玩 (weekend-planner)

以活动为锚点的周末配套规划工具。三次点选（心情→时间→同伴）→ AI SSE 流式生成信息差日程 → 集邮册记录。

## 架构

```
weekend-planner/
├── frontend/                    # React 19 + Vite 6 + Tailwind v4 (PWA)
│   ├── vite.config.ts           # Tailwind + PWA + API 代理
│   └── src/
│       ├── App.tsx              # ErrorBoundary + 认证门控 + Toast + OnboardingOverlay + 四页路由
│       ├── index.css            # Laper 设计系统（森林绿 · 纸张白 · 8px 间距 · badge · 动效）
│       ├── stores/
│       │   ├── userStore.ts     # Zustand 用户状态（认证 + 画像 + needsOnboarding）
│       │   └── planStore.ts     # Zustand 日程状态（三步点选 + SSE 流式 addItem）
│       ├── hooks/
│       │   ├── useAuth.ts       # Supabase Auth hook（认证后拉取画像，新用户触发引导）
│       │   └── useSSE.ts        # SSE 流式消费 hook（POST → text/event-stream → 回调）
│       ├── api/
│       │   ├── client.ts        # 统一 API 客户端（profile/plan/stamps/feedback 全端点）
│       │   └── planCache.ts     # 日程缓存（内存 + sessionStorage）
│       ├── types/index.ts       # Activity, ScheduleItem, Plan, UserProfile, Stamp, PlanSSEEvent
│       ├── utils/               # formatDate, amap 导航
│       ├── components/
│       │   ├── BottomNav.tsx     # 底部 4 Tab 导航
│       │   ├── MoodCard.tsx      # 心情选择卡片（2×2 网格）
│       │   ├── PillGroup.tsx     # 胶囊按钮组（单选高亮 + ARIA）
│       │   ├── TimelineNode.tsx  # 时间线节点（折叠/展开 + SourceBadge）
│       │   ├── TimelineLine.tsx  # 时间线连接线（交通时间标注）
│       │   ├── AdjustBar.tsx     # 调整操作栏（换/删/近/便宜）
│       │   ├── SourceBadge.tsx   # 信息来源标记（小红书/限时/通用）
│       │   ├── Toast.tsx         # 全局反馈通知（成功/错误 + 重试）
│       │   └── OnboardingOverlay.tsx # 首次画像引导浮层
│       └── pages/
│           ├── DiscoverPage.tsx  # 活动发现（分类筛选 + 可展开详情）
│           ├── PlanPage.tsx      # 日程规划（SSE 流式时间线 + 调整 + 确认）
│           ├── StampPage.tsx     # 集邮册（时间线 + 手动打卡 + 盖章动画）
│           ├── ProfilePage.tsx   # 画像设置（PillGroup 饮食/预算/社交）
│           └── LoginPage.tsx     # 手机号 OTP 登录
├── backend/                     # FastAPI + SQLite WAL
│   ├── main.py                  # 路由 + CORS + SSE 流式 + lifespan 聚合
│   ├── models.py                # Pydantic 请求/响应模型
│   ├── auth.py                  # Supabase JWT 验证（开发模式降级）
│   ├── config.py                # 环境变量（LLM/高德/Tavily/Supabase）
│   ├── db.py                    # SQLite 5 表 + CRUD（activities/plans/stamps/profiles/feedback）
│   ├── aggregator.py            # Tavily 搜索 + LLM 结构化 + URL 验证 + url_verified 标记
│   ├── planner.py               # 高德 POI + 小红书 + LLM 编排 + FR9/FR10 后处理
│   ├── adjuster.py              # 日程调整（swap/remove/closer/cheaper + 交通重算）
│   ├── seed_data.py             # 降级种子数据（20 个北京活动）
│   └── requirements.txt         # Python 依赖
├── Dockerfile                   # 多阶段构建（HuggingFace Spaces）
├── docker-compose.yml           # 一键部署
├── vercel.json                  # Vercel 前端部署 + API rewrite
└── dev.sh                       # 本地开发启动
```

## 数据流

```
Tavily 垂直搜索 → LLM 结构化 → URL HEAD 验证(+url_verified) → SQLite activities 表
三次点选 → [并行] 高德 POI + Tavily 小红书 → LLM 编排 → _enrich_sources(FR9/FR10) → SSE 流式推送 → plans 表
确认日程（出发吧）→ 自动入册 stamps 表 + 偏好学习
手动打卡 → stamps 表 + 偏好学习
```

## API

- `GET  /api/health` — 健康检查（无需认证）
- `GET  /api/profile` — 获取画像
- `PUT  /api/profile` — 更新画像
- `GET  /api/activities` — 活动列表（category/mood/q 筛选）
- `GET  /api/activities/:id` — 活动详情
- `GET  /api/categories` — 分类统计
- `POST /api/plan` — **SSE 流式**生成日程（type:item → type:done）
- `GET  /api/plans` — 我的日程列表
- `POST /api/plan/adjust` — 调整日程项
- `POST /api/plan/:id/confirm` — 确认日程 → 自动入册
- `GET  /api/stamps` — 集邮册列表
- `POST /api/stamps` — 手动打卡
- `POST /api/feedback` — 信息有误反馈
- `POST /api/nearby` — 附近推荐（GPS → 高德 POI）
- `POST /api/refresh` — 手动聚合
- `POST /api/chat` — 对话调整（兼容旧版）

## 开发

```bash
cd frontend && pnpm dev          # localhost:5173
cd backend && uvicorn main:app --reload  # localhost:8000
```

## 部署

- **前端**: Vercel (https://frontend-nine-jade-54.vercel.app)
- **后端**: HuggingFace Spaces (https://hxzzzzzzz-weekend-planner.hf.space)
- API 代理: vercel.json rewrites `/api/*` → HF Space

## 配置

`backend/.env`:
- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` — OpenAI 兼容 LLM
- `AMAP_KEY` — 高德地图（POI + 逆地理编码）
- `TAVILY_API_KEY` — Tavily（小红书 + 活动搜索）
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_JWT_SECRET` — Supabase 认证

`frontend/.env`:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — 前端 Supabase 配置

## 设计系统

Laper 有机极简主义：
- 森林绿 `#526c4b` + 纸张白 `#fdfefb` + 暖白 `#f5f2ed`
- Montserrat + Noto Sans SC, 7 级字号
- 8px 间距系统, 半像素阴影
- badge 系统: badge-xhs(绿) / badge-limited(琥珀)
- 动效: fade-up / slide-up / scale-in / stamp
- 响应式: 桌面 hover + safe-area + prefers-reduced-motion

## 技术决策

- **认证**: Supabase Auth（开发模式 dev-user 自动放行 + 画像拉取 + 引导触发）
- **状态**: Zustand（userStore + planStore）
- **三次点选**: 心情→时间→同伴，无"下一步"按钮，自动过渡
- **SSE 流式**: POST /api/plan → text/event-stream → useSSE hook → addItem 逐项渲染
- **并行请求**: 高德 POI 和小红书搜索 asyncio.gather
- **双层缓存**: 内存 + sessionStorage
- **信息差**: _enrich_sources 强制 ≥50% 小红书来源 + ≥2 项限时活动
- **偏好学习**: 调整/打卡行为自动更新 user_profiles 权重
- **自动入册**: 确认日程后自动创建 stamps
- **降级**: Tavily 不可用→种子数据, LLM 超时→模板日程
- **统一 API**: 所有页面通过 api/client.ts，禁止 raw fetch
- **全局反馈**: Toast + showToast() 替代静默错误处理
