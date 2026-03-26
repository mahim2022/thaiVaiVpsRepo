#!/bin/sh

set -e

echo "Waiting for backend bootstrap readiness signal..."
ATTEMPTS=0
until [ -f /shared/medusa_bootstrap.ready ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Backend bootstrap readiness file not found in time."
    exit 1
  fi
  sleep 2
done

echo "Waiting for shared publishable key file..."
ATTEMPTS=0
until [ -f /shared/publishable_key.env ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Publishable key file not found in time."
    exit 1
  fi
  sleep 2
done

. /shared/publishable_key.env

if [ -z "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" ]; then
  echo "Publishable key is empty."
  exit 1
fi

echo "Waiting for Medusa backend health endpoint..."
ATTEMPTS=0
until wget -q -O - "http://medusa:9000/health" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Backend was not ready in time."
    exit 1
  fi
  sleep 2
done

if [ ! -f /app/server.js ]; then
  echo "No standalone Next.js server found in image. Run the prebuild flow before starting storefront."
  exit 1
fi

echo "Starting storefront..."
node /app/server.js
