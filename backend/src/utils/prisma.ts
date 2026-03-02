import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __aplPrisma: PrismaClient | undefined;
}

export const prisma = global.__aplPrisma ?? new PrismaClient();

// En desarrollo, cachear para evitar múltiples instancias en hot-reload.
if (process.env.NODE_ENV !== 'production') {
  global.__aplPrisma = prisma;
}
