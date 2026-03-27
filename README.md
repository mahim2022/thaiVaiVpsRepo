<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Getting Started
## Safe Disk Cleanup Process

If you run out of disk space during development (especially with Docker/BuildKit), follow these steps for safe cleanup. This will free up space without affecting your Medusa app settings or project files.

### 1. Clean up Docker
Removes unused containers, images, networks, and volumes:

```bash
docker system prune -af --volumes
```

### 2. Clean development caches
Removes old cache files for yarn, npm, VS Code, and general cache:

```bash
rm -rf /root/.yarn/* /root/.npm/* /root/.vscode-server/* /root/.cache/*
```

### Precautions
- Do NOT delete your project directory (e.g., /root/thaiVaiEcom2.0).
- Do NOT remove Docker volumes used for your database/storage if you need persistent data.
- These steps are safe for most development setups and will not affect your Medusa app’s configuration or code.

### For Copilot reuse
You can safely run these commands whenever disk space is low. They are suitable for Medusa development environments and Docker-based projects.

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

### Local startup procedure used in this project

1. Install dependencies for Medusa backend and storefront:

```sh
yarn install
cd my-medusa-storefront
yarn install
cd ..
```

2. Add a placeholder publishable key (`pk_...`) in `my-medusa-storefront/.env`.
3. Start containers:

```sh
yarn run docker:up
```

4. Open Medusa admin, create a new user, and log in.
5. Copy the real publishable key from Medusa admin and replace the placeholder key in `my-medusa-storefront/.env`.
6. Restart containers so storefront picks up the updated environment:

```sh
docker compose down
docker compose up --build
```

7. Access the app through Nginx proxy routing:

- Storefront (HTTPS): `https://localhost`
- Medusa Admin UI (HTTPS): `https://localhost/app`
- Store API (example, HTTPS): `https://localhost/store/regions`

HTTP on `http://localhost` now redirects to HTTPS on `https://localhost`.

### Separate Docker development environment (non-production)

This project now has a dedicated development compose file at `docker-compose.dev.yml`.
It does not modify or replace production settings in `docker-compose.yml`.

Start development stack:

```sh
yarn docker:dev:up
```

Stop development stack:

```sh
yarn docker:dev:down
```

Dev endpoints:

- Storefront: `http://localhost:8000`
- Medusa backend API: `http://localhost:9000`
- Medusa admin dev UI (Vite): `http://localhost:5173`

Notes:

- Backend runs in development mode with bind mounts for live code changes.
- Storefront starts in development mode and auto-loads a publishable key from the local database.

### Cold start behavior (automated)

On a fresh Docker reset (including volumes), startup is now automated:

1. Backend runs migrations.
2. If no regions exist, backend runs `npm run seed` automatically.
3. Backend writes the latest publishable API key to a shared runtime file.
4. Storefront waits for backend health and that shared key before building.

This means after `docker compose down -v` and `docker compose up --build -d`, you should not need manual key copy/paste to get the storefront running.

## Recent implemented changes (March 2026)

The following updates were implemented and verified in this repository:

### Infrastructure and deployment

- Added prebuilt startup workflow script: `scripts/docker-up-prebuilt.sh`.
- Improved container startup order and health-wait behavior for backend/storefront.
- Updated reverse-proxy routing and HTTPS-focused access behavior in Nginx.
- Added resource-oriented Docker/runtime adjustments for more stable startup.

### Backend

- Updated production Docker build flow in `Dockerfile.prod` to use multi-stage structure.
- Added runtime-safe backend config file `medusa-config.js`.
- Updated production startup/bootstrap behavior in `start.prod.sh`.
- Integrated Brevo email infrastructure and event subscriber handlers.

### Storefront

- Updated storefront Docker build for optimized production image behavior.
- Updated `next.config.js` and production startup flow for prebuilt runtime usage.
- Added brand/logo assets and social image generators (`icon`, `opengraph`, `twitter`).
- Updated layout and checkout branding components/icons for the ThaiVai storefront.

### Validation outcome

- Full cold rebuild was executed after Docker cache cleanup.
- Backend and storefront came up successfully.
- Core endpoints responded as expected through the proxy and service ports.

## Pre-Delivery Stress Testing Plan

This project is expected to start with low traffic. The goal of stress testing is to verify reliability, correctness, and recovery of core commerce flows before delivery.

### Scope

- Product creation at scale with images.
- Store browsing and cart operations under load.
- Checkout and order placement under load.
- Shipping and order state progression under load.
- Recovery behavior when a dependency is restarted during active traffic.

### Target test volumes

- Catalog stage A: 500 products, 3 images each.
- Catalog stage B: 1,000 products, 3-5 images each.
- Catalog stage C (optional stretch): 2,000 products, 5 images each.
- Transaction load: 20 concurrent users (15 min), 50 concurrent users (15 min), 100 concurrent users (10 min).

### Execution phases

1. Baseline startup and health
  - Bring stack up from clean state.
  - Validate service health and core endpoint responses.
  - Capture idle resource baseline.

2. Catalog bulk ingestion
  - Load products in batches using workflow-based creation.
  - Validate product count and image availability after each batch.
  - Confirm storefront list/read behavior remains responsive.

3. Transaction stress
  - Run realistic shopper flows in parallel:
    - browse products
    - add to cart
    - checkout/place order
    - verify order retrieval/state
  - Run shipping/fulfillment updates while new orders are being created.

4. Recovery drill
  - During active load, restart one dependency (backend or redis) once.
  - Validate automatic recovery and continued order processing.

5. Stability confirmation
  - Re-run peak scenario twice.
  - Accept only if both runs pass threshold gates.

### Suggested command checklist

Start and baseline:

```sh
docker compose down -v
docker compose up -d
docker compose ps
npm run test:integration:http
docker stats --no-stream
```

Catalog ingestion (existing seed-based baseline):

```sh
npm run seed
```

During stress runs, keep these in separate terminals:

```sh
docker stats
docker logs -f medusa_backend
docker logs -f medusa_postgres
docker logs -f medusa_redis
```

### Pass/fail gates

- Error rate under 1% for critical flows.
- Order success rate at or above 99%.
- No container OOM or restart loop.
- Product and order data remain consistent after load.
- Shipping states progress correctly for sampled orders.
- System recovers after one injected restart and continues processing.

### Delivery timeline

- Day 1: baseline + catalog bulk tests + first transaction run.
- Day 2: recovery drill + peak re-runs + final acceptance summary.

### Evidence to retain

- Resource snapshots from before, during, and after load.
- Error logs from backend, database, and cache.
- Summary report with throughput, latency, error rate, and pass/fail outcome.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Build with AI Agents

### Claude Code Plugin

If you use AI agents like Claude Code, check out the [medusa-dev Claude Code plugin](https://github.com/medusajs/medusa-claude-plugins).

### Other Agents

If you use AI agents other than Claude Code, copy the [skills directory](https://github.com/medusajs/medusa-claude-plugins/tree/main/plugins/medusa-dev/skills) into your agent's relevant `skills` directory.

### MCP Server

You can also add the MCP server `https://docs.medusajs.com/mcp` to your AI agents to answer questions related to Medusa. The `medusa-dev` Claude Code plugin includes this MCP server by default.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Issues

### Git push failed with `remote unpack failed: index-pack failed`

Symptoms: `git push origin main` failed with messages like:

```text
remote: fatal: did not receive expected object <sha>
error: remote unpack failed: index-pack failed
```

Cause: the previous Git object/history graph was inconsistent (including a nested repo/submodule-style state for `my-medusa-storefront`), so GitHub rejected the uploaded pack.

What solved it:

1. Backed up old `.git` metadata and reinitialized a clean repo history.
2. Created a fresh root commit from current project files.
3. Reconfigured `origin` and pushed clean history to `main`.
4. Converted `my-medusa-storefront` from gitlink/submodule-style entry to regular tracked files.
5. Committed and pushed again successfully.

### Storefront cannot reach Medusa backend in Docker (`ECONNREFUSED`)

Symptoms: storefront returns 500 (for example on `/dk`) and logs show `TypeError: fetch failed` with `ECONNREFUSED` from middleware.

Cause: inside Docker, `localhost` points to the current container. If storefront uses `MEDUSA_BACKEND_URL=http://localhost:9000`, it tries to call itself instead of the `medusa` service.

Fix in `docker-compose.yml` for the `storefront` service:

```yaml
env_file:
  - ./my-medusa-storefront/.env
environment:
  - NODE_ENV=production
  - MEDUSA_BACKEND_URL=http://medusa:9000
```

Then recreate containers:

```sh
docker compose down
docker compose up --build
```

### Admin UI chunk 404 after cache clear

Symptoms: the Settings > Users list loads, but clicking Edit fails with a 404 for a Vite chunk like `user-detail-*.js`.

What worked:

1. Hard refresh the page (Ctrl+F5).
2. If needed, rebuild and clear caches in the container:

```sh
docker compose down
docker exec medusa_backend rm -rf node_modules/.vite
docker compose up --build -d
docker exec -it medusa_backend sh -c "rm -rf node_modules/.vite && rm -rf .medusa/server/dist"
```

Notes:

- The `docker exec` command will fail after `docker compose down` because the container is stopped. Run it after the container is back up.
- If `docker exec -it` has TTY issues, rerun without `-it`.

### `medusa_backend` fails with `./start.sh: not found`

Symptoms:

- `medusa_backend` restarts repeatedly.
- Logs show: `/usr/local/bin/docker-entrypoint.sh: exec: line 11: ./start.sh: not found`

Cause:

- On Windows, the project is bind-mounted into the container (`.:/server`).
- The mounted `start.sh` from the host can have CRLF line endings, and running it directly as `./start.sh` may fail in Alpine.

What solved it:

1. Force startup through `sh` in `docker-compose.yml` for the `medusa` service:

```yaml
command: ["sh", "-c", "sed -i 's/\\r$//' /server/start.sh; sh /server/start.sh"]
```

2. Add LF enforcement for shell scripts using `.gitattributes`:

```gitattributes
*.sh text eol=lf
```

3. Rebuild containers:

```sh
docker compose down
docker compose up --build
```

### Nginx proxy routing setup

This project includes an `nginx` service in `docker-compose.yml` as a reverse proxy.

Current host/container mapping:

- `8080:80` (host `8080` -> Nginx container `80`)

Current route behavior from `nginx/default.conf`:

- `/` -> storefront (`http://storefront:8000`)
- `/store/` -> Medusa backend (`http://medusa:9000`)
- `/admin/` -> Medusa backend admin APIs (`http://medusa:9000`)
- `/auth/` -> Medusa backend auth routes (`http://medusa:9000`)
- `/app` and `/app/` -> Medusa Admin UI (`http://medusa:9000/app`)

Verification checklist:

```sh
docker compose ps
```

- `http://localhost:8080` should load storefront.
- `http://localhost:8080/app` should load Admin UI.
- `http://localhost:8080/store/regions` should return data when sent with `x-publishable-api-key`.

### Port 80 bind error on Windows

Symptoms:

- `Error response from daemon: ports are not available ... bind: ... 0.0.0.0:80`

Cause:

- Port `80` is reserved/in use on Windows (often by `System`/HTTP.sys).

Fix used in this project:

- Expose Nginx on host port `8080` instead of `80`:

```yaml
nginx:
  ports:
    - "8080:80"
```

### Brevo transactional email integration runbook

This section records exactly what was implemented, the issues encountered, and the quickest way to validate in future setups.

#### What was implemented

1. Added Brevo environment configuration in `.env.template` and runtime `.env`:
  - `BREVO_ENABLED`
  - `BREVO_API_KEY`
  - `BREVO_SENDER_EMAIL`
  - `BREVO_SENDER_NAME`
  - `BREVO_SANDBOX_MODE`
  - `BREVO_TIMEOUT_MS`
  - `BREVO_TEMPLATE_ID_CUSTOMER_WELCOME`
  - `BREVO_TEMPLATE_ID_ORDER_PLACED`
  - `BREVO_TEMPLATE_ID_ORDER_SHIPPED`
  - `BREVO_TEMPLATE_ID_ORDER_CANCELED`
  - `BREVO_TEMPLATE_ID_AUTH_PASSWORD_RESET`

2. Added a shared Brevo sender utility at `src/lib/email/brevo-email.ts`:
  - Calls Brevo transactional API (`/v3/smtp/email`)
  - Adds timeout and basic event-id dedupe
  - Normalizes recipient extraction to avoid accidentally using sender address

3. Added event subscribers:
  - `customer.created` -> `src/subscribers/customer-welcome-email.ts`
  - `order.placed` -> `src/subscribers/order-placed-email.ts`
  - `shipment.created` -> `src/subscribers/order-shipped-email.ts`
  - `order.canceled` -> `src/subscribers/order-canceled-email.ts`
  - `auth.password_reset` -> `src/subscribers/auth-password-reset-email.ts`

4. Added test tooling:
  - CLI script: `src/scripts/send-brevo-test.ts`
  - npm command: `yarn email:test <recipient@example.com>`

#### Issues faced and how they were solved

1. **Emails were initially sent to sender/test address only**
  - Cause: manual script test used sender inbox as recipient.
  - Fix: run test with a different recipient and validate Brevo logs.

2. **`customer.created` and `order.placed` fired but no email found in event payload**
  - Symptom in logs: `... had no email field`.
  - Cause: event payloads can include only IDs in this runtime.
  - Fix: subscribers now resolve email from Medusa query graph by customer/order ID.

3. **Shipped email did not trigger with `fulfillment.created`**
  - Cause: this setup emits `shipment.created` when creating shipment from admin.
  - Fix: switched shipped subscriber event to `shipment.created`.

4. **`shipment.created` still had no resolvable email**
  - Symptom in logs showed entity id looked like `ful_...`.
  - Cause: event payload id in this flow maps to fulfillment id.
  - Fix: added fulfillment-to-order lookup fallback in shipped subscriber.

5. **Local script failed with database timeout (`KnexTimeoutError`)**
  - Cause: `medusa exec` loaded `.env` values that were not docker-service-safe.
  - Fix: set docker-safe values in `.env`:
    - `DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa-store`
    - `REDIS_URL=redis://redis:6379`

#### Final verified event mapping

- Welcome: `customer.created`
- Order placed: `order.placed`
- Order shipped: `shipment.created`
- Order canceled: `order.canceled`
- Password reset: `auth.password_reset`

#### Fast validation checklist (next time)

1. Set Brevo env variables and real template IDs.
2. Rebuild backend:
  - `docker compose up --build -d medusa`
3. Validate Brevo API from container:
  - `docker exec medusa_backend node -e 'fetch("https://api.brevo.com/v3/account", { headers: { "api-key": process.env.BREVO_API_KEY || "", "accept": "application/json" } }).then(async (r) => { console.log("status=" + r.status); const d = await r.json(); console.log("email=" + (d.email || "n/a")); })'`
4. Send direct test email:
  - `docker exec medusa_backend npx medusa exec ./src/scripts/send-brevo-test.ts your-email@example.com`
5. Trigger business flows and check logs:
  - `docker logs --tail 300 medusa_backend | grep -Ei "Processing (customer.created|order.placed|shipment.created|order.canceled)|\[brevo-email\]"`

### Postgres `password authentication failed` noise after switching to HTTPS

Symptoms:

- Postgres logs show repeated `FATAL: password authentication failed for user "postgres"`.
- Backend still builds and can read/write data.

Cause:

- After exposing services on public ports, internet scanners can hit Postgres (`5432`) and Redis (`6379`) directly.
- Those failed external login attempts appear in Postgres logs, even when the app itself is healthy.

What was enough to fix it:

- Restrict host bindings for Postgres and Redis to localhost in `docker-compose.yml`:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"

redis:
  ports:
    - "127.0.0.1:6379:6379"
```

Then recreate those services:

```sh
docker compose up -d --force-recreate postgres redis
```

Result:

- External scan traffic can no longer reach Postgres/Redis from the internet.
- The auth-failure spam stops, and no backend DB credential change is required for this case.

### PowerShell `curl` header syntax on Windows

On PowerShell, `curl` maps to `Invoke-WebRequest`, so Linux-style `-H` usage may fail.

Use either:

```powershell
$headers = @{"x-publishable-api-key"="pk_..."}
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/store/regions" -Headers $headers
```

Or use the real curl binary:

```powershell
curl.exe -i -H "x-publishable-api-key: pk_..." http://localhost:8080/store/regions
```

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)




Inside the vps need to run medusa in production, commenting out the volumes in docker-compose.yml for medusa and also updating the dockerignore file


present in this volume
cd /mnt/volume_nyc3_01/thaiVaiEcom2.0
docker-compose up -d

---

## VPS Migration: Backup and Restore

This section documents the full step-by-step process for backing up this Medusa stack from one VPS and restoring it on another, including all persistent data, environment files, and certificates.

### Overview

The following pieces of state must be transferred:

| Item | What it contains |
|---|---|
| `thaivaiecom20_postgres_data` Docker volume | All database tables, products, orders, users |
| `thaivaiecom20_medusa_static` Docker volume | Built static/admin assets |
| `thaivaiecom20_shared_config` Docker volume | Shared runtime config written by backend at startup |
| `.env` (backend) | Database URL, Redis URL, JWT secrets, API keys |
| `my-medusa-storefront/.env` | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, backend URL, etc. |
| `nginx/certs/` | TLS certificates used by Nginx |
| Git commit SHA | Exact code state to reproduce the build |

> **Note:** The Docker volume name prefix (`thaivaiecom20`) comes from the Compose project name, which is derived from the folder name `thaiVaiEcom2.0`. If you clone into a differently named folder, use `COMPOSE_PROJECT_NAME=thaivaiecom20` before all `docker compose` commands on the new server.

---

### Part 1 — Create the Backup (Source VPS)

Run all commands on the **current/source VPS**.

#### Step 1: Check available disk space

```sh
df -h /
docker system df
```

Ensure free space on `/` is at least 3× the sum of your volume sizes. Volume sizes are shown under `Local Volumes space usage` in `docker system df -v`.

#### Step 2: Create a timestamped backup directory

```sh
export TS=$(date +%F-%H%M%S)
export BK_DIR="/root/medusa-backup-$TS"
mkdir -p "$BK_DIR"
echo "Backup directory: $BK_DIR"
```

#### Step 3: Stop app containers for a consistent snapshot

```sh
cd /root/thaiVaiEcom2.0
docker compose stop medusa storefront
```

Postgres and Redis stay running so the volume data is in a clean, committed state.

#### Step 4: Archive each Docker volume

```sh
for V in thaivaiecom20_postgres_data thaivaiecom20_shared_config thaivaiecom20_medusa_static; do
  echo "Backing up $V ..."
  docker run --rm \
    -v "$V":/volume \
    -v "$BK_DIR":/backup \
    alpine sh -c "cd /volume && tar czf /backup/$V.tar.gz ."
done
```

#### Step 5: Save environment files, certs, and metadata

```sh
cp .env "$BK_DIR/backend.env"
cp my-medusa-storefront/.env "$BK_DIR/storefront.env"
cp docker-compose.yml "$BK_DIR/"
tar czf "$BK_DIR/nginx-certs.tar.gz" nginx/certs
git rev-parse HEAD > "$BK_DIR/git-commit.txt"
```

#### Step 6: Restart the source stack

```sh
docker compose start medusa storefront
```

#### Step 7: Verify backup contents

```sh
ls -lh "$BK_DIR"
du -sh "$BK_DIR"
```

Expected output includes all three `.tar.gz` volume archives plus `backend.env`, `storefront.env`, `docker-compose.yml`, `nginx-certs.tar.gz`, and `git-commit.txt`. Total size is typically 10–15 MB.

---

### Part 2 — Copy the Backup to the New VPS

Run on the **source VPS**.

#### Option A: rsync (recommended — resumable, shows progress)

```sh
rsync -avz --progress \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$BK_DIR/" \
  root@NEW_VPS_IP:/opt/$(basename "$BK_DIR")/
```

#### Option B: scp

```sh
scp -r "$BK_DIR" root@NEW_VPS_IP:/opt/
```

#### Option C: custom SSH port (e.g. 2222)

```sh
rsync -avz --progress \
  -e "ssh -p 2222 -o StrictHostKeyChecking=accept-new" \
  "$BK_DIR/" \
  root@NEW_VPS_IP:/opt/$(basename "$BK_DIR")/
```

#### Verify the transfer

```sh
ssh root@NEW_VPS_IP "ls -lh /opt/$(basename "$BK_DIR")"
```

---

### Part 3 — Prepare the New VPS

SSH into the **new VPS** and run the following commands.

#### Step 1: Check resources

```sh
df -h /      # Need ~25 GB free for build + volumes
free -h      # Minimum 2 GB RAM; 4 GB recommended for Node build
```

> **Important:** Building the Medusa Docker image requires at least 2 GB of available RAM for Node.js. On a 1 GB VPS the build will fail with `JavaScript heap out of memory`. Use a 2 GB+ plan, or resize temporarily.

#### Step 2: Add swap (strongly recommended for 2 GB VPS)

```sh
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

Verify:

```sh
free -h
swapon --show
```

#### Step 3: Install Docker Engine and Docker Compose plugin

```sh
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

Verify:

```sh
docker --version
docker compose version
systemctl is-active docker
```

#### Step 4: Configure GitHub SSH access (for private repo clone)

If the new VPS does not already have a GitHub-authorized SSH key, either:

**Option A — Copy the existing key from source VPS:**

```sh
# Run on source VPS:
scp /root/.ssh/id_ed25519 /root/.ssh/id_ed25519.pub root@NEW_VPS_IP:/root/.ssh/
# Run on new VPS:
chmod 600 /root/.ssh/id_ed25519
chmod 644 /root/.ssh/id_ed25519.pub
```

**Option B — Generate a new key on the new VPS and add it to GitHub:**

```sh
ssh-keygen -t ed25519 -C "new-vps" -f /root/.ssh/id_ed25519 -N ""
cat /root/.ssh/id_ed25519.pub
# Add the printed key to: https://github.com/settings/keys
```

Then trust GitHub's host key:

```sh
ssh-keyscan -H github.com >> /root/.ssh/known_hosts
chmod 600 /root/.ssh/known_hosts
```

Verify access:

```sh
ssh -T git@github.com
# Expected: Hi <username>! You've successfully authenticated...
```

---

### Part 4 — Restore on the New VPS

Run all commands on the **new VPS**. Replace `medusa-backup-2026-03-14-105418` with your actual backup folder name.

```sh
export BK_DIR=/opt/medusa-backup-2026-03-14-105418
export APP_DIR=/root/thaiVaiEcom2.0
export REPO=git@github.com:mahim2022/thaiVaiVpsRepo.git
export COMMIT=$(cat "$BK_DIR/git-commit.txt")
```

#### Step 1: Clone the repository at the exact backed-up commit

```sh
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"
git checkout "$COMMIT"
```

#### Step 2: Restore environment files and TLS certificates

```sh
cp "$BK_DIR/backend.env"    "$APP_DIR/.env"
cp "$BK_DIR/storefront.env" "$APP_DIR/my-medusa-storefront/.env"
tar xzf "$BK_DIR/nginx-certs.tar.gz" -C "$APP_DIR"
```

#### Step 3: Recreate Docker volumes and restore data

```sh
for V in thaivaiecom20_postgres_data thaivaiecom20_shared_config thaivaiecom20_medusa_static; do
  docker volume create "$V"
  docker run --rm \
    -v "$V":/volume \
    -v "$BK_DIR":/backup \
    alpine sh -c "cd /volume && tar xzf /backup/$V.tar.gz"
done
```

> The Docker Compose warning `volume "..." already exists but was not created by Docker Compose` is harmless — the volumes were pre-created manually above and Compose will adopt them.

#### Step 4: Build and start the stack

```sh
cd "$APP_DIR"
COMPOSE_PROJECT_NAME=thaivaiecom20 docker compose up -d --build
```

The build step compiles the Medusa backend and Next.js storefront inside Docker — this can take 3–5 minutes on first run.

#### Step 5: Watch startup logs

```sh
docker logs -f medusa_backend
```

Wait until you see:

```
Server started on port 9000
```

Then check the storefront:

```sh
docker logs -f medusa_storefront
```

Wait until the Next.js server is ready.

---

### Part 5 — Validate the Restored Stack

Run on the **new VPS**.

#### Container status

```sh
cd /root/thaiVaiEcom2.0
COMPOSE_PROJECT_NAME=thaivaiecom20 docker compose ps
```

All five services should show `Up`:

```
medusa_backend      Up    0.0.0.0:9000->9000/tcp
medusa_storefront   Up    0.0.0.0:8000->8000/tcp
medusa_nginx        Up    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
medusa_postgres     Up    127.0.0.1:5432->5432/tcp
medusa_redis        Up    127.0.0.1:6379->6379/tcp
```

#### Backend health check

```sh
curl -i http://127.0.0.1:9000/health
# Expected: HTTP/1.1 200 OK ... OK
```

#### Storefront check

```sh
curl -i http://127.0.0.1:8000/
# Expected: HTTP/1.1 307 Temporary Redirect ... /dk  (locale redirect = healthy)
```

#### Nginx HTTPS check

```sh
curl -k -i https://127.0.0.1/
# Expected: HTTP/1.1 307 ... /dk  (proxied through nginx to storefront)
```

---

### Part 6 — Post-Restore Checklist

- [ ] Point your domain DNS A record to the new VPS IP.
- [ ] Replace self-signed TLS certs in `nginx/certs/` with a real certificate (e.g. Let's Encrypt via Certbot).
- [ ] Log into Medusa Admin at `https://<your-domain>/app` and verify products, orders, and users are intact.
- [ ] Verify the storefront at `https://<your-domain>` loads correctly.
- [ ] Update any third-party webhook URLs (Stripe, etc.) that point to the old VPS IP.
- [ ] Decommission the old VPS only after confirming everything is working.

---

### Troubleshooting

#### Build fails with `JavaScript heap out of memory`

The Node.js build inside Docker ran out of memory. The minimum for the Medusa build is ~2 GB RAM available at build time.

Fix options:
- Resize VPS to at least 2 GB RAM (4 GB recommended).
- Ensure the 2 GB swap file is active (`swapon --show`).

#### `volume "..." already exists but was not created by Docker Compose`

This warning is expected and safe. It appears because the volumes were manually created before `docker compose up`. Compose adopts and uses them normally.

#### Storefront shows 502 Bad Gateway immediately after startup

The backend is still initialising (running migrations and the startup build). Wait 60–90 seconds and retry. Monitor progress with:

```sh
docker logs -f medusa_backend
```

#### `Permission denied (publickey)` when pushing/cloning GitHub repo

The SSH key on the new VPS is not added to GitHub. Follow **Part 3 Step 4** above. After adding the key to GitHub, re-test with `ssh -T git@github.com`.

#### Postgres auth failures in logs after migration

If Postgres logs show repeated `password authentication failed`, external internet scanners are probing port `5432`. This is blocked at the application level by the `127.0.0.1:5432:5432` binding in `docker-compose.yml` (only localhost can reach Postgres). Verify with:

```sh
ss -ltn | grep 5432
# Should show: 127.0.0.1:5432  not  0.0.0.0:5432
```

#### Admin login fails with "fetch failed" after restore

**Cause:** The `.env` backed up from the source VPS has the **old VPS IP** hardcoded in several variables. The Medusa admin UI is compiled with `MEDUSA_BACKEND_URL` baked in at build time — so if this still points to the old server, every login request goes to the wrong host.

Affected variables in `.env`:
- `MEDUSA_BACKEND_URL`
- `MEDUSA_FILE_BACKEND_URL`
- `ADMIN_CORS`
- `AUTH_CORS`
- `STORE_CORS`

**Fix:** After restore, before or after starting the stack, replace the old IP with the new one and rebuild the medusa container:

```sh
# Replace old IP with new IP in .env
sed -i "s/OLD_VPS_IP/NEW_VPS_IP/g" /root/thaiVaiEcom2.0/.env

# Verify the changes
grep -E "CORS|BACKEND_URL" /root/thaiVaiEcom2.0/.env

# Rebuild and restart only the medusa container (faster than full rebuild)
cd /root/thaiVaiEcom2.0
COMPOSE_PROJECT_NAME=thaivaiecom20 docker compose up -d --build medusa
```

Wait ~90 seconds for the container to finish its internal build and start, then retry the admin login at `https://NEW_VPS_IP/app`.

**Finding the admin email:** The admin user email may differ from what you expect. Check the database directly:

```sh
docker exec medusa_postgres psql -U postgres -d medusa-store -c 'SELECT id, email FROM "user";'
```

**Resetting the admin password** (if forgotten):

```sh
# Install bcryptjs temporarily and generate a hash
docker exec medusa_backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('newpassword123', 10).then(h => console.log(h));
"
# Then update the hash in the DB
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "UPDATE auth_identity SET provider_metadata = jsonb_set(provider_metadata, '{password}', '\"HASH_HERE\"') WHERE id IN (SELECT auth_identity_id FROM auth_identity ai JOIN \"user\" u ON u.id = ai.app_metadata->>'user_id' WHERE u.email = 'admin@example.com');"
```
