# 周末去哪玩 — 产品需求文档 (PRD)

## 1. 产品定位

**一句话**：以活动为锚点，AI 自动编排完整一天——午餐、主活动、晚餐、探店、回程，一键搞定。

**目标用户**：周末不知道干什么的城市打工人，不想花 30 分钟在大众点评和高德之间反复横跳。

**核心价值**：选一个活动 → AI 规划完整一天 → 打开手机直接出发。

---

## 2. 功能清单

### 2.1 活动发现（DiscoverPage）
| 功能 | 描述 |
|------|------|
| 天气卡片 | Open-Meteo 免费 API，显示 3 天天气 + 室内/户外建议 |
| 心情发现 | 想放松/想社交/想冒险/想安静 → 映射到分类组合 |
| 关键词搜索 | 标题/分类/地点/描述全文搜索，300ms debounce |
| 分类筛选 | 动态分类统计，从数据聚合自动生成 |
| 帮我选 FAB | 随机选活动直接跳转规划页 |
| 附近推荐 | GPS 定位 → 高德 POI + 小红书餐厅推荐 |
| 滚动位置记忆 | sessionStorage 保存/恢复滚动位置 |

### 2.2 日程规划（PlanPage）
| 功能 | 描述 |
|------|------|
| AI 日程编排 | LLM 根据活动 + 附近餐厅 + 景点 + 用户偏好生成完整日程 |
| 智能时段 | 注入当前时间，下午不推荐已过去的午餐 |
| 小红书餐厅 | Tavily 搜索 + LLM 结构化，推荐人均 10-50 元实惠餐厅 |
| 回程规划 | 自动推算末班地铁，确保 24:00 前到家 |
| 执行模式 | 浮动底栏显示当前步骤 + 进度 + 一键导航 |
| 高德导航 | 手机直接唤起高德 App（iOS/Android），桌面跳网页 |
| 对话调整 | 内嵌聊天抽屉，自然语言修改日程 |
| 收藏/分享 | 本地收藏 + 复制日程到剪贴板 |
| 规划缓存 | 相同活动不重复调 LLM，5 分钟 TTL |

### 2.3 用户画像（ProfilePage）
| 维度 | 选项 |
|------|------|
| 饮食需求 | 高蛋白/低糖低油/清淡/无辣/素食/无海鲜/无乳制品 |
| 社交偏好 | 认识新朋友/适合约会/一个人/和朋友 |
| 餐饮预算 | 经济(≤30)/适中(30-80)/不限 |
| 自由备注 | 文本输入 |

### 2.4 规划历史（HistoryPage）
| 功能 | 描述 |
|------|------|
| 历史列表 | 最近 30 次规划，按时间倒序 |
| 快速重访 | 点击直接跳转规划页（命中缓存秒开） |
| 清空历史 | 一键清除 |

### 2.5 系统能力
| 能力 | 实现 |
|------|------|
| 名字登录 | 输入名字即用，localStorage 存储 |
| PWA 安装 | 添加到主屏幕，standalone 模式 |
| 离线缓存 | 活动列表 StaleWhileRevalidate + 天气 30min 缓存 |
| 暗色模式 | CSS 变量 + `prefers-color-scheme` 自动切换 |

---

## 3. 技术架构

```
前端 (React + Vite + Tailwind v4 + PWA)
├── pages/          DiscoverPage · PlanPage · ChatPage · ProfilePage · HistoryPage
├── components/     ActivityCard · Timeline · ChatDrawer · ExecutionBar · LoginCard · CategoryFilter
├── api/            client.ts (统一请求层) · planCache.ts
├── utils/          amap.ts (高德唤起) · index.ts
└── types/          index.ts (核心类型)

后端 (FastAPI + Python)
├── main.py         API 路由 + 数据层适配器
├── planner.py      LLM 日程规划 + 高德 POI + 小红书推荐
├── aggregator.py   活动数据聚合 (Tavily → LLM 结构化)
├── weather.py      Open-Meteo 天气预报
├── github_db.py    GitHub REST API 数据层
├── db.py           SQLite 数据层 (fallback)
└── config.py       环境变量配置
```

### 数据流
```
用户选活动 → geocode(地址)
           → 并行: 高德POI搜餐厅 + 高德搜景点 + 高德搜地铁 + 小红书搜餐厅
           → LLM编排日程(活动+餐厅+景点+用户偏好+当前时间+地铁末班车)
           → 返回完整日程
```

### 数据层双模
- **GitHub 模式**：`GITHUB_TOKEN` + `GITHUB_REPO` → JSON 文件存 GitHub 仓库
- **SQLite 模式**：无 GitHub 配置时退化为本地 SQLite

---

## 4. API 端点

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/activities` | 活动列表（?category=&mood=&q=&limit=） |
| GET | `/api/activities/:id` | 活动详情 |
| POST | `/api/plan` | 生成日程规划 |
| POST | `/api/chat` | 对话调整日程 |
| POST | `/api/refresh` | 重新聚合活动数据 |
| GET | `/api/categories` | 分类统计 |
| GET | `/api/config` | 系统配置 |
| GET | `/api/weather` | 3天天气预报 |
| POST | `/api/nearby` | 附近推荐（GPS定位） |
| GET/PUT | `/api/user/:name` | 用户数据读写 |

---

## 5. 部署方案

| 层 | 平台 | 费用 |
|----|------|------|
| 前端 | Vercel | 免费 |
| 后端 | Render.com | 免费 |
| 数据库 | GitHub 仓库 | 免费 |
| 天气 | Open-Meteo | 免费 |
| 地图 | 高德 Web API | 免费额度 |
| 搜索 | Tavily | 免费额度 |
| LLM | 用户自备 API Key | — |

### 环境变量
```
LLM_API_KEY      — LLM 服务 API Key
LLM_BASE_URL     — LLM 服务基础 URL
LLM_MODEL        — 模型名称
AMAP_KEY         — 高德地图 API Key
TAVILY_API_KEY   — Tavily 搜索 API Key
GITHUB_TOKEN     — GitHub Personal Access Token
GITHUB_REPO      — GitHub 仓库名 (owner/repo)
VITE_API_URL     — 后端 API 地址（前端构建时注入）
```

---

## 6. 版本演进

| 版本 | 主题 | 关键特性 |
|------|------|---------|
| V1-V2 | 基础搭建 | 活动聚合 + 日程规划 + 基础 UI |
| V3 | 真实化 | 用户画像 + 定位推荐 + 小红书数据 |
| V4 | 交互升级 | 内嵌对话 + 收藏 + 分享 + 暗色模式 |
| V5 | 打磨 | 桌面适配 + 微交互 + 错误处理 |
| V6 | 沉浸式重构 | Apple 设计语言 + 执行模式 + 时间线视觉分级 |
| V7 | 基础设施 | 高德 App 唤起 + 名字登录 + GitHub 数据层 + 云部署 |
| V8 | 体验灵魂 | 天气感知 + 心情发现 + 帮我选 + 智能时段 |
| V9 | 产品化 | 活动搜索 + 规划历史 + PWA 强化 + PRD |
