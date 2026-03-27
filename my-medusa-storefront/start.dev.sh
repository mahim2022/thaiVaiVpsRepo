#!/bin/sh

set -e

echo "Installing storefront dependencies..."
yarn install --immutable

echo "Waiting for Medusa backend..."
ATTEMPTS=0
until wget -q -O - "http://medusa:9000/health" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Backend was not ready in time."
    exit 1
  fi
  sleep 2
done

echo "Looking up publishable key from local database..."
ATTEMPTS=0
PUBLISHABLE_KEY=""
until [ -n "$PUBLISHABLE_KEY" ]; do
  PUBLISHABLE_KEY=$(node -e "const { Client } = require('pg'); (async () => { const client = new Client({ connectionString: process.env.DEV_DATABASE_URL }); await client.connect(); const result = await client.query(\"select token from api_key where type = 'publishable' order by created_at desc limit 1\"); await client.end(); process.stdout.write(result.rows[0]?.token || ''); })().catch(() => process.stdout.write(''));" 2>/dev/null || true)

  if [ -n "$PUBLISHABLE_KEY" ]; then
    break
  fi

  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 120 ]; then
    echo "Publishable key was not found."
    echo "Run backend seed once and restart storefront, or set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in my-medusa-storefront/.env."
    exit 1
  fi

  sleep 2
done

export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"

echo "Starting storefront development server..."
exec yarn dev
