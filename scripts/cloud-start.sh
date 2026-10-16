#!/usr/bin/env bash
set -euo pipefail
cd /workspace/ToolMavo
# Local cloud development only. For deployment supply a unique password securely.
export DATABASE_PASSWORD="${DATABASE_PASSWORD:-toolmavo_local}"
docker compose up -d db
for attempt in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U toolmavo -d toolmavo >/dev/null 2>&1; then break; fi
  sleep 1
done
docker compose exec -T db pg_isready -U toolmavo -d toolmavo
exec /workspace/toolchains/java/bin/java -jar backend/target/toolmavo-1.0.0.jar
