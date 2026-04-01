#!/bin/bash
#
# Runs transaction stress test and auto-resolves publishable key if not provided.
#

set -euo pipefail

PROJECT_DIR="/root/thaiVaiEcom2.0"

cd "$PROJECT_DIR"

if [[ -z "${STRESS_PUBLISHABLE_KEY:-}" ]]; then
  STRESS_PUBLISHABLE_KEY="$(docker exec medusa_backend sh -lc 'if [ -f /shared/publishable_key.env ]; then . /shared/publishable_key.env; fi; printf "%s" "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"' 2>/dev/null || true)"

  if [[ -z "$STRESS_PUBLISHABLE_KEY" ]]; then
    echo "[stress-test:tx] Could not resolve publishable key from medusa_backend container."
    echo "Set STRESS_PUBLISHABLE_KEY manually and retry."
    exit 1
  fi

  export STRESS_PUBLISHABLE_KEY
fi

node ./scripts/stress-test-transactions.mjs
