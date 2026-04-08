#!/bin/bash
set -euo pipefail

ROOT_PATH="${BACKUP_MODULE_ROOT:-/srv/backup-module}"
CONFIG_FILE="$ROOT_PATH/config/backup.config.json"
LOG_FILE="$ROOT_PATH/logs/backup.log"
FILE="$1"

if [ -z "${FILE:-}" ]; then
  echo "Uso: restore.sh <arquivo.sql|arquivo.sql.gz>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Arquivo de backup nao encontrado: $FILE"
  exit 1
fi

read_json() {
  local key="$1"
  node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v='${key}'.split('.').reduce((o,k)=>o?.[k],c);if(v===undefined){process.exit(2)}process.stdout.write(String(v));" "$CONFIG_FILE"
}

DB_HOST="$(read_json database.host)"
DB_PORT="$(read_json database.port)"
DB_NAME="$(read_json database.name)"
DB_USER="$(read_json database.user)"
DB_PASSWORD="$(read_json database.password)"
DOCKER_ENABLED="$(read_json docker.enabled)"
DOCKER_CONTAINER="$(read_json docker.container_name)"

if command -v mysql >/dev/null 2>&1; then
  MYSQL_BIN="mysql"
elif [ -x "/c/xampp/mysql/bin/mysql.exe" ]; then
  MYSQL_BIN="/c/xampp/mysql/bin/mysql.exe"
else
  echo "mysql client nao encontrado. Instale cliente MySQL ou adicione ao PATH."
  exit 1
fi

if [[ "$FILE" == *.gz ]]; then
  INPUT_CMD="gunzip -c \"$FILE\""
else
  INPUT_CMD="cat \"$FILE\""
fi

if [ "$DOCKER_ENABLED" = "true" ]; then
  eval "$INPUT_CMD" | docker exec -i "$DOCKER_CONTAINER" sh -c "mysql -u\"$DB_USER\" -p\"$DB_PASSWORD\" \"$DB_NAME\""
else
  if [ -n "$DB_PASSWORD" ]; then
    eval "$INPUT_CMD" | "$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
  else
    eval "$INPUT_CMD" | "$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
  fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore realizado com sucesso: $(basename "$FILE")" >> "$LOG_FILE"
echo "Restore concluido: $FILE"
