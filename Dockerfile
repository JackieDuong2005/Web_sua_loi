# ==================== Stage 1: Dependencies ====================
FROM node:20-slim AS deps

WORKDIR /app

# Install system deps needed for better-sqlite3 native build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# ==================== Stage 2: Build ====================
FROM node:20-slim AS builder

WORKDIR /app

# System deps for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data

# Set DATABASE_URL to persistent path inside container
ENV DATABASE_URL="file:/data/vihand.db"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# ==================== Stage 3: Runner ====================
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL will be set via HF Space secrets or default below
ENV DATABASE_URL="file:/data/vihand.db"

# Create non-root user (required by HF Spaces)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create data directory with proper permissions for SQLite
RUN mkdir -p /data && chown -R nextjs:nodejs /data

# Copy built assets (standalone first, then public on top to avoid overwrite)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema & migrations for runtime migrate
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy startup script
COPY --chown=nextjs:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

# HF Spaces uses port 7860
EXPOSE 7860
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
