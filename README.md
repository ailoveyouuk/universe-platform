# Renewables Connect Platform

Multi-app monorepo for the Renewables Connect learning and talent platform.

## Apps

| App | Port | Description |
|-----|------|-------------|
| `rc-v2-app` (rc-learner) | 3000 | Learner-facing platform |
| `rc-institution` | 3001 | Education institution dashboard |
| `rc-employer` | 3002 | Employer talent discovery |
| `rc-admin` | 3003 | RC internal command centre |
| `rc-api` *(coming next)* | 4000 | Shared backend API (Node.js + Fastify) |

## Packages

| Package | Description |
|---------|-------------|
| `@rc/types` | Shared TypeScript interfaces |
| `@rc/db` | Prisma schema + client (PostgreSQL) |
| `@rc/api-client` | Typed fetch utilities |

## Getting started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# → Fill in DATABASE_URL and Azure AD values

# Generate Prisma client
cd packages/db && npm run db:generate

# Run all apps in dev
npm run dev
```

## Azure infrastructure

See `docs/azure-setup.md` for Azure resource provisioning guide.

## Database

Schema lives in `packages/db/prisma/schema.prisma`.
Run migrations: `cd packages/db && npm run db:migrate`
