from __future__ import annotations
"""
配套规划引擎
以活动为锚点 → 高德搜附近餐厅/景点 → Claude 编排日程
"""
import json
import logging

import httpx

from config import AMAP_KEY, CLAUDE_API_KEY, TAVILY_API_KEY

logger = logging.getLogger(__name__)


async def geocode(address: str) -> tuple[float, float] | None:
    """高德地理编码：地址 → 经纬度"""
    if not AMAP_KEY or not address:
        return None

    try:
        async with httpx.AsyncClient(timeout=10, proxy=None) as client:
            resp = await client.get("https://restapi.amap.com/v3/geocode/geo", params={
                "key": AMAP_KEY,
                "address": address,
            })
            data = resp.json()
            if data.get("geocodes"):
                loc = data["geocodes"][0]["location"]
                lng, lat = loc.split(",")
                return float(lat), float(lng)
    except Exception as e:
        logger.error(f"地理编码失败 [{address}]: {e}")
    return None


async def search_nearby_pois(lat: float, lng: float, keyword: str = "餐厅", radius: int = 2000) -> list[dict]:
    """高德周边搜索：找附近的餐厅/景点"""
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
            pois = []
            for p in data.get("pois", []):
                pois.append({
                    "name": p.get("name", ""),
                    "address": p.get("address", ""),
                    "type": p.get("type", ""),
                    "distance": p.get("distance", ""),
                    "rating": p.get("biz_ext", {}).get("rating", ""),
                    "cost": p.get("biz_ext", {}).get("cost", ""),
                })
            return pois
    except Exception as e:
        logger.error(f"周边搜索失败: {e}")
    return []


async def search_restaurants(location: str) -> list[dict]:
    """搜索引擎找餐厅口碑（Tavily 或降级为空）"""
    if not TAVILY_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=15, proxy=None) as client:
            resp = await client.post("https://api.tavily.com/search", json={
                "api_key": TAVILY_API_KEY,
                "query": f"{location}附近 好吃 健康 性价比高 餐厅推荐",
                "max_results": 5,
                "search_depth": "basic",
            })
            data = resp.json()
            return [
                {"title": r.get("title", ""), "content": r.get("content", "")[:200], "url": r.get("url", "")}
                for r in data.get("results", [])
            ]
    except Exception as e:
        logger.error(f"Tavily搜索失败: {e}")
    return []


async def generate_plan(activity: dict, nearby_restaurants: list, nearby_spots: list, search_results: list) -> list[dict]:
    """Claude 生成配套日程"""
    if not CLAUDE_API_KEY:
        return _fallback_plan(activity)

    prompt = f"""你是一个周末出行规划师。用户选了一个活动作为当天的主活动，请为他规划完整的一天。

## 主活动
- 名称：{activity['title']}
- 时间：{activity['time']}
- 地点：{activity['location']}
- 类别：{activity['category']}

## 附近餐厅（高德数据）
{json.dumps(nearby_restaurants[:8], ensure_ascii=False, indent=2)}

## 附近景点/商圈（高德数据）
{json.dumps(nearby_spots[:5], ensure_ascii=False, indent=2)}

## 餐厅口碑（搜索引擎）
{json.dumps(search_results[:3], ensure_ascii=False, indent=2)}

## 要求
1. 围绕主活动编排整天日程（午餐→活动→晚餐→散步，或根据活动时间合理调整）
2. 推荐的餐厅必须考虑：性价比（人均<100）、评分高、健康（少油少盐优先）
3. 每个日程项给出简短推荐理由
4. 返回 JSON 数组，格式严格如下：
[
  {{"time": "11:30", "type": "lunch", "name": "餐厅名", "reason": "推荐理由"}},
  {{"time": "14:00", "type": "activity", "name": "活动名", "reason": "主活动"}},
  {{"time": "18:00", "type": "dinner", "name": "餐厅名", "reason": "推荐理由"}},
  {{"time": "20:00", "type": "explore", "name": "地点名", "reason": "推荐理由"}}
]
type 只能是 lunch/dinner/activity/explore 四种。只返回 JSON，不要其他文字。"""

    try:
        async with httpx.AsyncClient(timeout=30, proxy=None) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()
            text = data["content"][0]["text"]

            # 提取 JSON（兼容 markdown code block）
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]

            return json.loads(text)
    except Exception as e:
        logger.error(f"Claude 规划失败: {e}")
        return _fallback_plan(activity)


async def generate_chat_response(activity: dict, current_plan: list, user_message: str) -> tuple[str, list[dict]]:
    """Claude 对话调整日程"""
    if not CLAUDE_API_KEY:
        return f"收到你的调整意见：「{user_message}」。接入 Claude API 后即可生效。", current_plan

    prompt = f"""你是一个周末出行规划师。用户已有一个日程规划，现在想做调整。

## 当前日程
{json.dumps(current_plan, ensure_ascii=False, indent=2)}

## 主活动
- 名称：{activity['title']}
- 地点：{activity['location']}

## 用户要求
{user_message}

## 返回格式
先用一句话回应用户，然后返回调整后的完整日程 JSON。
格式：
{{"reply": "你的回应", "schedule": [...]}}
schedule 格式同之前。只返回 JSON。"""

    try:
        async with httpx.AsyncClient(timeout=30, proxy=None) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()
            text = data["content"][0]["text"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]

            result = json.loads(text)
            return result.get("reply", "已调整"), result.get("schedule", current_plan)
    except Exception as e:
        logger.error(f"Claude 对话失败: {e}")
        return f"抱歉，调整失败：{e}", current_plan


def _fallback_plan(activity: dict) -> list[dict]:
    """无 API Key 时的降级方案"""
    time_str = activity.get("time", "")

    # 根据活动时间智能安排
    if "全天" in time_str or not time_str:
        return [
            {"time": "11:30", "type": "lunch", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
            {"time": "13:30", "type": "activity", "name": activity["title"], "reason": "主活动"},
            {"time": "17:30", "type": "dinner", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
            {"time": "19:30", "type": "explore", "name": "附近逛逛", "reason": "请配置 API Key 获取真实推荐"},
        ]

    # 解析开始时间
    start_hour = 14
    m = __import__("re").search(r"(\d{1,2})[:：]?(\d{2})?", time_str)
    if m:
        start_hour = int(m.group(1))

    schedule = []
    if start_hour >= 13:
        schedule.append({"time": f"{start_hour - 2}:30", "type": "lunch", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"})
    schedule.append({"time": time_str.split("-")[0] if "-" in time_str else f"{start_hour}:00", "type": "activity", "name": activity["title"], "reason": "主活动"})
    if start_hour < 17:
        schedule.append({"time": "18:00", "type": "dinner", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"})
    schedule.append({"time": "20:00", "type": "explore", "name": "附近逛逛", "reason": "请配置 API Key 获取真实推荐"})

    return schedule
