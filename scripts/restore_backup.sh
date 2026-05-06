#!/usr/bin/env bash
set -euo pipefail

# Restore script to run on the NEW VPS
# Usage: sudo ./restore_backup.sh /opt/medusa-backup-2026-04-30-123456

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script as root or with sudo so it can install dependencies."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup-dir>"
  exit 1
fi

BK_DIR=$1
APP_DIR=${APP_DIR:-/root/thaiVaiEcom2.0}
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-thaivaiecom20}
VOLUMES=("${PROJECT_NAME}_postgres_data" "${PROJECT_NAME}_shared_config" "${PROJECT_NAME}_medusa_static")

echo "Restoring from $BK_DIR to $APP_DIR"

ensure_prerequisites() {
  echo "0) Installing prerequisites if needed"

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "This script currently expects an apt-based Linux system."
    exit 3
  fi

  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release git tar

  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo "Installing Docker Engine and Compose plugin..."
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
    fi
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
  fi

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Installing Node.js and npm..."
    apt-get install -y nodejs npm
  fi

  if ! command -v yarn >/dev/null 2>&1; then
    if command -v corepack >/dev/null 2>&1; then
      echo "Enabling Yarn via Corepack..."
      corepack enable
    else
      echo "Installing Yarn globally via npm..."
      npm install -g yarn
    fi
  fi

  echo "Prerequisites ready:"
  docker --version
  docker compose version
  node --version
  npm --version
  yarn --version
}

echo "1) Ensure backup dir exists"
[ -d "$BK_DIR" ] || { echo "Backup dir not found: $BK_DIR"; exit 2; }

ensure_prerequisites

echo "2) Clone repo at backed up commit (if not present)"
if [ ! -d "$APP_DIR/.git" ]; then
  echo "Cloning repository into $APP_DIR"
  # The repo is expected to be in docker-compose; user must set REPO env if needed
  REPO=${REPO:-}
  if [ -z "$REPO" ]; then
    echo "No REPO set; skipping clone. Ensure code at $APP_DIR matches backed-up commit."
  else
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
    git checkout "$(cat "$BK_DIR/git-commit.txt")" || true
  fi
fi

if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  echo "docker-compose.yml not found in $APP_DIR"
  echo "Copy the repo to $APP_DIR (for example with transfer_backup.sh) or set REPO so clone can run."
  exit 5
fi

echo "3) Restore envs and certs"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/my-medusa-storefront"
cp "$BK_DIR/backend.env" "$APP_DIR/.env" 2>/dev/null || echo "Warning: backend.env missing"
cp "$BK_DIR/storefront.env" "$APP_DIR/my-medusa-storefront/.env" 2>/dev/null || echo "Warning: storefront.env missing"
if [ -f "$BK_DIR/nginx-certs.tar.gz" ]; then
  tar xzf "$BK_DIR/nginx-certs.tar.gz" -C "$APP_DIR"
fi

if [ -f "$APP_DIR/my-medusa-storefront/.env" ]; then
  set -a
  # Export storefront env values so Docker Compose build args can read them.
  . "$APP_DIR/my-medusa-storefront/.env"
  set +a
fi

if [ -z "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is missing from storefront env"
  echo "The storefront production build needs that value as a Docker build arg."
  exit 6
fi

if [ -f "$APP_DIR/.env" ]; then
  if grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "$APP_DIR/.env"; then
    sed -i "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY|" "$APP_DIR/.env"
  else
    printf '\nNEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=%s\n' "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" >> "$APP_DIR/.env"
  fi
fi

echo "4) Recreate Docker volumes and extract data"
for V in "${VOLUMES[@]}"; do
  echo "Creating volume $V"
  docker volume create "$V" || true
  echo "Extracting $V.tar.gz into volume"
  docker run --rm -v "$V":/volume -v "$BK_DIR":/backup alpine sh -c "cd /volume && tar xzf /backup/$V.tar.gz"
done

echo "5) Build and start the stack"
cd "$APP_DIR"
COMPOSE_PROJECT_NAME=$PROJECT_NAME docker compose up -d --build

echo "6) Check logs for medusa_backend startup"
echo "Run: docker logs -f medusa_backend"

echo "Restore complete"
