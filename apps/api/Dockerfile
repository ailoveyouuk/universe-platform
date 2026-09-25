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
# `turbo run build --filter=@universe/api` also builds @universe/auth,
# @universe/db and @universe/types first (turbo.json's build task has
# dependsOn: ["^build"]) now that each of those packages has its own
# "build": "tsc" script — added 2026-09-25 specifically so this step
# produces a real dist/ for them; before that they had no build script at
# all and turbo silently skipped them. Each of their tsconfig.json files
# also now overrides "module"/"moduleResolution" to CommonJS/Node (2026-09-25)
# — without that they inherited tsconfig.base.json's "module": "ESNext"
# (correct for the frontend apps' own bundler, wrong for a package Node
# loads directly), and the runtime failed with ERR_MODULE_NOT_FOUND trying
# to resolve their extensionless ESM-style relative imports (confirmed via
# Container App console log stream, 2026-09-25, one crash-loop after the
# missing-packages-directory fix below still wasn't enough on its own).
RUN npx turbo run build --filter=@universe/api
# Each workspace package's package.json still has "main"/"types" pointing
# at "src/index.ts" — deliberately left that way in the repo, because local
# dev (`nest start --watch` / `npm run dev`) runs under ts-node, which
# registers a process-wide require hook that can load .ts directly; plain
# `node dist/main.js` in the runner stage below has no such hook and would
# fail with MODULE_NOT_FOUND trying to load a .ts file as CommonJS.
# Patching "main"/"types" to the now-built "dist/index.js"/"dist/index.d.ts"
# here, in the builder image only (never the actual repo files), gives
# production a plain-Node-loadable entry point without touching dev at all.
RUN for pkg in auth db types; do \
      npm pkg set main=dist/index.js types=dist/index.d.ts -w packages/$pkg; \
    done

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
# npm workspaces installs @universe/auth, @universe/db and @universe/types
# into node_modules as SYMLINKS pointing at ../packages/<name> — copying
# node_modules alone (above) carries the dangling symlinks but not their
# targets. Without this, the API crashes on boot with "Error: Cannot find
# module '@universe/auth' ... code: 'MODULE_NOT_FOUND'" (confirmed directly
# from Container App application logs, 2026-09-25 — Deploy API's build had
# been succeeding, which only meant `tsc` was happy resolving TYPES for
# these imports; nothing had ever checked that the runtime image could
# actually load them). /repo/packages in this builder stage is already
# pruned to just what @universe/api depends on (same trust as the
# node_modules copy above), and now also carries each package's built
# dist/ plus its main/types pointed at dist (see the builder stage's `npm
# pkg set` step) — copying it here is what makes those symlinks resolve to
# real, loadable JavaScript instead of raw TypeScript source.
COPY --from=builder /repo/packages ./packages

USER universe
EXPOSE 4000
ENV API_PORT=4000

# Azure Container Apps sends traffic to this port and expects the process to
# respond on HTTP — no separate healthcheck endpoint yet (tracked as a
# follow-up; add GET /health before this goes to a real environment).
CMD ["node", "dist/main.js"]
