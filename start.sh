#!/bin/sh

echo "🚀 Starting ViHand Grade..."

# Run Prisma migrations to initialize/update DB
echo "📦 Running database migrations..."

# Try migrate deploy first (for production migrations)
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null && \
  echo "✅ Migrations applied" || \
  (echo "📦 Falling back to db push..." && \
   npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss && \
   echo "✅ Schema pushed successfully" || \
   echo "⚠️  DB setup issue - will retry on first request")

echo "✅ Starting Next.js server on port $PORT..."
exec node server.js
