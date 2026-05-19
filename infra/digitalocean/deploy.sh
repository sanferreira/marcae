#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/digitalocean/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/infra/digitalocean/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  echo "Crie com: cp infra/digitalocean/.env.example infra/digitalocean/.env"
  exit 1
fi

cd "$ROOT_DIR"

export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile tools run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
