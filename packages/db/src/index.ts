import { PrismaClient } from '../generated/client';

export * from '../generated/client';

declare global {
  // eslint-disable-next-line no-var
  var __lmsPrisma: PrismaClient | undefined;
}

/** Single shared client — avoids exhausting the pool on dev hot-reload. */
export const prisma: PrismaClient =
  global.__lmsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') global.__lmsPrisma = prisma;
