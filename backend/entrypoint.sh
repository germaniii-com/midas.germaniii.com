#!/bin/sh
set -e

check_var() {
  eval "value=\$$1"
  if [ -z "$value" ]; then
    echo "Error: $1 environment variable is not set."
    exit 1
  fi
  echo "  $1 = $value"
}

echo "Validating required environment variables..."

check_var NODE_ENV
check_var PORT
check_var DATABASE_DIR

check_var STORAGE_MODE
if [ "$STORAGE_MODE" = "s3" ]; then
  check_var MINIO_ENDPOINT
  check_var MINIO_PORT
  check_var MINIO_ACCESS_KEY
  check_var MINIO_SECRET_KEY
  check_var MINIO_BUCKET
  check_var MINIO_USE_SSL
fi

echo "All required variables are set."

if [ -d "$DATABASE_DIR" ]; then
  chown -R 1000:1000 "$DATABASE_DIR"
fi

exec "$@"
