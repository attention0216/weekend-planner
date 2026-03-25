"""
配置管理 — 环境变量统一入口
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# ── 加载 .env ──
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ── 保存原始代理后清除（httpx 不走代理，curl 子进程需要）──
_PROXY_KEYS = ("http_proxy", "https_proxy", "all_proxy",
               "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY")
SAVED_PROXY_ENV = {k: os.environ[k] for k in _PROXY_KEYS if k in os.environ}
for _proxy_var in _PROXY_KEYS:
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
DEFAULT_ADDRESS = os.getenv("DEFAULT_ADDRESS", "北京市昌平区龙锦苑四区12号楼")

# ── 聚合配置 ──
AGGREGATION_INTERVAL_HOURS = int(os.getenv("AGGREGATION_INTERVAL_HOURS", "6"))

# ── GitHub 数据层（替代 SQLite，免费持久化）──
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
