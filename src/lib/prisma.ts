import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { PoolConfig } from "pg";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const DEFAULT_POOL_MAX = 3;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : fallback;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getRuntimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL invalida.");
  }

  if (
    process.env.VERCEL === "1" &&
    parsedUrl.hostname.startsWith("db.") &&
    parsedUrl.hostname.endsWith(".supabase.co")
  ) {
    throw new Error(
      "DATABASE_URL usa conexao direta IPv6 do Supabase. Na Vercel, use Supavisor Transaction pooler.",
    );
  }

  return databaseUrl;
}

function getPoolConfig(): PoolConfig {
  return {
    connectionString: getRuntimeDatabaseUrl(),
    max: parsePositiveInteger(process.env.PGPOOL_MAX, DEFAULT_POOL_MAX),
    connectionTimeoutMillis: parsePositiveInteger(
      process.env.PGCONNECT_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS,
    ),
    idleTimeoutMillis: parsePositiveInteger(
      process.env.PGIDLE_TIMEOUT_MS,
      DEFAULT_IDLE_TIMEOUT_MS,
    ),
  };
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPoolConfig(), {
    onPoolError: (error) => {
      logger.error("prisma.pool.error", {
        error,
      });
    },
  });

  const client = new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("error", (event) => {
    logger.error("prisma.error", {
      message: event.message,
      target: event.target,
    });
  });

  client.$on("warn", (event) => {
    logger.warn("prisma.warn", {
      message: event.message,
      target: event.target,
    });
  });

  return client;
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
