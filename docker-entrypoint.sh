#!/bin/sh
set -e

echo "==> Synchronizing database schema with Prisma..."
npx prisma db push --skip-generate

echo "==> Seeding database..."
npx tsx prisma/seed.mts || echo "Warning: Seed step skipped."

echo "==> Starting Next.js application..."
exec node server.js
