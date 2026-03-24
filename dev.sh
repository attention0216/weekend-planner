#!/bin/bash
# 本地开发启动脚本 — 同时启动前后端

echo "=== 启动后端 ==="
cd "$(dirname "$0")/backend"
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "=== 启动前端 ==="
cd "$(dirname "$0")/frontend"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "前端: http://localhost:5173"
echo "后端: http://localhost:8000"
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
