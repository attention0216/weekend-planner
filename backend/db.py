from __future__ import annotations
"""
数据库层 — SQLite + 活动表
轻量单文件，零运维
"""
import sqlite3
from contextlib import contextmanager

from config import DB_PATH


def init_db():
    """初始化数据库表"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS activities (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                category    TEXT NOT NULL,
                date        TEXT NOT NULL,
                time        TEXT NOT NULL DEFAULT '',
                location    TEXT NOT NULL DEFAULT '',
                latitude    REAL,
                longitude   REAL,
                price       REAL NOT NULL DEFAULT 0,
                source      TEXT NOT NULL DEFAULT '',
                url         TEXT NOT NULL DEFAULT '',
                image       TEXT,
                description TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_activities_date
                ON activities(date);
            CREATE INDEX IF NOT EXISTS idx_activities_category
                ON activities(category);
        """)


@contextmanager
def get_conn():
    """获取数据库连接（自动提交+关闭）"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_activity(activity: dict):
    """插入或更新活动（以id去重）"""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO activities (id, title, category, date, time, location,
                                    latitude, longitude, price, source, url, image, description)
            VALUES (:id, :title, :category, :date, :time, :location,
                    :latitude, :longitude, :price, :source, :url, :image, :description)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, category=excluded.category,
                date=excluded.date, time=excluded.time,
                location=excluded.location, latitude=excluded.latitude,
                longitude=excluded.longitude, price=excluded.price,
                source=excluded.source, url=excluded.url,
                image=excluded.image, description=excluded.description
        """, activity)


def list_activities(category: str = "", limit: int = 50) -> list[dict]:
    """查询活动列表"""
    with get_conn() as conn:
        if category and category != "全部":
            rows = conn.execute(
                "SELECT * FROM activities WHERE category=? ORDER BY date ASC LIMIT ?",
                (category, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM activities ORDER BY date ASC LIMIT ?",
                (limit,)
            ).fetchall()
    return [dict(r) for r in rows]


def get_activity(activity_id: str) -> dict | None:
    """查询单个活动"""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM activities WHERE id=?", (activity_id,)
        ).fetchone()
    return dict(row) if row else None


def count_activities() -> int:
    """活动总数"""
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) FROM activities").fetchone()[0]
