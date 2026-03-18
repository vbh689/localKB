import { Prisma } from "generated/prisma/client";
import { db } from "@/lib/db";
import { searchClient } from "@/lib/search";

export type HealthCheckStatus = "available" | "degraded" | "down";

export type HealthCheckReport = {
  app: {
    status: HealthCheckStatus;
  };
  db: {
    latencyMs: number;
    status: HealthCheckStatus;
  };
  search: {
    latencyMs: number;
    status: HealthCheckStatus;
  };
  status: "ok" | "degraded";
  timestamp: string;
};

async function checkDatabaseHealth() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw(Prisma.sql`SELECT 1`);
    return {
      latencyMs: Date.now() - startedAt,
      status: "available" as const,
    };
  } catch {
    return {
      latencyMs: Date.now() - startedAt,
      status: "down" as const,
    };
  }
}

async function checkSearchHealth() {
  const startedAt = Date.now();

  try {
    const health = await searchClient.health();

    return {
      latencyMs: Date.now() - startedAt,
      status: health.status === "available" ? ("available" as const) : ("degraded" as const),
    };
  } catch {
    return {
      latencyMs: Date.now() - startedAt,
      status: "down" as const,
    };
  }
}

export async function checkSystemHealth(): Promise<HealthCheckReport> {
  const [dbHealth, searchHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkSearchHealth(),
  ]);

  const status =
    dbHealth.status === "available" && searchHealth.status === "available"
      ? "ok"
      : "degraded";

  return {
    app: {
      status: "available",
    },
    db: dbHealth,
    search: searchHealth,
    status,
    timestamp: new Date().toISOString(),
  };
}
