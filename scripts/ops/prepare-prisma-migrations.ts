import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";

const INIT_MIGRATION = "20260329041753_init";
const BASELINE_TABLES = [
  "User",
  "Session",
  "Category",
  "Tag",
  "Article",
  "Faq",
  "Revision",
  "SearchLog",
];

async function tableExists(client: Client, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS "exists"
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function initMigrationRecorded(client: Client) {
  const hasMigrationsTable = await tableExists(client, "_prisma_migrations");

  if (!hasMigrationsTable) {
    return false;
  }

  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM "_prisma_migrations"
        WHERE migration_name = $1
      ) AS "exists"
    `,
    [INIT_MIGRATION],
  );

  return Boolean(result.rows[0]?.exists);
}

async function hasExistingSchema(client: Client) {
  const checks = await Promise.all(
    BASELINE_TABLES.map((tableName) => tableExists(client, tableName)),
  );

  return checks.some(Boolean);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const [schemaExists, migrationRecorded] = await Promise.all([
      hasExistingSchema(client),
      initMigrationRecorded(client),
    ]);

    if (!schemaExists) {
      console.info("Database is empty. Prisma baseline is not needed.");
      return;
    }

    if (migrationRecorded) {
      console.info(`Migration ${INIT_MIGRATION} is already recorded.`);
      return;
    }

    console.info(
      `Existing schema detected without ${INIT_MIGRATION}. Marking it as applied...`,
    );
  } finally {
    await client.end();
  }

  execFileSync(
    "npx",
    ["prisma", "migrate", "resolve", "--applied", INIT_MIGRATION],
    {
      stdio: "inherit",
    },
  );
}

main().catch((error) => {
  console.error("Failed to prepare Prisma migrations.");
  console.error(error);
  process.exitCode = 1;
});
