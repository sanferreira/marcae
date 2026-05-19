#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/digitalocean/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/infra/digitalocean/.env"
BACKUP_DIR="$ROOT_DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$ROOT_DIR"

set -a
. "$ENV_FILE"
set +a

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/marcae-$STAMP.sql"

echo "Backup criado em $BACKUP_DIR/marcae-$STAMP.sql"
