#!/usr/bin/env bash
set -euo pipefail

# Backup script for thaivaiecom20 Medusa stack
# Usage: sudo ./backup.sh [--dry-run] [backup-dir]

PROJECT_NAME=${COMPOSE_PROJECT_NAME:-thaivaiecom20}
TS=$(date +%F-%H%M%S)
BK_DIR=/root/medusa-backup-$TS
DRY_RUN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=1
      shift
      ;;
    *)
      BK_DIR=$1
      shift
      ;;
  esac
done

VOLUMES=("${PROJECT_NAME}_postgres_data" "${PROJECT_NAME}_shared_config" "${PROJECT_NAME}_medusa_static")

echo "Backup directory: $BK_DIR"
if [ "$DRY_RUN" -eq 0 ]; then
  mkdir -p "$BK_DIR"
fi

echo "1) Checking disk space..."
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would run: df -h /"
  echo "Would run: docker system df"
else
  df -h /
  docker system df || true
fi

echo "2) Stopping app containers (medusa, storefront)..."
cd /root/thaiVaiEcom2.0
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would run: docker compose stop medusa storefront"
else
  docker compose stop medusa storefront || true
fi

echo "3) Archiving Docker volumes..."
for V in "${VOLUMES[@]}"; do
  echo "Backing up $V ..."
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "Would run: docker run --rm -v $V:/volume -v $BK_DIR:/backup alpine sh -c 'cd /volume && tar czf /backup/$V.tar.gz .'"
  else
    docker run --rm -v "$V":/volume -v "$BK_DIR":/backup alpine sh -c "cd /volume && tar czf /backup/$V.tar.gz ."
  fi
done

echo "4) Saving envs, compose file, certs, and git commit..."
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would copy: .env -> $BK_DIR/backend.env"
  echo "Would copy: my-medusa-storefront/.env -> $BK_DIR/storefront.env"
  echo "Would copy: docker-compose.yml -> $BK_DIR/"
  echo "Would archive: nginx/certs -> $BK_DIR/nginx-certs.tar.gz"
  echo "Would run: git rev-parse HEAD > $BK_DIR/git-commit.txt"
else
  cp .env "$BK_DIR/backend.env" 2>/dev/null || echo "Warning: .env not found"
  cp my-medusa-storefront/.env "$BK_DIR/storefront.env" 2>/dev/null || echo "Warning: storefront .env not found"
  cp docker-compose.yml "$BK_DIR/" 2>/dev/null || true
  if [ -d nginx/certs ]; then
    tar czf "$BK_DIR/nginx-certs.tar.gz" nginx/certs
  fi
  git rev-parse HEAD > "$BK_DIR/git-commit.txt" || echo "git info unavailable"
fi

echo "5) Restarting app containers..."
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would run: docker compose start medusa storefront"
else
  docker compose start medusa storefront || true
fi

echo "6) Verify backup contents"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Would run: ls -lh $BK_DIR"
  echo "Would run: du -sh $BK_DIR"
else
  ls -lh "$BK_DIR" || true
  du -sh "$BK_DIR" || true
fi

echo "Backup complete: $BK_DIR"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run complete: no files were written and no containers were changed."
fi
