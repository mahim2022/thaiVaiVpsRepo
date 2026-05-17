# Redis Distributed Locking Fix

Summary
-------
- Problem: Medusa fell back to the in-memory locking provider under concurrency causing "Failed to acquire lock" errors during checkout.
- Root cause: runtime config used the wrong provider shape (singular `provider`) and the container runtime lacked a Docker-usable `redisUrl` so Medusa defaulted to in-memory locking.
- Resolution: install `@medusajs/locking-redis` and update the runtime config to register the Redis provider in `providers` array and mark it `is_default: true`.

Files changed
-------------
- `medusa-config.js` — updated runtime config used by the container to set `redisUrl` and register `@medusajs/locking-redis` as the default provider.
- `medusa-config.ts` — source config updated to match runtime behavior and provide environment-aware `redisUrl`.
- Additional files (included in the commit): `package.json`, `yarn.lock`, `src/subscribers/order-placed-email.ts`, `src/lib/email/brevo-email.ts`, `my-medusa-storefront/src/modules/checkout/components/payment-button/index.tsx`.

Exact config shape required
-------------------------
In your locking module config use `options.providers` (an array). Each provider entry should look like:

```js
providers: [
  {
    resolve: "@medusajs/locking-redis",
    id: "redis",
    is_default: true,
    options: {
      redisUrl: process.env.REDIS_URL || "redis://redis:6379",
      acquireTimeoutMs: Number(process.env.LOCK_ACQUIRE_TIMEOUT_MS || 10000),
      lockTtlMs: Number(process.env.LOCK_TTL_MS || 30000),
    },
  },
]
```

Commands used
-------------

Install provider (if missing):

```bash
npm install @medusajs/locking-redis --legacy-peer-deps
# or
yarn add @medusajs/locking-redis
```

Install deps and rebuild/start stack:

```bash
yarn install
yarn docker:up
```

Verification checklist
----------------------
1. Confirm container config contains the Redis provider and `redisUrl`:

```bash
docker exec medusa_backend sh -c 'grep -nE "locking-redis|providers|is_default|redisUrl" /server/medusa-config.js'
```

2. Confirm backend logs do **not** show the in-memory fallback messages:

```bash
docker logs --since 5m medusa_backend 2>&1 | rg -i 'in-memory|redisUrl not found|MODULE: locking' || true
```

3. Confirm Redis is actively used
------------------------------
```bash
docker exec medusa_redis redis-cli INFO clients
docker exec medusa_redis redis-cli INFO commandstats | rg -Ei 'eval|set|del|expire|script'
```

4. End-to-end check (best): run `MONITOR` while performing a checkout and watch for lock ops:

```bash
docker exec -i medusa_redis redis-cli MONITOR
# then trigger checkout on the storefront and observe EVAL/SET/DEL on medusa_lock:* keys
```

Rollback
--------
- Revert the commit or restore the previous config and push:

```bash
git revert <commit-hash>
git push origin main
```

Notes & follow-ups
------------------
- Ensure `REDIS_URL` is set in your Docker Compose / deployment environment to avoid relying on hardcoded defaults.
- Add a Redis healthcheck and alerting for lock timeouts in your monitoring system.
- Consider adding an integration test that runs concurrent checkout requests and asserts no lock acquisition failures.

Contact
-------
If you want, I can open a PR with this README, add an integration test, or add a section to the main `README.md` explaining distributed locking and environment variables.
