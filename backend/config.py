"""
配置管理 — 环境变量统一入口
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# ── 加载 .env ──
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ── 清除系统代理（避免 httpx SOCKS 代理报错）──
for _proxy_var in ("http_proxy", "https_proxy", "all_proxy",
                   "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
    os.environ.pop(_proxy_var, None)

DB_PATH = BASE_DIR / "data" / "weekend.db"

# ── LLM API（OpenAI 兼容格式）──
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://llm.listenhub.dev/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-opus-4-6")

# ── 高德地图 ──
AMAP_KEY = os.getenv("AMAP_KEY", "")

# ── Tavily 搜索 ──
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# ── 城市配置 ──
CITY_NAME = os.getenv("CITY_NAME", "北京")

# ── 聚合配置 ──
AGGREGATION_INTERVAL_HOURS = int(os.getenv("AGGREGATION_INTERVAL_HOURS", "6"))
