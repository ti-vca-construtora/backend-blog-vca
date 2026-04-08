#!/bin/bash
set -euo pipefail

ROOT_PATH="${BACKUP_MODULE_ROOT:-/srv/backup-module}"
CONFIG_FILE="$ROOT_PATH/config/backup.config.json"
LOG_FILE="$ROOT_PATH/logs/backup.log"

read_json() {
  local key="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r ".${key}" "$CONFIG_FILE"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$CONFIG_FILE" "$key" << 'PY'
import json
import sys

config_path = sys.argv[1]
key = sys.argv[2]

with open(config_path, 'r', encoding='utf-8') as fh:
    data = json.load(fh)

value = data
for part in key.split('.'):
    value = value.get(part) if isinstance(value, dict) else None

if value is None:
    sys.exit(2)

if isinstance(value, bool):
    print('true' if value else 'false')
else:
    print(value)
PY
    return
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v='${key}'.split('.').reduce((o,k)=>o?.[k],c);if(v===undefined){process.exit(2)}process.stdout.write(String(v));" "$CONFIG_FILE"
    return
  fi

  echo "Nenhum leitor JSON encontrado (jq, python3 ou node)." >&2
  exit 1
}

DB_HOST="$(read_json database.host)"
DB_PORT="$(read_json database.port)"
DB_NAME="$(read_json database.name)"
DB_USER="$(read_json database.user)"
DB_PASSWORD="$(read_json database.password)"
BACKUP_PATH="$(read_json backup.path)"
RETENTION_DAYS="$(read_json backup.retention_days)"
COMPRESSION="$(read_json backup.compression)"
DOCKER_ENABLED="$(read_json docker.enabled)"
DOCKER_CONTAINER="$(read_json docker.container_name)"

if command -v mysqldump >/dev/null 2>&1; then
  MYSQLDUMP_BIN="mysqldump"
elif [ -x "/c/xampp/mysql/bin/mysqldump.exe" ]; then
  MYSQLDUMP_BIN="/c/xampp/mysql/bin/mysqldump.exe"
else
  echo "mysqldump nao encontrado. Instale cliente MySQL ou adicione ao PATH."
  exit 1
fi

mkdir -p "$BACKUP_PATH" "$ROOT_PATH/logs"

DATA=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$BACKUP_PATH/backup_$DATA.sql"

if [ "$DOCKER_ENABLED" = "true" ]; then
  docker exec "$DOCKER_CONTAINER" sh -c "mysqldump -u\"$DB_USER\" -p\"$DB_PASSWORD\" \"$DB_NAME\"" > "$FILE"
else
  if [ -n "$DB_PASSWORD" ]; then
    "$MYSQLDUMP_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$FILE"
  else
    "$MYSQLDUMP_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" > "$FILE"
  fi
fi

if [ "$COMPRESSION" = "true" ]; then
  gzip -f "$FILE"
  FILE="$FILE.gz"
fi

find "$BACKUP_PATH" -type f -name "backup_*.sql*" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup realizado com sucesso: $(basename "$FILE")" >> "$LOG_FILE"
echo "Backup concluido: $FILE"
