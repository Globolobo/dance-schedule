import "dotenv/config";
import { beforeAll } from "@jest/globals";
import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "../src/client";

const DATABASE_TEST_URL = process.env.DATABASE_TEST_URL;

if (DATABASE_TEST_URL) {
  process.env.DATABASE_URL = DATABASE_TEST_URL;
}

let testPrisma: PrismaClient | null = null;

beforeAll(async () => {
  if (!DATABASE_TEST_URL) {
    throw new Error("DATABASE_TEST_URL must be set in environment");
  }

  process.env.DATABASE_URL = DATABASE_TEST_URL;

  const globalForPrisma = global as unknown as { prisma?: PrismaClient };
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    delete globalForPrisma.prisma;
  }

  testPrisma = createPrismaClient(DATABASE_TEST_URL, "error");

  (global as any).testPrisma = testPrisma;
}, 30000);

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    throw new Error(
      "Test Prisma client not initialized. " +
        "Make sure DATABASE_TEST_URL is set and you're running tests through Jest."
    );
  }
  return testPrisma;
}
