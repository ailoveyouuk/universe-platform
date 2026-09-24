// Imports from the custom generator output (see prisma/schema.prisma's
// header comment) rather than "@prisma/client" — that package name is
// already generated-into by packages/db's own schema, and the two must not
// collide.
import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { insightsPrisma?: PrismaClient };

export const insightsPrisma =
  globalForPrisma.insightsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.insightsPrisma = insightsPrisma;
}

export * from "../generated/client";
export * from "./aggregate-etl";
export * from "./query";
