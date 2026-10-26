import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across hot reloads in dev so we don't
// exhaust Azure SQL connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Interactive transactions default to 5 s. Bulk jobs (demo data load) run against a small
    // serverless tier and need longer; set PRISMA_TX_TIMEOUT_MS for them. Normal runs are unchanged.
    transactionOptions: { maxWait: 10000, timeout: Number(process.env.PRISMA_TX_TIMEOUT_MS ?? 5000) },
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export * from "./organizations";
export * from "./enums";
export * from "./tenant-context";
export * from "./logistics-metrics";
export * from "./regulatory-watch/types";
export * from "./regulatory-watch/matching";
export * from "./regulatory-watch/connectors";
export * from "./regulatory-watch/run";
export * from "./regulatory-watch/export-restrictions";
export * from "./regulatory-watch/restriction-lifted";
export * from "./pharma-reference/parse";
export * from "./pharma-reference/run";
export * from "./wait-for-database";
