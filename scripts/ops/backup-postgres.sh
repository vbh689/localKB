#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env.production"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from .env.production.example first."
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

DATA_ROOT_VALUE="${DATA_ROOT:-./app-data}"

if [[ "${DATA_ROOT_VALUE}" = /* ]]; then
  DATA_ROOT_PATH="${DATA_ROOT_VALUE}"
else
  DATA_ROOT_PATH="${ROOT_DIR}/${DATA_ROOT_VALUE}"
fi

BACKUP_DIR="${DATA_ROOT_PATH}/backups/postgres"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/localkb-postgres-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "${BACKUP_FILE}"

echo "Postgres backup created at ${BACKUP_FILE}"
