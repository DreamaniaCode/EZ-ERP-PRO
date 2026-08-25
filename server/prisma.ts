import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL = "postgres://postgres:vYdIRb2wOZldM1oKK2ROwQAPNKxvU4OECFv4rCxCU7kRdS6SoNFpvRGlYvqdBQX3@41.251.253.166:5657/postgres";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
      },
    },
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

