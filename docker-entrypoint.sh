#!/bin/sh
set -eu

APP_UID="${APP_UID:-1000}"
APP_GID="${APP_GID:-1000}"
UPLOADS_DIR="${UPLOADS_DIR:-/app/public/uploads}"
NEXT_CACHE_DIR="${NEXT_CACHE_DIR:-/app/.next/cache}"

mkdir -p "$UPLOADS_DIR" "$NEXT_CACHE_DIR"
chown -R "$APP_UID:$APP_GID" "$UPLOADS_DIR" "$NEXT_CACHE_DIR"

exec su-exec "$APP_UID:$APP_GID" "$@"
