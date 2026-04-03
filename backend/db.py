from __future__ import annotations
"""
数据库层 — SQLite + WAL 模式
4 表：user_profiles / activities / plans / stamps
"""
import sqlite3
from contextlib import contextmanager

from config import DB_PATH


# ── 初始化 ──

def init_db():
    """创建全部表 + 索引"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript("""
            /* ── 用户画像 ── */
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id     TEXT PRIMARY KEY,
                name        TEXT NOT NULL DEFAULT '',
                diet        TEXT NOT NULL DEFAULT '[]',
                budget      TEXT NOT NULL DEFAULT '适中',
                social      TEXT NOT NULL DEFAULT '一个人',
                preference_weights TEXT NOT NULL DEFAULT '{}',
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            /* ── 活动 ── */
            CREATE TABLE IF NOT EXISTS activities (
                id              TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                category        TEXT NOT NULL,
                date            TEXT NOT NULL,
                end_date        TEXT,
                time            TEXT NOT NULL DEFAULT '',
                location        TEXT NOT NULL DEFAULT '',
                latitude        REAL,
                longitude       REAL,
                price           REAL NOT NULL DEFAULT 0,
                source          TEXT NOT NULL DEFAULT '',
                source_type     TEXT NOT NULL DEFAULT 'general',
                url             TEXT NOT NULL DEFAULT '',
                image           TEXT,
                description     TEXT NOT NULL DEFAULT '',
                is_time_limited INTEGER NOT NULL DEFAULT 0,
                url_verified    INTEGER NOT NULL DEFAULT 0,
                url_verified_at TEXT,
                rating          REAL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_activities_date
                ON activities(date);
            CREATE INDEX IF NOT EXISTS idx_activities_category
                ON activities(category);
            CREATE INDEX IF NOT EXISTS idx_activities_source_type
                ON activities(source_type);

            /* ── 日程 ── */
            CREATE TABLE IF NOT EXISTS plans (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                mood        TEXT NOT NULL,
                time_slot   TEXT NOT NULL,
                companion   TEXT NOT NULL,
                items       TEXT NOT NULL DEFAULT '[]',
                confirmed   INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_plans_user
                ON plans(user_id);

            /* ── 集邮册 ── */
            CREATE TABLE IF NOT EXISTS stamps (
                id            TEXT PRIMARY KEY,
                user_id       TEXT NOT NULL,
                plan_id       TEXT,
                source        TEXT NOT NULL DEFAULT 'manual',
                activity_type TEXT NOT NULL DEFAULT '',
                area          TEXT NOT NULL DEFAULT '',
                note          TEXT,
                created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_stamps_user
                ON stamps(user_id);

            /* ── 反馈 ── */
            CREATE TABLE IF NOT EXISTS feedback (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     TEXT NOT NULL,
                plan_id     TEXT,
                item_index  INTEGER,
                type        TEXT NOT NULL DEFAULT 'wrong_info',
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
        """)


# ── 连接管理 ──

@contextmanager
def get_conn():
    """获取数据库连接（WAL + 自动提交 + 关闭）"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ── 活动 CRUD ──

def upsert_activity(activity: dict):
    """插入或更新活动（以 id 去重）"""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO activities (id, title, category, date, end_date, time, location,
                                    latitude, longitude, price, source, source_type, url,
                                    image, description, is_time_limited, rating)
            VALUES (:id, :title, :category, :date, :end_date, :time, :location,
                    :latitude, :longitude, :price, :source, :source_type, :url,
                    :image, :description, :is_time_limited, :rating)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, category=excluded.category,
                date=excluded.date, end_date=excluded.end_date,
                time=excluded.time, location=excluded.location,
                latitude=excluded.latitude, longitude=excluded.longitude,
                price=excluded.price, source=excluded.source,
                source_type=excluded.source_type, url=excluded.url,
                image=excluded.image, description=excluded.description,
                is_time_limited=excluded.is_time_limited, rating=excluded.rating
        """, activity)


def list_activities(category: str = "", limit: int = 50) -> list[dict]:
    """查询活动列表（自动过滤过期+死链）"""
    with get_conn() as conn:
        base = "SELECT * FROM activities WHERE (end_date IS NULL OR end_date >= date('now', 'localtime'))"
        params: list = []
        if category and category != "全部":
            base += " AND category=?"
            params.append(category)
        base += " ORDER BY date ASC LIMIT ?"
        params.append(limit)
        rows = conn.execute(base, params).fetchall()
    return [dict(r) for r in rows]


def get_activity(activity_id: str) -> dict | None:
    """查询单个活动"""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM activities WHERE id=?", (activity_id,)).fetchone()
    return dict(row) if row else None


def count_activities() -> int:
    """活动总数"""
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) FROM activities").fetchone()[0]


# ── 用户画像 CRUD ──

def get_profile(user_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM user_profiles WHERE user_id=?", (user_id,)).fetchone()
    return dict(row) if row else None


def upsert_profile(profile: dict):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO user_profiles (user_id, name, diet, budget, social, preference_weights)
            VALUES (:user_id, :name, :diet, :budget, :social, :preference_weights)
            ON CONFLICT(user_id) DO UPDATE SET
                name=excluded.name, diet=excluded.diet, budget=excluded.budget,
                social=excluded.social, preference_weights=excluded.preference_weights,
                updated_at=datetime('now', 'localtime')
        """, profile)


# ── 日程 CRUD ──

def save_plan(plan: dict):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO plans (id, user_id, mood, time_slot, companion, items, confirmed)
            VALUES (:id, :user_id, :mood, :time_slot, :companion, :items, :confirmed)
            ON CONFLICT(id) DO UPDATE SET
                items=excluded.items, confirmed=excluded.confirmed
        """, plan)


def get_plan(plan_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM plans WHERE id=?", (plan_id,)).fetchone()
    return dict(row) if row else None


def list_plans(user_id: str, limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM plans WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]


# ── 集邮册 CRUD ──

def save_stamp(stamp: dict):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO stamps (id, user_id, plan_id, source, activity_type, area, note)
            VALUES (:id, :user_id, :plan_id, :source, :activity_type, :area, :note)
        """, stamp)


def list_stamps(user_id: str, limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM stamps WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]


# ── 反馈 ──

def save_feedback(user_id: str, plan_id: str, item_index: int, feedback_type: str = "wrong_info"):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO feedback (user_id, plan_id, item_index, type) VALUES (?, ?, ?, ?)",
            (user_id, plan_id, item_index, feedback_type)
        )
