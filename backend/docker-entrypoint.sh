#!/bin/sh
set -e

echo "[entrypoint] NODE_ENV=${NODE_ENV}"

# Optionally run Prisma migrations (safe, non-destructive). Disabled by default.
if [ "${RUN_DB_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Applying Prisma migrations..."
  npx prisma migrate deploy
else
  echo "[entrypoint] Skipping Prisma migrations (set RUN_DB_MIGRATIONS=true to enable)"
fi

# Optionally run Prisma seed. Disabled by default for production.
if [ "${RUN_DB_SEED}" = "true" ]; then
  echo "[entrypoint] Running Prisma seed..."
  npx prisma db seed
else
  echo "[entrypoint] Skipping Prisma seed (set RUN_DB_SEED=true to enable)"
fi

echo "[entrypoint] Starting NestJS application..."
exec node dist/main