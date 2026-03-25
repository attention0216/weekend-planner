from __future__ import annotations
"""
周末去哪玩 — API 入口
用户画像 · 日程编排 · 对话调整 · GitHub/SQLite 双模数据层
"""
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import AGGREGATION_INTERVAL_HOURS, BASE_DIR, DEFAULT_ADDRESS
import github_db
from db import init_db
from db import list_activities as sqlite_list, get_activity as sqlite_get, count_activities as sqlite_count
from aggregator import run_aggregation
from planner import (
    geocode, search_nearby_pois,
    search_xiaohongshu_restaurants,
    generate_plan, generate_chat_response,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger(__name__)

scheduler = None
USE_GITHUB = github_db.is_enabled()


# ── 数据层适配 ──
async def _list_activities(category: str = "", limit: int = 50) -> list[dict]:
    if USE_GITHUB:
        return await github_db.list_activities(category, limit)
    return sqlite_list(category=category, limit=limit)


async def _get_activity(activity_id: str) -> dict | None:
    if USE_GITHUB:
        return await github_db.get_activity(activity_id)
    return sqlite_get(activity_id)


async def _count_activities() -> int:
    if USE_GITHUB:
        return await github_db.count_activities()
    return sqlite_count()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化 + 首次聚合 + 定时任务"""
    init_db()
    mode = "GitHub" if USE_GITHUB else "SQLite"
    logger.info(f"数据层: {mode}")

    import asyncio
    cnt = await _count_activities()
    if cnt == 0:
        logger.info("数据为空，后台执行首次聚合...")
        asyncio.create_task(run_aggregation())

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


app = FastAPI(title="周末去哪玩", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:4173", "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 请求模型 ──

class UserProfile(BaseModel):
    diet: list[str] = []
    social: str = ""
    budget: str = "经济"
    customNote: str = ""


class PlanRequest(BaseModel):
    activity_id: str
    user_profile: Optional[UserProfile] = None


class ChatRequest(BaseModel):
    activity_id: str
    message: str
    current_plan: list[dict] = []
    user_profile: Optional[UserProfile] = None


def _profile_to_hint(profile: Optional[UserProfile]) -> str:
    if not profile:
        return ""
    parts = []
    if profile.diet:
        parts.append(f"饮食需求：{', '.join(profile.diet)}")
    if profile.social:
        parts.append(f"社交偏好：{profile.social}")
    if profile.budget:
        budget_map = {"经济": "人均30元以内", "适中": "人均30-80元", "不限": "不限预算"}
        parts.append(f"预算：{budget_map.get(profile.budget, profile.budget)}")
    if profile.customNote:
        parts.append(f"其他：{profile.customNote}")
    return "\n".join(parts) if parts else ""


# ── 路由 ──

@app.get("/api/health")
async def health():
    cnt = await _count_activities()
    return {"status": "ok", "activities_count": cnt, "data_layer": "github" if USE_GITHUB else "sqlite"}


@app.get("/api/activities/{activity_id}")
async def api_get_activity(activity_id: str):
    activity = await _get_activity(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    return activity


@app.post("/api/plan")
async def api_create_plan(req: PlanRequest):
    import asyncio

    activity = await _get_activity(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")

    profile_hint = _profile_to_hint(req.user_profile)

    coords = None
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
        return await search_xiaohongshu_restaurants(
            activity.get("location", ""), profile_hint
        )

    (restaurants, spots, metro_stations), xhs_restaurants = await asyncio.gather(
        get_pois(), get_xhs()
    )

    schedule = await generate_plan(activity, restaurants, spots, xhs_restaurants, profile_hint, metro_stations)

    return {
        "activity": activity,
        "schedule": schedule,
        "nearby_restaurants": xhs_restaurants[:5] if xhs_restaurants else [
            {"name": r["name"], "cuisine": "", "per_capita": int(r["cost"] or 0),
             "rating": float(r["rating"] or 0), "reason": f"距离{r['distance']}m",
             "tags": [], "distance_desc": f"{r['distance']}m"}
            for r in restaurants[:5]
        ],
        "nearby_spots": spots[:3],
    }


@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    activity = await _get_activity(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    profile_hint = _profile_to_hint(req.user_profile)
    reply, new_schedule = await generate_chat_response(
        activity, req.current_plan, req.message, profile_hint
    )
    return {"reply": reply, "schedule": new_schedule}


@app.post("/api/refresh")
async def api_refresh():
    count = await run_aggregation()
    total = await _count_activities()
    return {"refreshed": count, "total": total}


@app.get("/api/categories")
async def api_categories():
    """动态获取分类统计"""
    all_acts = await _list_activities(limit=500)
    counts: dict[str, int] = {}
    for a in all_acts:
        cat = a.get("category", "其他")
        counts[cat] = counts.get(cat, 0) + 1
    return [{"name": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


@app.get("/api/config")
def api_config():
    return {"default_address": DEFAULT_ADDRESS}


@app.get("/api/weather")
async def api_weather():
    """获取未来3天天气预报（北京）"""
    from weather import get_forecast
    return await get_forecast()


# ── 心情 → 分类映射 ──
MOOD_CATEGORIES: dict[str, list[str]] = {
    "relax": ["展览", "咖啡", "书店", "公园", "spa"],
    "social": ["读书会", "运动", "聚会", "脱口秀", "桌游"],
    "adventure": ["户外", "市集", "探店", "徒步", "骑行"],
    "quiet": ["展览", "书店", "博物馆", "电影", "音乐"],
}


@app.get("/api/activities")
async def api_list_activities(
    category: str = Query("", description="分类筛选"),
    mood: str = Query("", description="心情筛选"),
    limit: int = Query(50, ge=1, le=200),
):
    all_acts = await _list_activities(limit=500)

    if mood and mood in MOOD_CATEGORIES:
        keywords = MOOD_CATEGORIES[mood]
        all_acts = [a for a in all_acts if any(
            kw in a.get("category", "").lower() or kw in a.get("title", "").lower()
            for kw in keywords
        )]
    elif category and category != "全部":
        all_acts = [a for a in all_acts if a.get("category") == category]

    all_acts.sort(key=lambda a: a.get("date", ""))
    return all_acts[:limit]

class UserData(BaseModel):
    favorites: list[str] = []
    profile: dict = {}


@app.get("/api/user/{name}")
async def api_get_user(name: str):
    if not USE_GITHUB:
        return {"name": name, "favorites": [], "profile": {}}
    return await github_db.read_user(name)


@app.put("/api/user/{name}")
async def api_update_user(name: str, data: UserData):
    if not USE_GITHUB:
        return {"ok": False, "reason": "GitHub 数据层未启用"}
    ok = await github_db.write_user(name, data.model_dump())
    if not ok:
        raise HTTPException(status_code=500, detail="保存失败")
    return {"ok": True}


class NearbyRequest(BaseModel):
    latitude: float
    longitude: float
    user_profile: Optional[UserProfile] = None


@app.post("/api/nearby")
async def api_nearby(req: NearbyRequest):
    profile_hint = _profile_to_hint(req.user_profile)

    location_name = ""
    try:
        from config import AMAP_KEY
        if AMAP_KEY:
            import httpx
            async with httpx.AsyncClient(timeout=10, proxy=None) as client:
                resp = await client.get("https://restapi.amap.com/v3/geocode/regeo", params={
                    "key": AMAP_KEY,
                    "location": f"{req.longitude},{req.latitude}",
                })
                data = resp.json()
                rc = data.get("regeocode", {}).get("addressComponent", {})
                location_name = rc.get("township", "") or rc.get("district", "") or rc.get("city", "")
    except Exception as e:
        logger.warning(f"逆地理编码失败: {e}")

    restaurants = await search_nearby_pois(req.latitude, req.longitude, "餐厅|快餐|面馆|小吃", 2000)
    spots = await search_nearby_pois(req.latitude, req.longitude, "景点|公园|展览|博物馆|商圈", 3000)

    xhs_restaurants = []
    if location_name:
        xhs_restaurants = await search_xiaohongshu_restaurants(location_name, profile_hint)

    return {
        "location_name": location_name or "你的位置",
        "nearby_restaurants": xhs_restaurants[:5] if xhs_restaurants else [
            {"name": r["name"], "cuisine": "", "per_capita": int(r["cost"] or 0),
             "rating": float(r["rating"] or 0), "reason": f"距离{r['distance']}m",
             "tags": [], "distance_desc": f"{r['distance']}m"}
            for r in restaurants[:5]
        ],
        "nearby_spots": spots[:5],
    }


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
