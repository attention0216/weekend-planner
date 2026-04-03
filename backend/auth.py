"""
认证中间件 — Supabase JWT 验证
未配置时降级为开发模式（放行所有请求）
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request

from config import SUPABASE_JWT_SECRET

logger = logging.getLogger(__name__)

_DEV_MODE = not SUPABASE_JWT_SECRET


def _decode_jwt(token: str) -> dict:
    """解码 Supabase JWT"""
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token 无效: {e}")


async def get_current_user(request: Request) -> str:
    """
    FastAPI 依赖：提取当前用户 ID
    - 生产：从 Authorization Bearer token 解码
    - 开发：返回 'dev-user'
    """
    if _DEV_MODE:
        return "dev-user"

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少认证令牌")

    token = auth[7:]
    payload = _decode_jwt(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token 中无用户信息")

    return user_id


async def optional_user(request: Request) -> Optional[str]:
    """可选认证：未登录返回 None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
