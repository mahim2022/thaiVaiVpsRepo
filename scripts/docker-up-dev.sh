#!/bin/bash
#
# Stops the production stack if it is running, then starts the dev stack.
#

set -euo pipefail

ROOT_DIR="/root/thaiVaiEcom2.0"

cd "$ROOT_DIR"

echo "Stopping the production stack if it is running..."
docker compose down --remove-orphans >/dev/null 2>&1 || true

echo "Starting development stack..."
docker compose -f docker-compose.dev.yml up --build