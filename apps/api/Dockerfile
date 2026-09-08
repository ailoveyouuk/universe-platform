# Multi-stage build for the Universe API service, designed for Azure
# Container Apps. Uses `turbo prune` so the final image only carries the
# packages apps/api actually depends on (@universe/db, @universe/types,
# @universe/auth) — not the whole monorepo.

# ---- Stage 1: prune the monorepo down to just what apps/api needs --------
FROM node:20-bullseye-slim AS pruner
WORKDIR /repo
RUN npm install -g turbo@^2.1.3
COPY . .
RUN turbo prune @universe/api --docker

# ---- Stage 2: install dependencies for the pruned workspace --------------
FROM node:20-bullseye-slim AS installer
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN npm install

# ---- Stage 3: bring in full source, build, and generate the Prisma client -
FROM node:20-bullseye-slim AS builder
WORKDIR /repo
COPY --from=installer /repo/ .
COPY --from=pruner /repo/out/full/ .
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npx turbo run build --filter=@universe/api

# ---- Stage 4: minimal runtime image ---------------------------------------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 universe && adduser --system --uid 1001 universe

COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/node_modules ./node_modules
COPY --from=builder /repo/apps/api/package.json ./package.json
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma ./node_modules/@prisma

USER universe
EXPOSE 4000
ENV API_PORT=4000

# Azure Container Apps sends traffic to this port and expects the process to
# respond on HTTP — no separate healthcheck endpoint yet (tracked as a
# follow-up; add GET /health before this goes to a real environment).
CMD ["node", "dist/main.js"]
