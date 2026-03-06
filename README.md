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

- Storefront: `http://localhost:8080`
- Medusa Admin UI: `http://localhost:8080/app`
- Store API (example): `http://localhost:8080/store/regions`

### Cold start behavior (automated)

On a fresh Docker reset (including volumes), startup is now automated:

1. Backend runs migrations.
2. If no regions exist, backend runs `npm run seed` automatically.
3. Backend writes the latest publishable API key to a shared runtime file.
4. Storefront waits for backend health and that shared key before building.

This means after `docker compose down -v` and `docker compose up --build -d`, you should not need manual key copy/paste to get the storefront running.

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