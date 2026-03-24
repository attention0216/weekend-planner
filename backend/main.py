from __future__ import annotations
"""
周末去哪玩 — API 入口
所有路由定义，串通聚合引擎 + 规划引擎
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import AGGREGATION_INTERVAL_HOURS, BASE_DIR
from db import init_db, list_activities, get_activity, count_activities
from aggregator import run_aggregation
from planner import (
    geocode, search_nearby_pois, search_restaurants,
    generate_plan, generate_chat_response,
)

# ── 日志 ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger(__name__)


# ── 定时任务 ──
scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化DB+首次聚合+定时任务"""
    init_db()
    logger.info("数据库初始化完成")

    # 首次聚合（如果数据库为空）
    if count_activities() == 0:
        logger.info("数据库为空，执行首次聚合...")
        await run_aggregation()

    # 启动定时聚合
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        global scheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            run_aggregation,
            "interval",
            hours=AGGREGATION_INTERVAL_HOURS,
            id="aggregation",
        )
        scheduler.start()
        logger.info(f"定时聚合已启动，间隔 {AGGREGATION_INTERVAL_HOURS} 小时")
    except ImportError:
        logger.warning("apscheduler 未安装，定时聚合不可用")

    yield

    if scheduler:
        scheduler.shutdown()


# ── 应用 ──
app = FastAPI(title="周末去哪玩", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 请求/响应模型 ──
class PlanRequest(BaseModel):
    activity_id: str


class ChatRequest(BaseModel):
    activity_id: str
    message: str
    current_plan: list[dict] = []


class FeedbackRequest(BaseModel):
    activity_id: str
    rating: int  # 1-5
    comment: str = ""


# ── 路由 ──

@app.get("/api/health")
def health():
    return {"status": "ok", "activities_count": count_activities()}


@app.get("/api/activities")
def api_list_activities(
    category: str = Query("", description="分类筛选"),
    limit: int = Query(50, ge=1, le=200),
):
    """活动列表"""
    return list_activities(category=category, limit=limit)


@app.get("/api/activities/{activity_id}")
def api_get_activity(activity_id: str):
    """活动详情"""
    activity = get_activity(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")
    return activity


@app.post("/api/plan")
async def api_create_plan(req: PlanRequest):
    """以活动为锚点生成配套日程"""
    activity = get_activity(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")

    # 1. 地理编码
    coords = None
    if activity.get("location"):
        coords = await geocode(activity["location"])

    # 2. 搜附近
    restaurants = []
    spots = []
    if coords:
        lat, lng = coords
        restaurants = await search_nearby_pois(lat, lng, "餐厅", 2000)
        spots = await search_nearby_pois(lat, lng, "景点|商圈|公园", 3000)

    # 3. 搜索引擎补充口碑
    search_results = await search_restaurants(activity.get("location", ""))

    # 4. Claude 编排日程
    schedule = await generate_plan(activity, restaurants, spots, search_results)

    return {
        "activity": activity,
        "schedule": schedule,
        "nearby_restaurants": restaurants[:5],
        "nearby_spots": spots[:3],
    }


@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    """对话调整日程"""
    activity = get_activity(req.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")

    reply, new_schedule = await generate_chat_response(
        activity, req.current_plan, req.message
    )

    return {"reply": reply, "schedule": new_schedule}


@app.post("/api/refresh")
async def api_refresh():
    """手动触发活动聚合"""
    count = await run_aggregation()
    return {"refreshed": count, "total": count_activities()}


# ── 静态文件服务（生产模式：Docker 中前端构建产物在 ./static）──
_static_dir = BASE_DIR / "static"
if _static_dir.is_dir():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback：所有非 /api 路由返回 index.html"""
        file = _static_dir / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_static_dir / "index.html")

