"""
日程调整器 — 换一个/不要了/换近点的/换便宜的
从 planner.py 复用搜索能力，局部替换 + 交通重算
"""
from __future__ import annotations

import json
import logging

from db import get_plan, save_plan
from planner import search_nearby_pois, search_xiaohongshu_restaurants, geocode

logger = logging.getLogger(__name__)


async def adjust_plan(plan_id: str, item_index: int, action: str) -> dict:
    """
    调整日程中的某一项
    action: swap | remove | closer | cheaper
    返回更新后的完整日程
    """
    plan = get_plan(plan_id)
    if not plan:
        raise ValueError("日程不存在")

    items = json.loads(plan["items"]) if isinstance(plan["items"], str) else plan["items"]

    if item_index < 0 or item_index >= len(items):
        raise ValueError("项目索引越界")

    target = items[item_index]

    if action == "remove":
        items.pop(item_index)
    elif action in ("swap", "closer", "cheaper"):
        replacement = await _find_replacement(target, action)
        if replacement:
            items[item_index] = {**target, **replacement}

    # 更新数据库
    save_plan({**plan, "items": json.dumps(items, ensure_ascii=False)})

    return {"items": items}


async def _find_replacement(target: dict, action: str) -> dict | None:
    """根据调整类型搜索替代地点"""
    location = target.get("location", "")
    if not location:
        return None

    coords = await geocode(location)
    if not coords:
        return None

    lat, lng = coords
    item_type = target.get("type", "activity")

    if item_type == "restaurant":
        keyword = "餐厅|快餐"
        radius = 1000 if action == "closer" else 2000
    elif item_type == "spot":
        keyword = "景点|公园"
        radius = 1500 if action == "closer" else 3000
    else:
        keyword = "景点|展览|商圈"
        radius = 1500 if action == "closer" else 3000

    pois = await search_nearby_pois(lat, lng, keyword, radius)
    if not pois:
        return None

    # 过滤掉当前项
    pois = [p for p in pois if p.get("name") != target.get("name")]
    if not pois:
        return None

    if action == "cheaper":
        pois.sort(key=lambda p: float(p.get("cost", 0) or 0))
    elif action == "closer":
        pois.sort(key=lambda p: int(p.get("distance", 9999) or 9999))

    best = pois[0]
    return {
        "name": best.get("name", ""),
        "location": best.get("address", location),
        "distance": f"{best.get('distance', '')}m",
        "reason": f"{'更近' if action == 'closer' else '更实惠' if action == 'cheaper' else '换一个'}推荐",
    }
