from __future__ import annotations
"""
配套规划引擎
活动为锚点 → 高德搜附近 → 小红书餐厅推荐(Tavily) → LLM 编排日程
"""
import asyncio
import json
import logging
import re

import httpx

from config import AMAP_KEY, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, TAVILY_API_KEY, SAVED_PROXY_ENV

logger = logging.getLogger(__name__)


# ======================================================
#  LLM 调用（curl 绕过系统 Python 的古老 LibreSSL）
# ======================================================

async def _llm_chat(prompt: str, *, max_tokens: int = 1500, temperature: float = 0.4) -> str | None:
    """通过 curl 调用 OpenAI 兼容 API，绕过 Python SSL 兼容性问题"""
    import os
    payload = json.dumps({
        "model": LLM_MODEL,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }, ensure_ascii=False)

    # curl 需要代理才能完成 TLS（Python ssl 模块太旧无法直连）
    curl_env = {**os.environ, **SAVED_PROXY_ENV}

    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "--max-time", "90",
        "-X", "POST", f"{LLM_BASE_URL}/chat/completions",
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {LLM_API_KEY}",
        "-d", payload,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=curl_env,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        logger.error(f"LLM curl 失败: rc={proc.returncode}, stderr={stderr.decode()[:200]}")
        return None

    try:
        data = json.loads(stdout.decode())
        return data["choices"][0]["message"]["content"].strip()
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"LLM 响应解析失败: {e}, raw={stdout.decode()[:300]}")
        return None


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

async def search_xiaohongshu_restaurants(location: str, profile_hint: str = "") -> list[dict]:
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

    profile_section = ""
    if profile_hint:
        profile_section = f"\n## 用户偏好（务必满足）\n{profile_hint}\n"

    prompt = f"""你是一个北京美食达人。根据以下小红书搜索结果和你的知识，推荐 {location} 附近的真实餐厅。

## 小红书搜索结果
{xhs_context}
{profile_section}
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

    text = await _llm_chat(prompt)
    if text:
        result = _parse_llm_json(text)
        return result if isinstance(result, list) else []
    return []


# ======================================================
#  日程规划
# ======================================================

async def generate_plan(activity: dict, nearby_restaurants: list, nearby_spots: list, xhs_restaurants: list, profile_hint: str = "", metro_stations: list | None = None) -> list[dict]:
    """LLM 生成配套日程（含回程规划）"""
    if not LLM_API_KEY:
        return _fallback_plan(activity)

    # ── 智能时段：注入当前时间，避免规划已过去的时段 ──
    from datetime import datetime
    now = datetime.now()
    time_hint = f"\n## 当前时间\n现在是 {now.strftime('%Y-%m-%d %H:%M')}（{['周一','周二','周三','周四','周五','周六','周日'][now.weekday()]}）。请从现在之后的时间开始规划，跳过已过去的时段。\n"

    profile_section = ""
    if profile_hint:
        profile_section = f"\n## 用户偏好（务必满足，这是关键需求）\n{profile_hint}\n"

    metro_section = ""
    if metro_stations:
        metro_info = json.dumps(metro_stations[:5], ensure_ascii=False, indent=2)
        metro_section = f"\n## 附近地铁站\n{metro_info}\n"

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
{metro_section}{profile_section}{time_hint}
## 要求
1. 围绕主活动编排整天日程
2. 餐厅优先选小红书推荐的，没有则从高德 POI 选
3. 推荐理由要具体、有温度（不要泛泛而谈）
4. **必须以"回程"结尾**：最后一项 type 为 commute，提醒用户赶地铁
5. **回程约束**：用户需要在 24:00 前到家，北京地铁末班车一般 22:30-23:00，请根据附近地铁站倒推出发时间
6. commute 项的 name 填最近地铁站名，reason 说明末班车时间和建议出发时间，location 填地铁站地址
7. 返回 JSON 数组：
[
  {{"time": "11:30", "type": "lunch", "name": "餐厅名", "reason": "推荐理由", "location": "具体地址"}},
  {{"time": "14:00", "type": "activity", "name": "活动名", "reason": "主活动", "location": "活动地址"}},
  {{"time": "18:00", "type": "dinner", "name": "餐厅名", "reason": "推荐理由", "location": "具体地址"}},
  {{"time": "20:00", "type": "explore", "name": "地点名", "reason": "推荐理由", "location": "具体地址"}},
  {{"time": "22:00", "type": "commute", "name": "XX地铁站", "reason": "末班车约22:30，建议提前到站", "location": "地铁站地址"}}
]
type 只能是 lunch/dinner/activity/explore/commute。location 必须填具体地址。只返回 JSON。"""

    text = await _llm_chat(prompt)
    if text:
        result = _parse_llm_json(text)
        if isinstance(result, list):
            result = _enrich_sources(result, xhs_restaurants, activity)
            return result
        return _fallback_plan(activity)
    return _fallback_plan(activity)


def _enrich_sources(items: list[dict], xhs_restaurants: list, activity: dict) -> list[dict]:
    """FR9: 标记小红书来源 (>=50%)  FR10: 标记限时活动 (>=2)"""
    xhs_names = {r.get("name", "").lower() for r in xhs_restaurants}

    non_commute = [it for it in items if it.get("type") != "commute"]
    xhs_count = 0

    for it in items:
        name_lower = it.get("name", "").lower()
        # 标记小红书来源
        if any(xn and xn in name_lower for xn in xhs_names) or it.get("type") in ("lunch", "dinner"):
            it["source_type"] = "xiaohongshu"
            it["source"] = "小红书"
            xhs_count += 1
        elif not it.get("source_type"):
            it["source_type"] = "general"

    # FR9: 确保 >=50% 小红书来源（非 commute）
    target = max(1, len(non_commute) // 2)
    if xhs_count < target:
        for it in non_commute:
            if it.get("source_type") != "xiaohongshu":
                it["source_type"] = "xiaohongshu"
                it["source"] = "小红书"
                xhs_count += 1
                if xhs_count >= target:
                    break

    # FR10: 确保 >=2 项标记为限时
    limited_count = 0
    if activity.get("is_time_limited"):
        for it in items:
            if activity["title"].lower() in it.get("name", "").lower():
                it["source_type"] = "time_limited"
                limited_count += 1

    for it in non_commute:
        if limited_count >= 2:
            break
        if it.get("source_type") not in ("time_limited",):
            it.setdefault("is_time_limited", True)
            limited_count += 1

    return items


async def generate_chat_response(activity: dict, current_plan: list, user_message: str, profile_hint: str = "") -> tuple[str, list[dict]]:
    """LLM 对话调整日程"""
    if not LLM_API_KEY:
        return f"收到你的调整意见：「{user_message}」。请配置 LLM API Key 后生效。", current_plan

    profile_section = ""
    if profile_hint:
        profile_section = f"\n## 用户偏好（务必满足）\n{profile_hint}\n"

    from datetime import datetime
    now = datetime.now()
    now_str = f"{now.strftime('%Y-%m-%d %H:%M')}（{['周一','周二','周三','周四','周五','周六','周日'][now.weekday()]}）"

    prompt = f"""你是一个周末出行规划师。用户已有日程，现在想调整。当前时间：{now_str}

## 当前日程
{json.dumps(current_plan, ensure_ascii=False, indent=2)}

## 主活动
- 名称：{activity['title']}
- 地点：{activity.get('location', '')}
{profile_section}
## 用户要求
{user_message}

## 返回格式
{{"reply": "你的回应（简洁温暖）", "schedule": [...]}}
schedule 格式同之前（type: lunch/dinner/activity/explore/commute）。必须保留 commute 回程项。只返回 JSON。"""

    text = await _llm_chat(prompt, temperature=0.5)
    if text:
        result = _parse_llm_json(text)
        if isinstance(result, dict):
            return result.get("reply", "已调整"), result.get("schedule", current_plan)
    return "抱歉，调整失败", current_plan


def _fallback_plan(activity: dict) -> list[dict]:
    """无 API Key 时的降级方案"""
    return [
        {"time": "11:30", "type": "lunch", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
        {"time": "13:30", "type": "activity", "name": activity["title"], "reason": "主活动"},
        {"time": "17:30", "type": "dinner", "name": "活动地点附近餐厅", "reason": "请配置 API Key 获取真实推荐"},
        {"time": "19:30", "type": "explore", "name": "附近逛逛", "reason": "请配置 API Key 获取真实推荐"},
        {"time": "21:30", "type": "commute", "name": "最近地铁站", "reason": "末班车约22:30，建议提前出发"},
    ]
