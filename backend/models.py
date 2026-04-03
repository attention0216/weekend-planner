"""
请求/响应模型 — Pydantic 单一真相源
"""
from __future__ import annotations
from pydantic import BaseModel


# ── 请求模型 ──

class ProfileUpdate(BaseModel):
    name: str = ""
    diet: list[str] = []
    budget: str = "适中"
    social: str = "一个人"

class PlanRequest(BaseModel):
    mood: str
    time_slot: str
    companion: str

class AdjustRequest(BaseModel):
    plan_id: str
    item_index: int
    action: str  # swap | remove | closer | cheaper

class StampCreate(BaseModel):
    activity_type: str
    area: str
    note: str = ""

class FeedbackRequest(BaseModel):
    plan_id: str
    item_index: int

class ChatRequest(BaseModel):
    activity_id: str
    message: str
    current_plan: list[dict] = []

class NearbyRequest(BaseModel):
    lat: float
    lng: float
    keyword: str = "餐厅"
    radius: int = 2000


# ── 响应模型 ──

class HealthResponse(BaseModel):
    status: str
    activities_count: int

class RefreshResponse(BaseModel):
    refreshed: int
    total: int

class ConfigResponse(BaseModel):
    default_address: str
