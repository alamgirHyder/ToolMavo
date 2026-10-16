#!/usr/bin/env bash
set -euo pipefail
cd /workspace/ToolMavo
export npm_config_cache=/workspace/.cache/npm
npm ci --no-audit --no-fund
npm run build
npm test
npm run test:frontend
