#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

UPLOADS_DIR="${DATA_ROOT_PATH}/uploads"
BACKUP_DIR="${DATA_ROOT_PATH}/backups/uploads"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/localkb-uploads-${TIMESTAMP}.tar.gz"

mkdir -p "${UPLOADS_DIR}" "${BACKUP_DIR}"

tar -C "${UPLOADS_DIR}" -czf "${BACKUP_FILE}" .

echo "Uploads backup created at ${BACKUP_FILE}"
