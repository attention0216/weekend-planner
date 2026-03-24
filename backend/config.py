"""
配置管理 — 环境变量统一入口
所有 API Key 和外部服务配置走这里
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

# ── API Keys ──
AMAP_KEY = os.getenv("AMAP_KEY", "")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# ── RSSHub ──
RSSHUB_BASE = os.getenv("RSSHUB_BASE", "https://rsshub.app")

# ── 城市配置 ──
CITY_NAME = os.getenv("CITY_NAME", "北京")
# 豆瓣同城城市代码：北京108288 上海108296 广州108311 深圳108304 杭州108313
DOUBAN_CITY_ID = os.getenv("DOUBAN_CITY_ID", "108288")

# ── 聚合配置 ──
# 定时任务间隔（小时）
AGGREGATION_INTERVAL_HOURS = int(os.getenv("AGGREGATION_INTERVAL_HOURS", "6"))
