from __future__ import annotations
"""
活动聚合引擎
从 RSSHub 拉取豆瓣同城 + 猫眼电影，结构化后写入数据库
"""
import hashlib
import logging
import re
from datetime import datetime, timedelta

import feedparser
import httpx

from config import RSSHUB_BASE, DOUBAN_CITY_ID
from db import upsert_activity, count_activities

logger = logging.getLogger(__name__)

# 跳过系统代理，直连 RSSHub，模拟浏览器 UA
_HTTP_CLIENT_ARGS = {
    "timeout": 30,
    "proxy": None,
    "headers": {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    "follow_redirects": True,
}


def _make_id(source: str, title: str, date: str) -> str:
    """生成稳定的活动ID（用于去重）"""
    raw = f"{source}:{title}:{date}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _extract_date_from_text(text: str) -> str:
    """从文本中提取日期，默认本周末"""
    m = re.search(r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})", text)
    if m:
        return m.group(1).replace("/", "-")

    m = re.search(r"(\d{1,2})月(\d{1,2})日", text)
    if m:
        year = datetime.now().year
        return f"{year}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"

    today = datetime.now()
    days_until_saturday = (5 - today.weekday()) % 7
    if days_until_saturday == 0 and today.hour > 12:
        days_until_saturday = 7
    saturday = today + timedelta(days=days_until_saturday)
    return saturday.strftime("%Y-%m-%d")


def _extract_price(text: str) -> float:
    """从文本提取价格"""
    m = re.search(r"[¥￥](\d+(?:\.\d+)?)", text)
    if m:
        return float(m.group(1))
    if "免费" in text or "free" in text.lower():
        return 0
    return 0


def _classify_activity(title: str, desc: str) -> str:
    """简单关键词分类"""
    text = f"{title} {desc}".lower()
    if any(k in text for k in ["ai", "人工智能", "大模型", "llm", "gpt", "编程", "黑客松", "hackathon", "技术"]):
        return "AI"
    if any(k in text for k in ["读书", "书友", "阅读", "书店", "分享会"]):
        return "读书会"
    if any(k in text for k in ["电影", "影院", "首映", "点映", "imax"]):
        return "电影"
    if any(k in text for k in ["展览", "博物馆", "公园", "景区", "古镇", "故宫"]):
        return "景点"
    if any(k in text for k in ["美食", "餐厅", "探店", "吃", "火锅", "烧烤"]):
        return "美食"
    return "活动"


async def fetch_douban_events() -> list[dict]:
    """从 RSSHub 拉取豆瓣同城热门活动"""
    url = f"{RSSHUB_BASE}/douban/event/hot/{DOUBAN_CITY_ID}"
    logger.info(f"拉取豆瓣同城: {url}")

    activities = []
    try:
        async with httpx.AsyncClient(**_HTTP_CLIENT_ARGS) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        for entry in feed.entries[:30]:
            title = entry.get("title", "").strip()
            if not title:
                continue

            desc = entry.get("summary", "") or entry.get("description", "")
            date = _extract_date_from_text(f"{title} {desc}")
            price = _extract_price(desc)
            category = _classify_activity(title, desc)

            image = None
            if hasattr(entry, "media_content") and entry.media_content:
                image = entry.media_content[0].get("url")
            elif hasattr(entry, "enclosures") and entry.enclosures:
                image = entry.enclosures[0].get("href")

            location = ""
            loc_match = re.search(r"地[点址][:：]\s*(.+?)(?:\n|<|$)", desc)
            if loc_match:
                location = loc_match.group(1).strip()

            activity = {
                "id": _make_id("douban", title, date),
                "title": title,
                "category": category,
                "date": date,
                "time": "",
                "location": location,
                "latitude": None,
                "longitude": None,
                "price": price,
                "source": "豆瓣同城",
                "url": entry.get("link", ""),
                "image": image,
                "description": re.sub(r"<[^>]+>", "", desc)[:500],
            }
            activities.append(activity)

        logger.info(f"豆瓣同城获取 {len(activities)} 个活动")
    except Exception as e:
        logger.error(f"豆瓣同城拉取失败: {e}")

    return activities


async def fetch_maoyan_movies() -> list[dict]:
    """从 RSSHub 拉取猫眼热映电影"""
    url = f"{RSSHUB_BASE}/maoyan/hot"
    logger.info(f"拉取猫眼热映: {url}")

    activities = []
    try:
        async with httpx.AsyncClient(**_HTTP_CLIENT_ARGS) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        for entry in feed.entries[:15]:
            title = entry.get("title", "").strip()
            if not title:
                continue

            desc = entry.get("summary", "") or entry.get("description", "")
            image = None
            if hasattr(entry, "enclosures") and entry.enclosures:
                image = entry.enclosures[0].get("href")

            today = datetime.now()
            days_until_saturday = (5 - today.weekday()) % 7
            if days_until_saturday == 0 and today.hour > 12:
                days_until_saturday = 7
            saturday = today + timedelta(days=days_until_saturday)

            activity = {
                "id": _make_id("maoyan", title, saturday.strftime("%Y-%m-%d")),
                "title": title,
                "category": "电影",
                "date": saturday.strftime("%Y-%m-%d"),
                "time": "全天",
                "location": "各大影院",
                "latitude": None,
                "longitude": None,
                "price": 45,
                "source": "猫眼电影",
                "url": entry.get("link", ""),
                "image": image,
                "description": re.sub(r"<[^>]+>", "", desc)[:500],
            }
            activities.append(activity)

        logger.info(f"猫眼电影获取 {len(activities)} 部电影")
    except Exception as e:
        logger.error(f"猫眼电影拉取失败: {e}")

    return activities


async def run_aggregation():
    """执行一轮完整的活动聚合，RSSHub 失败时降级到种子数据"""
    logger.info("=== 开始活动聚合 ===")

    all_activities = []
    all_activities.extend(await fetch_douban_events())
    all_activities.extend(await fetch_maoyan_movies())

    # RSSHub 全部失败时，使用种子数据保底
    if not all_activities:
        logger.warning("所有 RSS 源不可用，使用种子数据降级")
        from seed_data import get_seed_activities
        all_activities = get_seed_activities()

    saved = 0
    for a in all_activities:
        try:
            upsert_activity(a)
            saved += 1
        except Exception as e:
            logger.error(f"保存活动失败 [{a.get('title')}]: {e}")

    total = count_activities()
    logger.info(f"=== 聚合完成: 本次 {saved}/{len(all_activities)} 条，数据库总计 {total} 条 ===")
    return saved
