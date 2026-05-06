#!/usr/bin/env bash
set -euo pipefail

# Transfer a backup directory and the full repo tree to a new VPS using rsync.
# Usage: ./transfer_backup.sh /path/to/backup root@NEW_VPS_IP:/opt/medusa-backup-name [root@NEW_VPS_IP:/root/thaiVaiEcom2.0]

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <local-backup-dir> <remote-backup-destination> [remote-app-dir]"
  echo "Example: $0 /root/medusa-backup-2026-04-30-123456 root@1.2.3.4:/opt/medusa-backup-2026-04-30-123456 root@1.2.3.4:/root/thaiVaiEcom2.0"
  exit 1
fi

BACKUP_DIR=$1
REMOTE_BACKUP_DEST=$2

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Local backup directory not found: $BACKUP_DIR"
  exit 2
fi

if [[ "$REMOTE_BACKUP_DEST" != *:* ]]; then
  echo "Remote backup destination must be in user@host:/path format"
  exit 3
fi

REMOTE_USERHOST=${REMOTE_BACKUP_DEST%%:*}
REMOTE_APP_DIR=${3:-${REMOTE_USERHOST}:/root/thaiVaiEcom2.0}

if [[ "$REMOTE_APP_DIR" != *:* ]]; then
  echo "Remote app destination must be in user@host:/path format"
  exit 4
fi

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SSH_TARGET=$REMOTE_USERHOST
REMOTE_BACKUP_PATH=${REMOTE_BACKUP_DEST#*:}
REMOTE_APP_PATH=${REMOTE_APP_DIR#*:}

echo "Transferring backup directory: $BACKUP_DIR -> $REMOTE_BACKUP_DEST"
echo "Transferring repo tree:        $REPO_ROOT -> $REMOTE_APP_DIR"

ssh -o StrictHostKeyChecking=accept-new "$SSH_TARGET" "mkdir -p '$REMOTE_BACKUP_PATH' '$REMOTE_APP_PATH'"

rsync -avz --progress -e "ssh -o StrictHostKeyChecking=accept-new" "$BACKUP_DIR/" "$REMOTE_BACKUP_DEST"
rsync -avz --progress -e "ssh -o StrictHostKeyChecking=accept-new" "$REPO_ROOT/" "$REMOTE_APP_DIR"

echo "Transfer complete"
