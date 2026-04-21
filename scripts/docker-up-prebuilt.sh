#!/bin/sh

set -e

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "Stopping the dev stack if it is running..."
docker compose -f docker-compose.dev.yml down --remove-orphans >/dev/null 2>&1 || true

echo "Starting base services (postgres, redis, medusa)..."
docker compose up -d --build postgres redis medusa

echo "Waiting for medusa healthcheck..."
ATTEMPTS=0
until [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' medusa_backend 2>/dev/null || echo starting)" = "healthy" ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Medusa backend did not become healthy in time."
    exit 1
  fi
  sleep 2
done

echo "Fetching latest publishable API key from postgres..."
ATTEMPTS=0
PUBLISHABLE_KEY=""
until [ -n "$PUBLISHABLE_KEY" ]; do
  PUBLISHABLE_KEY=$(docker exec medusa_postgres psql -U postgres -d medusa-store -Atc "select token from api_key where type = 'publishable' order by created_at desc limit 1;" 2>/dev/null | tr -d '\r')

  if [ -n "$PUBLISHABLE_KEY" ]; then
    break
  fi

  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Publishable key was not found in time."
    exit 1
  fi

  sleep 2
done

BUILD_MEDUSA_BACKEND_URL=${STOREFRONT_BUILD_MEDUSA_BACKEND_URL:-http://host.docker.internal:9000}

echo "Building storefront image with live publishable key..."
docker compose build \
  --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  --build-arg MEDUSA_BACKEND_URL="$BUILD_MEDUSA_BACKEND_URL" \
  storefront

echo "Starting storefront and nginx..."
docker compose up -d storefront nginx

echo "All services are up."
docker compose ps
