#!/bin/bash
#
# 1GB break test for Medusa stack.
# Runs sustained load and continuously checks for break signals:
# - backend health failures
# - container restarts
# - OOM kills
# - stress runner failures
#

set -euo pipefail

PROJECT_DIR="/root/thaiVaiEcom2.0"
cd "$PROJECT_DIR"

# Tunables (override via env in web console if needed)
TEST_DURATION_SECONDS="${TEST_DURATION_SECONDS:-600}"      # 10 min default
TEST_CONCURRENCY="${TEST_CONCURRENCY:-30}"
TEST_SAMPLE_INTERVAL="${TEST_SAMPLE_INTERVAL:-5}"
HEALTH_URL="${HEALTH_URL:-http://localhost:9000/health}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-3}"
ALLOWED_HEALTH_FAILURES="${ALLOWED_HEALTH_FAILURES:-3}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-thaivaiecom20}"

RESULTS_DIR="/root/1gb-break-test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

RUN_LOG="$RESULTS_DIR/run.log"
HEALTH_LOG="$RESULTS_DIR/health.log"
INSPECT_BEFORE="$RESULTS_DIR/container-inspect-before.txt"
INSPECT_AFTER="$RESULTS_DIR/container-inspect-after.txt"
SUMMARY="$RESULTS_DIR/SUMMARY.txt"

echo "========================================================" | tee -a "$RUN_LOG"
echo " 1GB BREAK TEST (Medusa stack)" | tee -a "$RUN_LOG"
echo "========================================================" | tee -a "$RUN_LOG"
echo "Results: $RESULTS_DIR" | tee -a "$RUN_LOG"
echo "Duration: ${TEST_DURATION_SECONDS}s" | tee -a "$RUN_LOG"
echo "Concurrency: $TEST_CONCURRENCY" | tee -a "$RUN_LOG"
echo "Sample interval: $TEST_SAMPLE_INTERVAL" | tee -a "$RUN_LOG"
echo "Health URL: $HEALTH_URL" | tee -a "$RUN_LOG"
echo "Allowed health failures: $ALLOWED_HEALTH_FAILURES" | tee -a "$RUN_LOG"
echo "" | tee -a "$RUN_LOG"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed." | tee -a "$RUN_LOG"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^medusa_backend$'; then
  echo "ERROR: medusa_backend is not running. Start stack first (example: yarn docker:up)." | tee -a "$RUN_LOG"
  exit 1
fi

if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "WARNING: Backend health is not OK before test starts." | tee -a "$RUN_LOG"
fi

CONTAINERS="medusa_backend medusa_postgres medusa_redis medusa_storefront medusa_nginx"

echo "[Pre-test] Capturing container state..." | tee -a "$RUN_LOG"
for c in $CONTAINERS; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
    docker inspect --format '{{.Name}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" \
      | sed 's#^/##' >> "$INSPECT_BEFORE" || true
  fi
done

echo "[Test] Starting background health monitor..." | tee -a "$RUN_LOG"
HEALTH_FAILS=0
TOTAL_HEALTH_CHECKS=0

(
  while true; do
    TS="$(date -Iseconds)"
    TOTAL_HEALTH_CHECKS=$((TOTAL_HEALTH_CHECKS + 1))
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "$TS,ok" >> "$HEALTH_LOG"
    else
      echo "$TS,fail" >> "$HEALTH_LOG"
      HEALTH_FAILS=$((HEALTH_FAILS + 1))
    fi
    sleep "$HEALTH_CHECK_INTERVAL"
  done
) &
HEALTH_PID=$!

echo "[Test] Running soak stress profile..." | tee -a "$RUN_LOG"
set +e
SOAK_DURATION_SECONDS="$TEST_DURATION_SECONDS" \
SOAK_CONCURRENCY="$TEST_CONCURRENCY" \
SOAK_SAMPLE_INTERVAL_SECONDS="$TEST_SAMPLE_INTERVAL" \
bash ./scripts/run-soak-capacity-test.sh >> "$RUN_LOG" 2>&1
SOAK_EXIT=$?
set -e

kill "$HEALTH_PID" >/dev/null 2>&1 || true
wait "$HEALTH_PID" 2>/dev/null || true

echo "[Post-test] Capturing container state..." | tee -a "$RUN_LOG"
for c in $CONTAINERS; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${c}$"; then
    docker inspect --format '{{.Name}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" \
      | sed 's#^/##' >> "$INSPECT_AFTER" || true
  fi
done

# Parse deltas for restart count and OOM
RESTART_DELTA=0
OOM_COUNT=0
UNHEALTHY_COUNT=0

while IFS='|' read -r cname beforeRestart _ _ _; do
  afterLine="$(grep "^${cname}|" "$INSPECT_AFTER" || true)"
  if [[ -n "$afterLine" ]]; then
    afterRestart="$(echo "$afterLine" | cut -d'|' -f2)"
    afterOOM="$(echo "$afterLine" | cut -d'|' -f3)"
    afterStatus="$(echo "$afterLine" | cut -d'|' -f4)"
    afterHealth="$(echo "$afterLine" | cut -d'|' -f5)"

    beforeRestartNum="${beforeRestart:-0}"
    afterRestartNum="${afterRestart:-0}"
    if [[ "$afterRestartNum" =~ ^[0-9]+$ && "$beforeRestartNum" =~ ^[0-9]+$ ]]; then
      delta=$((afterRestartNum - beforeRestartNum))
      if [[ "$delta" -gt 0 ]]; then
        RESTART_DELTA=$((RESTART_DELTA + delta))
      fi
    fi

    if [[ "$afterOOM" == "true" ]]; then
      OOM_COUNT=$((OOM_COUNT + 1))
    fi

    if [[ "$afterStatus" != "running" ]]; then
      UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
    fi
    if [[ -n "$afterHealth" && "$afterHealth" != "healthy" && "$afterHealth" != "none" ]]; then
      UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
    fi
  fi
done < "$INSPECT_BEFORE"

HEALTH_FAILS_FINAL="$(awk -F',' '$2=="fail"{c++} END{print c+0}' "$HEALTH_LOG" 2>/dev/null || echo 0)"
HEALTH_CHECKS_FINAL="$(awk 'END{print NR+0}' "$HEALTH_LOG" 2>/dev/null || echo 0)"

STATUS="PASS"
REASONS=()

if [[ "$SOAK_EXIT" -ne 0 ]]; then
  STATUS="FAIL"
  REASONS+=("soak_runner_exit_${SOAK_EXIT}")
fi

if [[ "$HEALTH_FAILS_FINAL" -gt "$ALLOWED_HEALTH_FAILURES" ]]; then
  STATUS="FAIL"
  REASONS+=("health_failures_${HEALTH_FAILS_FINAL}")
fi

if [[ "$RESTART_DELTA" -gt 0 ]]; then
  STATUS="FAIL"
  REASONS+=("container_restarts_${RESTART_DELTA}")
fi

if [[ "$OOM_COUNT" -gt 0 ]]; then
  STATUS="FAIL"
  REASONS+=("oom_killed_containers_${OOM_COUNT}")
fi

if [[ "$UNHEALTHY_COUNT" -gt 0 ]]; then
  STATUS="FAIL"
  REASONS+=("unhealthy_or_stopped_containers_${UNHEALTHY_COUNT}")
fi

{
  echo "========================================================"
  echo "1GB BREAK TEST RESULT: $STATUS"
  echo "========================================================"
  echo "Results directory: $RESULTS_DIR"
  echo "Soak runner exit code: $SOAK_EXIT"
  echo "Health checks: $HEALTH_CHECKS_FINAL"
  echo "Health failures: $HEALTH_FAILS_FINAL"
  echo "Container restart delta: $RESTART_DELTA"
  echo "OOM-killed containers: $OOM_COUNT"
  echo "Unhealthy/stopped indicators: $UNHEALTHY_COUNT"
  if [[ "${#REASONS[@]}" -gt 0 ]]; then
    echo "Reasons: ${REASONS[*]}"
  else
    echo "Reasons: none"
  fi
  echo ""
  echo "Artifacts:"
  echo "- $RUN_LOG"
  echo "- $HEALTH_LOG"
  echo "- $INSPECT_BEFORE"
  echo "- $INSPECT_AFTER"
} | tee "$SUMMARY"

if [[ "$STATUS" == "FAIL" ]]; then
  exit 1
fi
