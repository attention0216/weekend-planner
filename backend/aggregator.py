from __future__ import annotations
"""
活动聚合引擎
Tavily 搜索 + LLM 结构化 + URL 验证 → 真实北京周末活动
"""
import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime, timedelta

import httpx

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, TAVILY_API_KEY, CITY_NAME, SAVED_PROXY_ENV
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


def _parse_llm_json(text: str):
    """从 LLM 响应中健壮地提取 JSON"""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        for pattern in [r"\[[\s\S]*\]", r"\{[\s\S]*\}"]:
            match = re.search(pattern, text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    continue
        logger.error(f"无法解析 LLM JSON: {text[:200]}")
        return None


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


# ======================================================
#  URL 验证 — 确保活动链接可达
# ======================================================

async def _verify_url(url: str) -> bool:
    """HEAD 请求验证 URL 是否可达（3秒超时）"""
    if not url or not url.startswith("http"):
        return False
    try:
        async with httpx.AsyncClient(timeout=3, proxy=None, follow_redirects=True) as client:
            resp = await client.head(url)
            return resp.status_code < 400
    except Exception:
        return False


async def _verify_activity_urls(activities: list[dict]) -> list[dict]:
    """批量验证活动 URL，不可达的清空 url 字段"""
    import asyncio
    tasks = [_verify_url(a.get("url", "")) for a in activities]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for a, ok in zip(activities, results):
        if not ok or isinstance(ok, Exception):
            a["url"] = ""
            logger.info(f"URL 验证失败，已清除: [{a.get('title')}] {a.get('url', '')}")
    return activities


async def _llm_discover_activities(web_context: str, tavily_urls: list[str]) -> list[dict]:
    """用 LLM 基于搜索结果生成真实活动数据"""
    if not LLM_API_KEY:
        return []

    sat, sun = _next_weekend()

    # 将 Tavily 搜索到的真实 URL 提供给 LLM
    url_hint = ""
    if tavily_urls:
        url_hint = "\n\n## 搜索到的真实链接（优先使用这些）\n" + "\n".join(f"- {u}" for u in tavily_urls[:20])

    prompt = f"""你是一个北京本地生活专家。请基于以下搜索结果和你的知识，生成 {CITY_NAME} 本周末（{sat} 和 {sun}）的真实活动推荐。

## 搜索到的信息
{web_context[:3000]}{url_hint}

## 严格要求（违反任何一条都不可接受）
1. **只推荐搜索结果中明确提及的**或你**100%确定真实存在**的场馆/展览/活动/电影
2. **禁止编造**：如果不确定某个活动/展览是否真实存在，不要推荐
3. 地点必须是真实地址，经纬度必须准确（北京范围：纬度39.4-40.2，经度115.7-117.4）
4. **分类不限**：可以是 AI/技术、读书会、电影、景点、美食、运动、演出、市集、户外、手工、社交等任意有趣的活动
5. category 字段自由填写，用简短的中文词（如"电影"、"展览"、"脱口秀"、"户外"、"运动"、"市集"、"音乐"等）
6. 总共推荐 15-20 个活动，越丰富越好
7. 电影只推荐搜索结果中提到的当前热映电影
8. 展览只推荐搜索结果中提到的或你确认的常设展览
9. 价格要合理真实
10. **url 字段**：只使用搜索结果中的真实链接，没有就填空字符串，**绝对禁止编造 URL**
11. **source 字段**：填写真实信息来源网站名（如"豆瓣"、"猫眼"、"大众点评"），source 必须和搜索结果对应
12. **description**：优先使用搜索结果中的原文描述，不要自行改编

## 返回格式
严格返回 JSON 数组，每个元素：
{{
  "title": "活动名称",
  "category": "自由分类词（如电影、展览、运动、脱口秀、户外、市集等）",
  "date": "{sat} 或 {sun}",
  "time": "HH:MM-HH:MM 或 全天",
  "location": "完整地址",
  "latitude": 39.xxxx,
  "longitude": 116.xxxx,
  "price": 数字,
  "description": "一两句话描述，包含亮点和实用信息",
  "source": "真实数据来源",
  "url": "搜索结果中的真实链接，没有则留空"
}}

只返回 JSON 数组，不要其他文字。"""

    # 通过 curl 调用 LLM（绕过 Python 古老的 LibreSSL）
    import os
    payload = json.dumps({
        "model": LLM_MODEL,
        "max_tokens": 4096,
        "temperature": 0.3,
        "messages": [{"role": "user", "content": prompt}],
    }, ensure_ascii=False)

    clean_env = {**{k: v for k, v in os.environ.items()
                    if k.lower() not in ("http_proxy", "https_proxy", "all_proxy")},
                 **SAVED_PROXY_ENV}

    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "--max-time", "120",
        "-X", "POST", f"{LLM_BASE_URL}/chat/completions",
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {LLM_API_KEY}",
        "-d", payload,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=clean_env,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        logger.error(f"LLM 活动发现 curl 失败: rc={proc.returncode}")
        return []

    try:
        data = json.loads(stdout.decode())
        text = data["choices"][0]["message"]["content"].strip()
        result = _parse_llm_json(text)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"LLM 活动发现解析失败: {e}")
    return []


async def run_aggregation():
    """执行一轮完整的活动聚合（全链路 try-catch 确保降级）"""
    logger.info("=== 开始活动聚合 ===")

    activities: list[dict] = []

    try:
        # 1. Tavily 搜索真实活动信息
        search_queries = [
            f"{CITY_NAME} 周末 展览 博物馆 开放 2026",
            f"{CITY_NAME} 周末活动 市集 音乐节 演出 2026年4月",
            f"site:douban.com {CITY_NAME} 周末活动 同城",
            f"site:maoyan.com 北京 热映电影 在映",
            f"{CITY_NAME} AI meetup 技术沙龙 创业活动",
            f"{CITY_NAME} 读书会 书店活动 文化空间",
            f"{CITY_NAME} 周末 户外 徒步 骑行 公园 推荐",
            f"site:dianping.com {CITY_NAME} 人气餐厅 特色美食",
            f"{CITY_NAME} 脱口秀 话剧 戏剧 演出 本周",
            f"{CITY_NAME} 运动 羽毛球 攀岩 游泳 周末",
        ]

        web_context_parts = []
        tavily_urls = []
        for q in search_queries:
            results = await _tavily_search(q, max_results=3)
            for r in results:
                web_context_parts.append(f"[{r['title']}] {r['content']}")
                if r.get("url"):
                    tavily_urls.append(r["url"])

        web_context = "\n\n".join(web_context_parts) if web_context_parts else "无搜索结果，请基于你对北京的知识推荐。"

        # 2. LLM 生成结构化活动数据
        activities = await _llm_discover_activities(web_context, tavily_urls)

        # 3. 验证 URL 真实性
        if activities:
            activities = await _verify_activity_urls(activities)

    except Exception as e:
        logger.error(f"聚合管道异常，降级到种子数据: {e}")

    # 4. 降级：管道失败或无结果 → 种子数据
    if not activities:
        logger.warning("使用种子数据降级")
        from seed_data import get_seed_activities
        activities = get_seed_activities()

    # 5. 写入数据库（去重）
    saved = 0
    seen_ids = set()
    for a in activities:
        try:
            aid = _make_id(a.get("source", "llm"), a["title"])
            if aid in seen_ids:
                continue
            seen_ids.add(aid)

            activity = {
                "id": aid,
                "title": a["title"],
                "category": a.get("category", "活动"),
                "date": a.get("date", _next_weekend()[0]),
                "time": a.get("time", ""),
                "location": a.get("location", ""),
                "latitude": a.get("latitude"),
                "longitude": a.get("longitude"),
                "price": a.get("price", 0),
                "source": a.get("source", ""),
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
