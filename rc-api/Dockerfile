# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for Prisma on Alpine
RUN apk add --no-cache openssl

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema and generated client from builder
# (custom output path: rc-api/generated/prisma — not the default node_modules location)
COPY prisma ./prisma/
COPY --from=builder /app/generated ./generated/
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled output
COPY --from=builder /app/dist ./dist/

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
