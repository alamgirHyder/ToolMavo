#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run build
npm test
npm run test:frontend
