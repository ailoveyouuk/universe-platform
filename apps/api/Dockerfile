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
# `turbo prune` only copies workspace packages (and root package.json /
# lockfile / turbo.json) into out/full — a standalone root file like
# tsconfig.base.json, which every workspace's tsconfig.json extends via a
# relative "../../tsconfig.base.json" path, is NOT part of that workspace
# graph and is silently left out. Without it, apps/api's tsconfig.json
# extends a file that doesn't exist, TypeScript falls back to its defaults
# (esModuleInterop: false among them), and `nest build` fails on
# verifyToken.ts's default imports of jsonwebtoken/jwks-rsa with
# TS1192/TS1259. Confirmed by inspecting a failed Deploy API run's build
# log (2026-09-25) — copied explicitly here from the pruner stage's own,
# un-pruned checkout rather than guessing at a turbo prune flag to fix it
# upstream.
COPY --from=pruner /repo/tsconfig.base.json ./tsconfig.base.json
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npx turbo run build --filter=@universe/api

# ---- Stage 4: minimal runtime image ---------------------------------------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 universe && adduser --system --uid 1001 universe

COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./package.json
# This is an npm workspaces monorepo — `npm install` hoists every
# dependency (including apps/api's own) up to the root /repo/node_modules;
# there is no separate apps/api/node_modules to copy (confirmed via a
# failed Deploy API build: "COPY --from=builder /repo/apps/api/node_modules
# ... not found", 2026-09-25 — another bug that had never surfaced before
# because the build never got this far until the tsconfig.base.json fix
# above). Copy the root node_modules instead; it already contains
# @prisma/.prisma so those no longer need separate COPY lines.
COPY --from=builder /repo/node_modules ./node_modules

USER universe
EXPOSE 4000
ENV API_PORT=4000

# Azure Container Apps sends traffic to this port and expects the process to
# respond on HTTP — no separate healthcheck endpoint yet (tracked as a
# follow-up; add GET /health before this goes to a real environment).
CMD ["node", "dist/main.js"]
