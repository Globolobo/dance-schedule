import { PrismaClient } from "@prisma/client";
import { Pool, PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const createPrismaClient = (
  connectionString?: string,
  logLevel?: "query" | "error",
  poolConfig?: Omit<PoolConfig, "connectionString">
) => {
  const dbUrl = connectionString || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("DATABASE_URL or connectionString must be provided");
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ...poolConfig,
  });

  const adapter = new PrismaPg(pool);

  const isDevelopment = process.env.NODE_ENV === "development";
  const log = logLevel ?? (isDevelopment ? "query" : "error");

  return new PrismaClient({
    adapter,
    log: [log],
  });
};

// Use a getter to ensure we always get the current prisma client
// This is important for tests where the client may be recreated
const getPrisma = () => {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
};

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  },
});
