#!/bin/bash
#
# Runs transaction stress in background and injects one dependency restart.
#

set -euo pipefail

PROJECT_DIR="/root/thaiVaiEcom2.0"
TARGET_CONTAINER="${RECOVERY_TARGET_CONTAINER:-medusa_redis}"
INJECT_AFTER_SECONDS="${RECOVERY_INJECT_AFTER_SECONDS:-120}"

cd "$PROJECT_DIR"

echo "========================================================"
echo " Transaction Stress + Recovery Drill"
echo "========================================================"
echo "Target container: $TARGET_CONTAINER"
echo "Restart injection after: ${INJECT_AFTER_SECONDS}s"
echo ""

bash ./scripts/run-transaction-stress.sh &
STRESS_PID=$!

sleep "$INJECT_AFTER_SECONDS"

echo "[Recovery Drill] Restarting $TARGET_CONTAINER at $(date -Iseconds)"
docker restart "$TARGET_CONTAINER"

echo "[Recovery Drill] Waiting for stress test process $STRESS_PID to finish..."
wait "$STRESS_PID"

echo "[Recovery Drill] Completed"
