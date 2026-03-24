from __future__ import annotations
"""
配套规划引擎
活动为锚点 → 高德搜附近 → 小红书餐厅推荐(Tavily) → LLM 编排日程
"""
import json
import logging
import re

import httpx
from openai import AsyncOpenAI

from config import AMAP_KEY, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, TAVILY_API_KEY

logger = logging.getLogger(__name__)


def _parse_llm_json(text: str):
    """从 LLM 响应中健壮地提取 JSON"""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 尝试提取 JSON 数组或对象
        for pattern in [r"\[[\s\S]*\]", r"\{[\s\S]*\}"]:
            match = re.search(pattern, text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    continue
        logger.error(f"无法解析 LLM JSON: {text[:200]}")
        return None


# ======================================================
#  高德地图服务
# ======================================================

async def geocode(address: str) -> tuple[float, float] | None:
    """高德地理编码：地址 → 经纬度"""
    if not AMAP_KEY or not address:
        return None
    try:
        async with httpx.AsyncClient(timeout=10, proxy=None) as client:
            resp = await client.get("https://restapi.amap.com/v3/geocode/geo", params={
                "key": AMAP_KEY, "address": address,
            })
            data = resp.json()
            if data.get("geocodes"):
                lng, lat = data["geocodes"][0]["location"].split(",")
                return float(lat), float(lng)
    except Exception as e:
        logger.error(f"地理编码失败 [{address}]: {e}")
    return None


async def search_nearby_pois(lat: float, lng: float, keyword: str = "餐厅", radius: int = 2000) -> list[dict]:
    """高德周边搜索"""
    if not AMAP_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=10, proxy=None) as client:
            resp = await client.get("https://restapi.amap.com/v3/place/around", params={
                "key": AMAP_KEY,
                "location": f"{lng},{lat}",
                "keywords": keyword,
                "radius": radius,
                "sortrule": "weight",
                "offset": 10,
            })
            data = resp.json()
            return [
                {
                    "name": p.get("name", ""),
                    "address": p.get("address", ""),
                    "type": p.get("type", ""),
                    "distance": p.get("distance", ""),
                    "rating": p.get("biz_ext", {}).get("rating", ""),
                    "cost": p.get("biz_ext", {}).get("cost", ""),
                }
                for p in data.get("pois", [])
            ]
    except Exception as e:
        logger.error(f"周边搜索失败: {e}")
    return []


# ======================================================
#  小红书餐厅推荐（Tavily 搜索 + LLM 结构化）
# ======================================================

async def search_xiaohongshu_restaurants(location: str) -> list[dict]:
    """搜索小红书上关于该地点附近的餐厅推荐，用 LLM 结构化"""
    if not TAVILY_API_KEY and not LLM_API_KEY:
        return []

    # 1. Tavily 搜索小红书餐厅内容
    xhs_results = []
    if TAVILY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15, proxy=None) as client:
                resp = await client.post("https://api.tavily.com/search", json={
                    "api_key": TAVILY_API_KEY,
                    "query": f"小红书 {location}附近 美食 餐厅推荐 人气",
                    "max_results": 8,
                    "search_depth": "basic",
                })
                data = resp.json()
                xhs_results = [
                    {"title": r.get("title", ""), "content": r.get("content", "")[:300]}
                    for r in data.get("results", [])
                ]
        except Exception as e:
            logger.warning(f"小红书餐厅搜索失败: {e}")

    # 2. LLM 结构化餐厅推荐
    if not LLM_API_KEY:
        return []

    xhs_context = "\n".join(f"- {r['title']}: {r['content']}" for r in xhs_results)
    if not xhs_context:
        xhs_context = "无搜索结果，请基于你对该地点附近的餐厅知识推荐。"

    client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

    prompt = f"""你是一个北京美食达人。根据以下小红书搜索结果和你的知识，推荐 {location} 附近的真实餐厅。

## 小红书搜索结果
{xhs_context}

## 要求
1. 推荐 5 家**真实存在的**餐厅
2. 优先推荐小红书上有评价的、口碑好的餐厅
3. **价格区间：人均 10-50 元**，以实惠平价为主（快餐、面食、小吃、简餐），不推荐高档餐厅
4. 包含不同菜系（中餐、面食、快餐、小吃、轻食等日常餐食）

## 返回格式
JSON 数组：
[{{
  "name": "餐厅名",
  "cuisine": "菜系",
  "per_capita": 25,
  "rating": 4.5,
  "reason": "一句话推荐理由（融入小红书风格的评价）",
  "tags": ["人气推荐", "适合约会"],
  "distance_desc": "步行约10分钟"
}}]

只返回 JSON。"""

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=1500,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        result = _parse_llm_json(text)
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.error(f"小红书餐厅结构化失败: {e}")
    return []


# ======================================================
#  日程规划
# ======================================================

async def generate_plan(activity: dict, nearby_restaurants: list, nearby_spots: list, xhs_restaurants: list) -> list[dict]:
    """LLM 生成配套日程"""
    if not LLM_API_KEY:
        return _fallback_plan(activity)

    client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

    prompt = f"""你是一个周末出行规划师。用户选了一个活动作为当天的主活动，请为他规划完整的一天。

## 主活动
- 名称：{activity['title']}
- 时间：{activity.get('time', '下午')}
- 地点：{activity.get('location', '北京')}
- 类别：{activity.get('category', '活动')}

## 附近餐厅（高德 POI）
{json.dumps(nearby_restaurants[:6], ensure_ascii=False, indent=2)}

## 小红书推荐餐厅
{json.dumps(xhs_restaurants[:5], ensure_ascii=False, indent=2)}

## 附近景点/商圈
{json.dumps(nearby_spots[:5], ensure_ascii=False, indent=2)}

## 要求
1. 围绕主活动编排整天日程
2. 餐厅优先选小红书推荐的，没有则从高德 POI 选
3. 推荐理由要具体、有温度（不要泛泛而谈）
4. 返回 JSON 数组：
[
  {{"time": "11:30", "type": "lunch", "name": "餐厅名", "reason": "推荐理由"}},
  {{"time": "14:00", "type": "activity", "name": "活动名", "reason": "主活动"}},
  {{"time": "18:00", "type": "dinner", "name": "餐厅名", "reason": "推荐理由"}},
  {{"time": "20:00", "type": "explore", "name": "地点名", "reason": "推荐理由"}}
]
type 只能是 lunch/dinner/activity/explore。只返回 JSON。"""

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=1500,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        result = _parse_llm_json(text)
        return result if isinstance(result, list) else _fallback_plan(activity)
    except Exception as e:
        logger.error(f"日程规划失败: {e}")
        return _fallback_plan(activity)


async def generate_chat_response(activity: dict, current_plan: list, user_message: str) -> tuple[str, list[dict]]:
    """LLM 对话调整日程"""
    if not LLM_API_KEY:
        return f"收到你的调整意见：「{user_message}」。请配置 LLM API Key 后生效。", current_plan

    client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

    prompt = f"""你是一个周末出行规划师。用户已有日程，现在想调整。

## 当前日程
{json.dumps(current_plan, ensure_ascii=False, indent=2)}

## 主活动
- 名称：{activity['title']}
- 地点：{activity.get('location', '')}

## 用户要求
{user_message}

## 返回格式
{{"reply": "你的回应（简洁温暖）", "schedule": [...]}}
schedule 格式同之前。只返回 JSON。"""

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=1500,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        result = _parse_llm_json(text)
        if isinstance(result, dict):
            return result.get("reply", "已调整"), result.get("schedule", current_plan)
        return "抱歉，调整失败", current_plan
    except Exception as e:
        logger.error(f"对话调整失败: {e}")
        return f"抱歉，调整失败：{e}", current_plan


def _fallback_plan(activity: dict) -> list[dict]:
    """无 API Key 时的降级方案"""
    return [
        {"time": "11:30", "type": "lunch", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
        {"time": "13:30", "type": "activity", "name": activity["title"], "reason": "主活动"},
        {"time": "17:30", "type": "dinner", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
        {"time": "19:30", "type": "explore", "name": "附近逛逛", "reason": "请配置 API Key 获取真实推荐"},
    ]
