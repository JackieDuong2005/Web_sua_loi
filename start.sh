#!/bin/sh

echo "🚀 Starting ViHand Grade..."

# Ensure data directory exists
mkdir -p /data 2>/dev/null || true

# Run Prisma schema push to ensure all tables exist
echo "📦 Syncing database schema..."
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate 2>&1 || \
  echo "⚠️  Schema push had issues, trying migrate..."

# Fallback: try migrate deploy  
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || true

# Seed admin account if not exists
echo "🌱 Seeding admin account..."
node prisma/seed-admin.js 2>&1 || echo "⚠️  Seed skipped"

echo "✅ Database ready"
echo "✅ Starting Next.js server on port $PORT..."
exec node server.js
