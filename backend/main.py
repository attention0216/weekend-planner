from __future__ import annotations
"""
周末去哪玩 — API 入口
用户画像 · 日程编排 · 对话调整 · 活动聚合
"""
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import AGGREGATION_INTERVAL_HOURS, BASE_DIR
from db import init_db, list_activities, get_activity, count_activities
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
    """启动时初始化 DB + 首次聚合 + 定时任务"""
    init_db()
    logger.info("数据库初始化完成")

    import asyncio
    if count_activities() == 0:
        logger.info("数据库为空，后台执行首次聚合...")
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


app = FastAPI(title="周末去哪玩", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
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
    """将用户画像转为 LLM prompt 片段"""
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
def health():
    return {"status": "ok", "activities_count": count_activities()}


@app.get("/api/activities")
def api_list_activities(
    category: str = Query("", description="分类筛选"),
    limit: int = Query(50, ge=1, le=200),
):
    return list_activities(category=category, limit=limit)


@app.get("/api/activities/{activity_id}")
def api_get_activity(activity_id: str):
    activity = get_activity(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    return activity


@app.post("/api/plan")
async def api_create_plan(req: PlanRequest):
    """以活动为锚点生成配套日程 — 并行加速"""
    import asyncio

    activity = get_activity(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")

    profile_hint = _profile_to_hint(req.user_profile)

    # 1. 地理编码（仅在数据库无坐标时调用）
    coords = None
    if activity.get("latitude") and activity.get("longitude"):
        coords = (activity["latitude"], activity["longitude"])
    elif activity.get("location"):
        coords = await geocode(activity["location"])

    # 2. 并行执行：高德 POI + 小红书推荐 + 地铁站（不等前一个完成）
    async def get_pois():
        if not coords:
            return [], [], []
        lat, lng = coords
        r, s, m = await asyncio.gather(
            search_nearby_pois(lat, lng, "餐厅", 2000),
            search_nearby_pois(lat, lng, "景点|商圈|公园", 3000),
            search_nearby_pois(lat, lng, "地铁站", 3000),
        )
        return r, s, m

    async def get_xhs():
        return await search_xiaohongshu_restaurants(
            activity.get("location", ""), profile_hint
        )

    (restaurants, spots, metro_stations), xhs_restaurants = await asyncio.gather(
        get_pois(), get_xhs()
    )

    # 3. LLM 编排日程（含回程规划）
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
    activity = get_activity(req.activity_id)
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
    return {"refreshed": count, "total": count_activities()}


class NearbyRequest(BaseModel):
    latitude: float
    longitude: float
    user_profile: Optional[UserProfile] = None


@app.post("/api/nearby")
async def api_nearby(req: NearbyRequest):
    """基于用户定位，推荐附近活动和餐厅"""
    profile_hint = _profile_to_hint(req.user_profile)

    # 1. 高德逆地理编码 → 获取位置名
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

    # 2. 附近餐厅
    restaurants = await search_nearby_pois(req.latitude, req.longitude, "餐厅|快餐|面馆|小吃", 2000)

    # 3. 附近景点/活动
    spots = await search_nearby_pois(req.latitude, req.longitude, "景点|公园|展览|博物馆|商圈", 3000)

    # 4. 小红书餐厅推荐
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
