#!/bin/sh
set -e

echo "🚀 Starting ViHand Grade..."

# Run Prisma migrations to initialize/update DB
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || \
  npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>/dev/null || \
  echo "⚠️  Migration skipped (DB may already be initialized)"

echo "✅ Starting Next.js server on port $PORT..."
exec node server.js
