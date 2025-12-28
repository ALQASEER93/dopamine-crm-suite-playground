#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.prod"
BACKUP_DIR="${ROOT_DIR}/_runs/db_backups"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "${ENV_FILE}"
  set +a
fi

mkdir -p "${BACKUP_DIR}"
TS="$(date +%Y%m%d_%H%M%S)"

docker compose -f "${ROOT_DIR}/docker-compose.prod.yml" --env-file "${ENV_FILE}" \
  exec -T db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${BACKUP_DIR}/backup_${TS}.sql"
