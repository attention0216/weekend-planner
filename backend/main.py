from __future__ import annotations
"""
周末去哪玩 — API 入口
认证 · 画像 · 活动 · 日程编排 · 集邮册
"""
import json
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import (
    ProfileUpdate, PlanRequest, AdjustRequest, StampCreate,
    FeedbackRequest, ChatRequest, NearbyRequest,
)

from config import AGGREGATION_INTERVAL_HOURS, BASE_DIR, DEFAULT_ADDRESS
from auth import get_current_user, optional_user
from db import (
    init_db,
    list_activities as db_list, get_activity as db_get, count_activities as db_count,
    get_profile, upsert_profile,
    save_plan, get_plan, list_plans,
    save_stamp, list_stamps,
    save_feedback,
)
from aggregator import run_aggregation
from planner import (
    geocode, search_nearby_pois,
    search_xiaohongshu_restaurants,
    generate_plan, generate_chat_response,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger(__name__)

scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化 + 首次聚合 + 定时任务"""
    init_db()
    logger.info("数据层: SQLite WAL")

    import asyncio
    if db_count() == 0:
        logger.info("数据为空，后台执行首次聚合...")
        async def _safe_aggregation():
            try:
                await run_aggregation()
            except Exception as e:
                logger.error(f"首次聚合异常: {e}")
        asyncio.create_task(_safe_aggregation())

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        global scheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(run_aggregation, "interval", hours=AGGREGATION_INTERVAL_HOURS, id="aggregation")
        scheduler.start()
        logger.info(f"定时聚合已启动，间隔 {AGGREGATION_INTERVAL_HOURS} 小时")
    except ImportError:
        logger.warning("apscheduler 未安装，定时聚合不可用")

    yield

    if scheduler:
        scheduler.shutdown()


app = FastAPI(title="周末去哪玩", version="4.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:4173", "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.hf.space",
    ],
    allow_origin_regex=r"https://.*\.(vercel\.app|hf\.space)",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 心情 → 分类映射 ──

MOOD_CATEGORIES: dict[str, list[str]] = {
    "放松": ["展览", "咖啡", "书店", "公园", "spa"],
    "社交": ["读书会", "运动", "聚会", "脱口秀", "桌游"],
    "冒险": ["户外", "市集", "探店", "徒步", "骑行"],
    "安静": ["展览", "书店", "博物馆", "电影", "音乐"],
}


def _profile_to_hint(profile: dict | None) -> str:
    """画像 → LLM 提示词"""
    if not profile:
        return ""
    parts = []
    diet = json.loads(profile.get("diet", "[]")) if isinstance(profile.get("diet"), str) else profile.get("diet", [])
    if diet:
        parts.append(f"饮食需求：{', '.join(diet)}")
    if profile.get("social"):
        parts.append(f"社交偏好：{profile['social']}")
    if profile.get("budget"):
        budget_map = {"50以下": "人均50元以内", "50-100": "人均50-100元", "100-200": "人均100-200元", "200+": "人均200元以上", "适中": "人均50-100元"}
        parts.append(f"预算：{budget_map.get(profile['budget'], profile['budget'])}")
    return "\n".join(parts) if parts else ""


def _update_preference_from_adjust(user_id: str, action: str):
    """Story 5.3: 调整行为 → 偏好权重更新"""
    profile = get_profile(user_id)
    if not profile:
        return
    weights = json.loads(profile.get("preference_weights", "{}"))
    if action == "closer":
        weights["prefer_closer"] = weights.get("prefer_closer", 0) + 1
    elif action == "cheaper":
        weights["prefer_cheaper"] = weights.get("prefer_cheaper", 0) + 1
    elif action == "remove":
        weights["removals"] = weights.get("removals", 0) + 1
    upsert_profile({**profile, "preference_weights": json.dumps(weights, ensure_ascii=False)})


def _update_preference_from_stamp(user_id: str, activity_type: str, area: str):
    """Story 5.3: 打卡行为 → 类型/区域权重更新"""
    profile = get_profile(user_id)
    if not profile:
        return
    weights = json.loads(profile.get("preference_weights", "{}"))
    type_key = f"type_{activity_type}"
    area_key = f"area_{area}"
    weights[type_key] = weights.get(type_key, 0) + 1
    weights[area_key] = weights.get(area_key, 0) + 1
    upsert_profile({**profile, "preference_weights": json.dumps(weights, ensure_ascii=False)})


# ══════════════════════════════════════════════════════
#  路由
# ══════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok", "activities_count": db_count()}


# ── 画像 ──

@app.get("/api/profile")
async def api_get_profile(user_id: str = Depends(get_current_user)):
    profile = get_profile(user_id)
    if not profile:
        return {"user_id": user_id, "name": "", "diet": [], "budget": "适中", "social": "一个人"}
    profile["diet"] = json.loads(profile["diet"]) if isinstance(profile["diet"], str) else profile["diet"]
    return profile


@app.put("/api/profile")
async def api_update_profile(req: ProfileUpdate, user_id: str = Depends(get_current_user)):
    upsert_profile({
        "user_id": user_id,
        "name": req.name,
        "diet": json.dumps(req.diet, ensure_ascii=False),
        "budget": req.budget,
        "social": req.social,
        "preference_weights": "{}",
    })
    return {"ok": True}


# ── 活动 ──

@app.get("/api/activities")
async def api_list_activities(
    category: str = Query("", description="分类筛选"),
    mood: str = Query("", description="心情筛选"),
    q: str = Query("", description="关键词搜索"),
    limit: int = Query(50, ge=1, le=200),
):
    all_acts = db_list(limit=500)

    if q:
        q_lower = q.lower()
        all_acts = [a for a in all_acts if
            q_lower in a.get("title", "").lower() or
            q_lower in a.get("category", "").lower() or
            q_lower in a.get("location", "").lower() or
            q_lower in a.get("description", "").lower()
        ]
    elif mood and mood in MOOD_CATEGORIES:
        keywords = MOOD_CATEGORIES[mood]
        all_acts = [a for a in all_acts if any(
            kw in a.get("category", "").lower() or kw in a.get("title", "").lower()
            for kw in keywords
        )]
    elif category and category != "全部":
        all_acts = [a for a in all_acts if a.get("category") == category]

    all_acts.sort(key=lambda a: a.get("date", ""))
    return all_acts[:limit]


@app.get("/api/activities/{activity_id}")
async def api_get_activity(activity_id: str):
    activity = db_get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    return activity


@app.get("/api/categories")
async def api_categories():
    all_acts = db_list(limit=500)
    counts: dict[str, int] = {}
    for a in all_acts:
        cat = a.get("category", "其他")
        counts[cat] = counts.get(cat, 0) + 1
    return [{"name": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


# ── 日程编排 ──

@app.post("/api/plan")
async def api_create_plan(req: PlanRequest, user_id: str = Depends(get_current_user)):
    import asyncio

    profile = get_profile(user_id)
    profile_hint = _profile_to_hint(profile)

    # 根据心情筛选活动
    mood_acts = db_list(limit=500)
    if req.mood in MOOD_CATEGORIES:
        keywords = MOOD_CATEGORIES[req.mood]
        mood_acts = [a for a in mood_acts if any(
            kw in a.get("category", "").lower() or kw in a.get("title", "").lower()
            for kw in keywords
        )]

    activity = mood_acts[0] if mood_acts else None

    coords = None
    if activity:
        if activity.get("latitude") and activity.get("longitude"):
            coords = (activity["latitude"], activity["longitude"])
        elif activity.get("location"):
            coords = await geocode(activity["location"])

    async def get_pois():
        if not coords:
            return [], [], []
        lat, lng = coords
        return await asyncio.gather(
            search_nearby_pois(lat, lng, "餐厅", 2000),
            search_nearby_pois(lat, lng, "景点|商圈|公园", 3000),
            search_nearby_pois(lat, lng, "地铁站", 3000),
        )

    async def get_xhs():
        loc = activity.get("location", "") if activity else DEFAULT_ADDRESS
        return await search_xiaohongshu_restaurants(loc, profile_hint)

    (restaurants, spots, metro), xhs = await asyncio.gather(get_pois(), get_xhs())

    schedule = await generate_plan(
        activity or {"title": "自由探索", "location": DEFAULT_ADDRESS},
        restaurants, spots, xhs, profile_hint, metro
    )

    plan_id = str(uuid.uuid4())[:8]
    save_plan({
        "id": plan_id,
        "user_id": user_id,
        "mood": req.mood,
        "time_slot": req.time_slot,
        "companion": req.companion,
        "items": json.dumps(schedule, ensure_ascii=False),
        "confirmed": 0,
    })

    async def sse_generator():
        """逐项推送日程 + 完成信号"""
        for i, item in enumerate(schedule):
            yield f"data: {json.dumps({'type': 'item', 'index': i, 'item': item}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.15)  # 视觉流式效果
        yield f"data: {json.dumps({'type': 'done', 'planId': plan_id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/plans")
async def api_list_plans(user_id: str = Depends(get_current_user)):
    plans = list_plans(user_id)
    for p in plans:
        p["items"] = json.loads(p["items"]) if isinstance(p["items"], str) else p["items"]
    return plans


@app.post("/api/plan/adjust")
async def api_adjust_plan(req: AdjustRequest, user_id: str = Depends(get_current_user)):
    from adjuster import adjust_plan
    try:
        result = await adjust_plan(req.plan_id, req.item_index, req.action)
        # Story 5.3: 隐式学习 — 记录调整行为更新偏好
        _update_preference_from_adjust(user_id, req.action)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/plan/{plan_id}/confirm")
async def api_confirm_plan(plan_id: str, user_id: str = Depends(get_current_user)):
    """确认日程 → 自动入册"""
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="日程不存在")

    save_plan({**plan, "confirmed": 1})

    items = json.loads(plan["items"]) if isinstance(plan["items"], str) else plan["items"]
    for item in items:
        if item.get("type") in ("activity", "restaurant", "spot"):
            save_stamp({
                "id": str(uuid.uuid4())[:8],
                "user_id": user_id,
                "plan_id": plan_id,
                "source": "auto",
                "activity_type": item.get("type", ""),
                "area": item.get("location", ""),
                "note": item.get("name", ""),
            })

    return {"ok": True}


# ── 集邮册 ──

@app.get("/api/stamps")
async def api_list_stamps(user_id: str = Depends(get_current_user)):
    return list_stamps(user_id)


@app.post("/api/stamps")
async def api_create_stamp(req: StampCreate, user_id: str = Depends(get_current_user)):
    stamp_id = str(uuid.uuid4())[:8]
    save_stamp({
        "id": stamp_id,
        "user_id": user_id,
        "plan_id": None,
        "source": "manual",
        "activity_type": req.activity_type,
        "area": req.area,
        "note": req.note,
    })
    _update_preference_from_stamp(user_id, req.activity_type, req.area)
    return {"id": stamp_id}


# ── 反馈 ──

@app.post("/api/feedback")
async def api_create_feedback(req: FeedbackRequest, user_id: str = Depends(get_current_user)):
    save_feedback(user_id, req.plan_id, req.item_index)
    return {"ok": True}


# ── 附近推荐 ──

@app.post("/api/nearby")
async def api_nearby(req: NearbyRequest, user_id: str = Depends(get_current_user)):
    pois = await search_nearby_pois(req.lat, req.lng, req.keyword, req.radius)
    return {"pois": pois}


# ── 聚合 ──

@app.post("/api/refresh")
async def api_refresh():
    try:
        count = await run_aggregation()
        return {"refreshed": count, "total": db_count()}
    except Exception as e:
        logger.error(f"聚合失败: {e}")
        raise HTTPException(500, f"聚合失败: {e}")


@app.get("/api/config")
def api_config():
    return {"default_address": DEFAULT_ADDRESS}


# ── 对话调整（兼容旧版）──

@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    activity = db_get(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    reply, new_schedule = await generate_chat_response(
        activity, req.current_plan, req.message, ""
    )
    return {"reply": reply, "schedule": new_schedule}


# ── 静态文件服务 ──
_static_dir = BASE_DIR / "static"
if _static_dir.is_dir():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = _static_dir / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_static_dir / "index.html")
