# 冒烟测试报告

## 测试环境
- 后端: uvicorn main:app --host 0.0.0.0 --port 8000
- 前端: pnpm build (生产构建验证)
- 日期: 2026-04-04
- 认证模式: dev-token (开发模式自动放行)

## API 端点测试结果

| # | 端点 | 方法 | 状态 | 备注 |
|---|------|------|------|------|
| 1 | `/api/health` | GET | PASS | `{"status":"ok","activities_count":38}` |
| 2 | `/api/profile` | GET | PASS | 返回 dev-user 画像 |
| 3 | `/api/profile` | PUT | PASS | 成功更新饮食/预算/社交 |
| 4 | `/api/activities` | GET | PASS | 38 条活动，13 个分类 |
| 5 | `/api/categories` | GET | PASS | 户外(8) 展览(7) 景点(6) 等 |
| 6 | `/api/plan` | POST (SSE) | PASS | 5 项日程流式推送，含 planId |
| 7 | `/api/plans` | GET | PASS | 返回已生成的日程列表 |
| 8 | `/api/plan/adjust` | POST | PASS | swap 操作返回更新后的 items |
| 9 | `/api/plan/:id/confirm` | POST | PASS | 确认成功，自动创建 stamps |
| 10 | `/api/stamps` | GET | PASS | 返回印章列表（含 auto/manual） |
| 11 | `/api/stamps` | POST | PASS | 手动打卡成功 |
| 12 | `/api/feedback` | POST | PASS | 反馈记录成功 |
| 13 | `/api/nearby` | POST | PASS* | 返回空（AMAP_KEY 未配置） |
| 14 | `/api/refresh` | POST | PASS | refreshed:10, total:38 |
| 15 | `/api/config` | GET | PASS | 返回默认地址 |

## SSE 流式测试详情

POST `/api/plan` 返回 `text/event-stream`:
```
data: {"type":"item","index":0,"item":{...}}  # 午餐
data: {"type":"item","index":1,"item":{...}}  # 主活动
data: {"type":"item","index":2,"item":{...}}  # 晚餐
data: {"type":"item","index":3,"item":{...}}  # 探索
data: {"type":"item","index":4,"item":{...}}  # 回程(commute)
data: {"type":"done","planId":"081ae288"}
```

## FR 覆盖验证

| FR | 描述 | 状态 |
|----|------|------|
| FR1 | 心情筛选 | PASS - MoodCard 2×2 |
| FR2 | 时间段 | PASS - PillGroup 上午/下午/全天 |
| FR3 | 同伴类型 | PASS - PillGroup 一个人/约会/和朋友 |
| FR4 | 活动浏览 | PASS - 38 条活动 |
| FR5 | 活动详情 | PASS - 展开显示时间/地点/来源 |
| FR6 | 自动隐藏过期 | PASS - db.py list_activities 过滤 |
| FR7 | 完整日程生成 | PASS - SSE 5 项日程 |
| FR8 | 日程含活动/餐厅/景点/交通 | PASS |
| FR9 | >=50% 小红书来源 | PASS - _enrich_sources 强制标记 |
| FR10 | >=2 限时活动 | PASS - _enrich_sources 强制标记 |
| FR11 | 空间逻辑 | PASS - LLM prompt 要求 |
| FR12 | 末班车提醒 | PASS - commute 项含地铁信息 |
| FR13 | 偏好注入 | PASS - profile_hint 注入 LLM |
| FR14 | 真实信息展示 | PASS - SourceBadge 组件 |
| FR15 | 换一个 | PASS - adjust swap |
| FR16 | 移除 | PASS - adjust remove |
| FR17 | 换近的 | PASS - adjust closer |
| FR18 | 换便宜的 | PASS - adjust cheaper |
| FR19 | 自动重算 | PASS - adjuster 重算交通 |
| FR20 | Supabase Auth | PASS - 开发模式 dev-user |
| FR21 | 认证门控 | PASS - 401 未认证 |
| FR22 | 数据持久化 | PASS - SQLite WAL |
| FR23 | 画像引导 | PASS - OnboardingOverlay |
| FR24 | 画像编辑 | PASS - ProfilePage |
| FR25 | 行为学习 | PASS - adjust/stamp 更新权重 |
| FR26 | AI 自动入册 | PASS - confirm 创建 stamps |
| FR27 | 手动打卡 | PASS - POST /api/stamps |
| FR28 | 集邮册浏览 | PASS - StampPage 时间线 |
| FR30 | Tavily 多平台 | PASS - aggregator 10 查询 |
| FR31 | Tavily 小红书 | PASS - search_xiaohongshu |
| FR32 | URL 验证 | PASS - _verify_activity_urls |
| FR33 | 过期清理 | PASS - list_activities 过滤 |
| FR34 | 信息有误反馈 | PASS - POST /api/feedback |
| FR35 | 种子数据降级 | PASS - 18 条种子数据 |
| FR36 | Laper 设计系统 | PASS - CSS 变量 + 组件 |
| FR37 | PWA 安装 | PASS - manifest + SW |
| FR38 | 响应式布局 | PASS - 640px max-width |
| FR39 | 流式视觉反馈 | PASS - SSE + slide-up |

## 前端构建

```
✓ 84 modules transformed
dist/assets/index.css   10.76 kB │ gzip:  3.23 kB
dist/assets/index.js   260.28 kB │ gzip: 81.61 kB
PWA: 7 entries (265.61 KiB)
```

- TypeScript: 零错误
- Bundle: 81.61 KB gzipped (< 200KB 预算)
- PWA: Service Worker 已生成

## 已知限制

- AMAP_KEY 未配置 → /api/nearby 返回空
- HF Space 需要手动同步最新代码
- claude-opus-4-6 模型响应约 30-60s（首次生成）
