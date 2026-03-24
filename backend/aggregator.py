from __future__ import annotations
"""
活动聚合引擎
用 LLM + Tavily 搜索发现真实北京周末活动
"""
import hashlib
import json
import logging
from datetime import datetime, timedelta

import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, TAVILY_API_KEY, CITY_NAME
from db import upsert_activity, count_activities

logger = logging.getLogger(__name__)


def _make_id(source: str, title: str) -> str:
    """生成稳定的活动 ID"""
    raw = f"{source}:{title}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _next_weekend() -> tuple[str, str]:
    """返回下一个周末的日期"""
    today = datetime.now()
    days_to_sat = (5 - today.weekday()) % 7
    if days_to_sat == 0 and today.hour > 12:
        days_to_sat = 7
    sat = today + timedelta(days=days_to_sat)
    sun = sat + timedelta(days=1)
    return sat.strftime("%Y-%m-%d"), sun.strftime("%Y-%m-%d")


async def _tavily_search(query: str, max_results: int = 5) -> list[dict]:
    """Tavily 搜索"""
    if not TAVILY_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15, proxy=None) as client:
            resp = await client.post("https://api.tavily.com/search", json={
                "api_key": TAVILY_API_KEY,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
            })
            data = resp.json()
            return [
                {"title": r.get("title", ""), "content": r.get("content", "")[:300], "url": r.get("url", "")}
                for r in data.get("results", [])
            ]
    except Exception as e:
        logger.warning(f"Tavily 搜索失败 [{query[:30]}]: {e}")
    return []


async def _llm_discover_activities(web_context: str) -> list[dict]:
    """用 LLM 基于搜索结果生成真实活动数据"""
    if not LLM_API_KEY:
        return []

    sat, sun = _next_weekend()
    client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

    prompt = f"""你是一个北京本地生活专家。请基于以下搜索结果和你的知识，生成 {CITY_NAME} 本周末（{sat} 和 {sun}）的真实活动推荐。

## 搜索到的信息
{web_context[:3000]}

## 要求
1. 只推荐**真实存在的**场馆、展览、活动、餐厅和电影
2. 地点必须是真实地址，经纬度必须准确（北京范围：纬度39.4-40.2，经度115.7-117.4）
3. 覆盖 6 个分类：AI/技术、读书会、电影、景点/展览、美食、活动
4. 每个分类 2-3 个活动，总共 12-15 个
5. 电影推荐当前热映或即将上映的真实电影
6. 展览推荐故宫、国博、UCCA、798 等真实场馆的常设或当期展览
7. 价格要合理真实

## 返回格式
严格返回 JSON 数组，每个元素：
{{
  "title": "活动名称",
  "category": "AI|读书会|电影|景点|美食|活动",
  "date": "{sat} 或 {sun}",
  "time": "HH:MM-HH:MM 或 全天",
  "location": "完整地址",
  "latitude": 39.xxxx,
  "longitude": 116.xxxx,
  "price": 数字,
  "description": "一两句话描述，包含亮点和实用信息",
  "source": "数据来源（如：故宫博物院官网、猫眼电影、大众点评等）",
  "url": "相关链接（如果有）"
}}

只返回 JSON 数组，不要其他文字。"""

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=4096,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        logger.error(f"LLM 活动发现失败: {e}")
    return []


async def run_aggregation():
    """执行一轮完整的活动聚合"""
    logger.info("=== 开始活动聚合 ===")

    # 1. Tavily 搜索真实活动信息
    search_queries = [
        f"{CITY_NAME} 本周末 展览 博物馆 活动",
        f"{CITY_NAME} 热映电影 推荐",
        f"{CITY_NAME} AI 技术 meetup 活动",
        f"{CITY_NAME} 周末 读书会 书店",
        f"{CITY_NAME} 周末 景点 好去处",
    ]

    web_context_parts = []
    for q in search_queries:
        results = await _tavily_search(q, max_results=3)
        for r in results:
            web_context_parts.append(f"[{r['title']}] {r['content']}")

    web_context = "\n\n".join(web_context_parts) if web_context_parts else "无搜索结果，请基于你对北京的知识推荐。"

    # 2. LLM 生成结构化活动数据
    activities = await _llm_discover_activities(web_context)

    # 3. 降级：LLM 也失败时用种子数据
    if not activities:
        logger.warning("LLM 活动发现失败，使用种子数据降级")
        from seed_data import get_seed_activities
        activities = get_seed_activities()

    # 4. 写入数据库
    saved = 0
    for a in activities:
        try:
            activity = {
                "id": _make_id(a.get("source", "llm"), a["title"]),
                "title": a["title"],
                "category": a.get("category", "活动"),
                "date": a.get("date", _next_weekend()[0]),
                "time": a.get("time", ""),
                "location": a.get("location", ""),
                "latitude": a.get("latitude"),
                "longitude": a.get("longitude"),
                "price": a.get("price", 0),
                "source": a.get("source", "AI 推荐"),
                "url": a.get("url", ""),
                "image": a.get("image"),
                "description": a.get("description", ""),
            }
            upsert_activity(activity)
            saved += 1
        except Exception as e:
            logger.error(f"保存活动失败 [{a.get('title')}]: {e}")

    total = count_activities()
    logger.info(f"=== 聚合完成: 本次 {saved}/{len(activities)} 条，数据库总计 {total} 条 ===")
    return saved
