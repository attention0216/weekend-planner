#!/bin/bash
# ======================================================
# 一键启动 — 后端 + 前端，手机可直接访问
# ======================================================

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"

# ── 清理已有进程 ──
kill_port() {
  lsof -ti:"$1" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
kill_port 8000
kill_port 5173

# ── 启动后端 ──
echo ">> 启动后端 (port 8000)..."
cd "$BACKEND_DIR"
if [ -f .env ]; then
  set -a; source .env; set +a
fi
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── 等后端就绪 ──
echo ">> 等待后端启动..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo ">> 后端就绪"
    break
  fi
  sleep 0.5
done

# ── 启动前端 ──
echo ">> 启动前端 (port 5173)..."
cd "$FRONTEND_DIR"
npx vite --host &
FRONTEND_PID=$!

# ── 获取局域网 IP ──
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
echo ""
echo "======================================"
echo "  电脑: http://localhost:5173/"
echo "  手机: http://${LAN_IP}:5173/"
echo "======================================"
echo ""

# ── 优雅退出 ──
cleanup() {
  echo ">> 正在关闭服务..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

wait
