import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across hot reloads in dev so we don't
// exhaust Azure SQL connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export * from "./organizations";
export * from "./enums";
