"""
天气查询 — Open-Meteo API（完全免费，无需 Key）
返回未来几天天气预报，用于活动推荐排序
"""
from __future__ import annotations

import logging
import httpx

logger = logging.getLogger(__name__)

# ── 天气代码 → 中文描述 + 室内推荐度 ──
_WEATHER_MAP: dict[int, tuple[str, str, bool]] = {
    0: ("晴", "clear", False),
    1: ("少云", "partly_cloudy", False),
    2: ("多云", "cloudy", False),
    3: ("阴", "overcast", False),
    45: ("雾", "fog", True),
    48: ("霜雾", "fog", True),
    51: ("小雨", "drizzle", True),
    53: ("中雨", "rain", True),
    55: ("大雨", "rain", True),
    61: ("小雨", "rain", True),
    63: ("中雨", "rain", True),
    65: ("大雨", "heavy_rain", True),
    71: ("小雪", "snow", True),
    73: ("中雪", "snow", True),
    75: ("大雪", "heavy_snow", True),
    80: ("阵雨", "showers", True),
    81: ("阵雨", "showers", True),
    82: ("暴雨", "heavy_rain", True),
    95: ("雷暴", "thunderstorm", True),
}

# ── 天气 → emoji ──
_EMOJI: dict[str, str] = {
    "clear": "☀️", "partly_cloudy": "🌤️", "cloudy": "☁️", "overcast": "🌥️",
    "fog": "🌫️", "drizzle": "🌦️", "rain": "🌧️", "heavy_rain": "⛈️",
    "snow": "🌨️", "heavy_snow": "❄️", "showers": "🌦️", "thunderstorm": "⛈️",
}


async def get_forecast(lat: float = 39.95, lng: float = 116.35, days: int = 3) -> list[dict]:
    """
    查询未来 N 天天气预报

    返回: [{"date": "2026-03-26", "condition": "晴", "code": "clear",
            "emoji": "☀️", "temp_high": 22, "temp_low": 8, "prefer_indoor": false}]
    """
    try:
        async with httpx.AsyncClient(timeout=10, proxy=None) as client:
            resp = await client.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": lat,
                "longitude": lng,
                "daily": "weather_code,temperature_2m_max,temperature_2m_min",
                "timezone": "Asia/Shanghai",
                "forecast_days": days,
            })
            resp.raise_for_status()
            data = resp.json()["daily"]

            result = []
            for i in range(len(data["time"])):
                code = data["weather_code"][i]
                desc, key, indoor = _WEATHER_MAP.get(code, ("未知", "unknown", False))
                result.append({
                    "date": data["time"][i],
                    "condition": desc,
                    "code": key,
                    "emoji": _EMOJI.get(key, "🌡️"),
                    "temp_high": round(data["temperature_2m_max"][i]),
                    "temp_low": round(data["temperature_2m_min"][i]),
                    "prefer_indoor": indoor,
                })
            return result
    except Exception as e:
        logger.warning(f"天气查询失败: {e}")
        return []
