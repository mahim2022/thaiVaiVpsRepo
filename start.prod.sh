#!/bin/sh

set -e

# Reset shared readiness artifacts on each boot to avoid stale state.
rm -f /shared/publishable_key.env /shared/medusa_bootstrap.ready

echo "Running database migrations..."
npx medusa db:migrate

echo "Checking seed state..."
REGION_COUNT=$(node -e "const { Client } = require('pg'); (async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); const result = await client.query('select count(*)::int as count from region'); await client.end(); console.log(result.rows[0].count || 0); })().catch(() => { console.log(0); process.exit(0); });")

if [ "$REGION_COUNT" -eq 0 ]; then
	echo "No regions found. Seeding demo data..."
	npm run seed
else
	echo "Seed data already present. Skipping seed."
fi

echo "Writing publishable API key for storefront..."
mkdir -p /shared
ATTEMPTS=0
PUBLISHABLE_KEY=""
until [ -n "$PUBLISHABLE_KEY" ]; do
	PUBLISHABLE_KEY=$(node -e "const { Client } = require('pg'); (async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); const result = await client.query(\"select token from api_key where type = 'publishable' order by created_at desc limit 1\"); await client.end(); console.log(result.rows[0]?.token || ''); })().catch(() => { console.log(''); process.exit(0); });")
	if [ -n "$PUBLISHABLE_KEY" ]; then
		break
	fi

	ATTEMPTS=$((ATTEMPTS + 1))
	if [ "$ATTEMPTS" -ge 120 ]; then
		echo "Publishable key was not found in time."
		exit 1
	fi

	echo "Publishable key not ready yet, retrying..."
	sleep 2
done

printf 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=%s\n' "$PUBLISHABLE_KEY" > /shared/publishable_key.env

echo "Preparing admin static assets..."
mkdir -p /server/public/admin
cp -R /server/.medusa/server/public/admin/. /server/public/admin/

echo "Backend bootstrap complete."
touch /shared/medusa_bootstrap.ready

echo "Starting Medusa production server..."
npm run start