# 周末去哪玩

以活动为锚点的周末配套规划工具。浏览真实北京活动 → 选中 → AI 自动编排全天日程（含小红书风格餐厅推荐 + 附近景点）。

## 功能

- **真实活动发现** — Tavily 搜索 + LLM 结构化，每轮聚合 12-15 个真实北京活动（展览、电影、读书会、AI meetup 等）
- **小红书餐厅推荐** — 搜索小红书索引内容，LLM 提取评分、人均、推荐理由
- **一键日程编排** — 选定活动后，AI 自动安排午餐 → 主活动 → 晚餐 → 探索的全天时间线
- **对话调整** — 不满意就聊，AI 实时重编日程
- **高德 POI 搜索** — 活动地点附近的真实餐厅、景点数据
- **PWA 支持** — 离线缓存 + 添加到主屏

## 技术栈

| 层         | 技术                           |
| ---------- | ------------------------------ |
| 前端       | React 19 + Vite + Tailwind v4 |
| 后端       | FastAPI + SQLite               |
| LLM        | OpenAI 兼容 API (claude-opus-4-6)  |
| 搜索       | Tavily（小红书 + 活动信息）    |
| 地图       | 高德开放平台                   |
| 设计系统   | Laper AI 有机极简主义          |

## 快速开始

### 后端

```bash
cd backend
cp .env.example .env  # 填入 API Key
pip3 install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
pnpm install
pnpm dev  # localhost:5173
```

### Docker

```bash
docker compose up
```

## 环境变量

`backend/.env`:

| 变量             | 说明                         | 必须 |
| ---------------- | ---------------------------- | ---- |
| `LLM_API_KEY`    | OpenAI 兼容 API Key          | 是   |
| `LLM_BASE_URL`   | API 地址                     | 是   |
| `LLM_MODEL`      | 模型名                       | 是   |
| `AMAP_KEY`       | 高德地图 Key（POI 搜索）     | 否   |
| `TAVILY_API_KEY`  | Tavily Key（小红书 + 活动搜索） | 否   |

无 API Key 时自动降级为种子数据 + fallback 日程。

## 设计系统

采用 Laper AI 有机极简主义：

- 森林绿 `#526c4b` + 纸张白 `#fdfefb`，拒绝纯黑纯白
- Montserrat + Noto Sans SC 字体组合
- 半像素级精致阴影 `0 1px 2px #0000000f`
- `fade-up` 入场动画 + 弹性缓动
- 骨架屏加载态，零白屏体验

## API 接口

```
GET  /api/health                    — 健康检查
GET  /api/activities?category=AI    — 活动列表（支持分类筛选）
GET  /api/activities/:id            — 活动详情
POST /api/plan    {activity_id}     — 生成配套日程
POST /api/chat    {activity_id, message, current_plan} — 对话调整日程
POST /api/refresh                   — 手动重新聚合活动
```

## 数据流

```
Tavily 搜索真实北京活动 → LLM 结构化 → SQLite 存储
                                         ↓
用户选活动 → 高德 POI + Tavily 小红书 → LLM 编排全天日程
                                         ↓
用户对话调整 → LLM 重新编排 → 前端实时更新时间线
```

## 项目结构

```
weekend-planner/
├── frontend/                    # React + Vite + Tailwind v4 (PWA)
│   └── src/
│       ├── api/client.ts        # API 客户端（AbortController 超时）
│       ├── components/          # ActivityCard · CategoryFilter · Timeline
│       ├── pages/               # DiscoverPage · PlanPage · ChatPage
│       ├── types/               # TypeScript 类型定义
│       └── index.css            # Laper AI 设计系统 token
├── backend/                     # FastAPI + SQLite
│   ├── main.py                  # 路由 + 生命周期（非阻塞首次聚合）
│   ├── aggregator.py            # Tavily + LLM 活动聚合引擎
│   ├── planner.py               # 高德 POI + 小红书餐厅 + LLM 日程编排
│   ├── db.py                    # SQLite 数据层
│   └── config.py                # 环境变量
├── Dockerfile                   # 多阶段构建
├── docker-compose.yml           # 一键部署
└── dev.sh                       # 本地开发启动
```

## 版本历史

### V2 (当前)
- 健壮 JSON 解析：统一 `_parse_llm_json()` 处理 LLM 返回的 markdown 包裹、格式不规范等问题
- 非阻塞启动：首次聚合放入后台，API 秒级就绪
- 前端体验：AbortController 超时控制、骨架屏加载态、动画性能优化
- 日期格式化：智能显示"本周六"/"明天"等相对日期

### V1
- 完整功能交付：活动发现 → 日程规划 → 对话调整
- Tavily + LLM 真实数据聚合
- 小红书餐厅推荐（无需登录）
- Laper AI 设计系统全面落地
