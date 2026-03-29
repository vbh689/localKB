#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/uploads-backup.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

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

mkdir -p "${UPLOADS_DIR}"
rm -rf "${UPLOADS_DIR:?}"/*
tar -C "${UPLOADS_DIR}" -xzf "${BACKUP_FILE}"

echo "Uploads restore completed from ${BACKUP_FILE}"
