"""
GitHub 数据层 — 用 GitHub API 替代 SQLite
免费 · 版本化 · 永久持久化

当 GITHUB_TOKEN 未设置时，自动退化为 SQLite（db.py）
"""
from __future__ import annotations

import json
import time
import base64
import logging
import hashlib
from typing import Any

import httpx

from config import GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH

logger = logging.getLogger(__name__)

# ── 内存缓存 ──
_cache: dict[str, tuple[float, Any]] = {}
_sha_cache: dict[str, str] = {}
CACHE_TTL = 300  # 5 分钟

# ── GitHub API 客户端 ──
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )
    return _client


def is_enabled() -> bool:
    """GitHub 数据层是否启用"""
    return bool(GITHUB_TOKEN and GITHUB_REPO)


# ──────────────────────────────────────────────
# 底层读写
# ──────────────────────────────────────────────

async def read_json(path: str) -> Any | None:
    """从 GitHub 读取 JSON 文件，带内存缓存"""
    cache_key = path
    if cache_key in _cache:
        ts, data = _cache[cache_key]
        if time.time() - ts < CACHE_TTL:
            return data

    client = _get_client()
    url = f"/repos/{GITHUB_REPO}/contents/{path}"
    params = {"ref": GITHUB_BRANCH}

    try:
        resp = await client.get(url, params=params)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        content = resp.json()
        raw = base64.b64decode(content["content"])
        data = json.loads(raw)
        _cache[cache_key] = (time.time(), data)
        _sha_cache[path] = content["sha"]
        return data
    except Exception as e:
        logger.error(f"GitHub read failed [{path}]: {e}")
        return _cache.get(cache_key, (0, None))[1]


async def write_json(path: str, data: Any, message: str) -> bool:
    """写入 JSON 到 GitHub（自动处理 SHA）"""
    client = _get_client()
    url = f"/repos/{GITHUB_REPO}/contents/{path}"

    content_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode()
    content_b64 = base64.b64encode(content_bytes).decode()

    # 获取 SHA（更新已有文件需要）
    sha = _sha_cache.get(path)
    if sha is None:
        try:
            resp = await client.get(url, params={"ref": GITHUB_BRANCH})
            if resp.status_code == 200:
                sha = resp.json()["sha"]
        except Exception:
            pass

    body: dict[str, Any] = {
        "message": message,
        "content": content_b64,
        "branch": GITHUB_BRANCH,
    }
    if sha:
        body["sha"] = sha

    try:
        resp = await client.put(url, json=body)
        if resp.status_code == 409:
            # SHA 冲突，重试一次
            fresh = await client.get(url, params={"ref": GITHUB_BRANCH})
            if fresh.status_code == 200:
                body["sha"] = fresh.json()["sha"]
                resp = await client.put(url, json=body)

        resp.raise_for_status()
        new_sha = resp.json().get("content", {}).get("sha")
        if new_sha:
            _sha_cache[path] = new_sha
        _cache[path] = (time.time(), data)
        logger.info(f"GitHub write [{path}] ok")
        return True
    except Exception as e:
        logger.error(f"GitHub write failed [{path}]: {e}")
        return False


# ──────────────────────────────────────────────
# 活动数据操作
# ──────────────────────────────────────────────

DATA_PATH = "data/activities.json"


async def read_activities() -> list[dict]:
    """读取全部活动"""
    data = await read_json(DATA_PATH)
    return data if isinstance(data, list) else []


async def upsert_activities(activities: list[dict]) -> int:
    """批量写入活动（合并已有数据）"""
    existing = await read_activities()
    by_id = {a["id"]: a for a in existing}
    for a in activities:
        by_id[a["id"]] = a
    merged = list(by_id.values())
    ok = await write_json(DATA_PATH, merged, f"更新活动数据 ({len(activities)} 条)")
    return len(activities) if ok else 0


async def list_activities(category: str = "", limit: int = 50) -> list[dict]:
    """查询活动（带分类过滤）"""
    all_acts = await read_activities()
    if category and category != "全部":
        all_acts = [a for a in all_acts if a.get("category") == category]
    all_acts.sort(key=lambda a: a.get("date", ""))
    return all_acts[:limit]


async def get_activity(activity_id: str) -> dict | None:
    """查询单个活动"""
    for a in await read_activities():
        if a["id"] == activity_id:
            return a
    return None


async def count_activities() -> int:
    """活动总数"""
    return len(await read_activities())


# ──────────────────────────────────────────────
# 用户数据操作
# ──────────────────────────────────────────────

def _user_path(name: str) -> str:
    """用户数据文件路径（名字做 hash 避免特殊字符）"""
    safe = hashlib.md5(name.encode()).hexdigest()[:8]
    return f"data/users/{safe}_{name}.json"


async def read_user(name: str) -> dict:
    """读取用户数据"""
    data = await read_json(_user_path(name))
    return data if isinstance(data, dict) else {"name": name, "favorites": [], "profile": {}}


async def write_user(name: str, data: dict) -> bool:
    """写入用户数据"""
    data["name"] = name
    return await write_json(_user_path(name), data, f"更新用户 {name}")
