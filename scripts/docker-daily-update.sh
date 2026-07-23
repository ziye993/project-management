#!/usr/bin/env bash
# 宿主机定时：拉最新代码 → 重建镜像 → 滚动重启
# 建议放到仓库外的固定路径，或在仓库根目录执行。
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
LOG_FILE="${LOG_FILE:-/var/log/project-management-update.log}"

mkdir -p "$(dirname "$LOG_FILE")"
exec >>"$LOG_FILE" 2>&1

echo "==== $(date '+%F %T') update start ===="
cd "$REPO_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -f "$COMPOSE_FILE" build --pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==== $(date '+%F %T') update done ===="
