// src/lib/prisma.ts
//
// Single shared Prisma Client instance. In Next.js dev mode, modules can be
// re-evaluated on every hot reload — without the global-caching trick below,
// each reload would open a fresh SQLite connection and eventually exhaust
// the connection pool. Stashing the client on `globalThis` survives reloads.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
