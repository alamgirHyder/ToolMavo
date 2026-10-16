#!/usr/bin/env bash
set -euo pipefail
cd /workspace/ToolMavo
export DB_PASSWORD="${DB_PASSWORD:-toolmavo_local}"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-toolmavo_local_root}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_NAME="${DB_NAME:-toolmavo}"
export DB_USER="${DB_USER:-toolmavo}"
docker compose up -d db
for attempt in $(seq 1 60); do
  if docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -h 127.0.0.1 -u "$MYSQL_USER" -D toolmavo -e "SELECT 1"' >/dev/null 2>&1; then break; fi
  sleep 1
done
exec node server/index.js
