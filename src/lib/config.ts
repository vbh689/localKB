import { z } from "zod";

const configSchema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .default("postgresql://localkb:localkb@localhost:5432/localkb?schema=public"),
  MEILISEARCH_MASTER_KEY: z
    .string()
    .default("localkb-master-key"),
  MEILISEARCH_URL: z.url().default("http://localhost:7702"),
  SESSION_COOKIE_NAME: z.string().default("localkb_session"),
});

export function getConfig() {
  return configSchema.parse({
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    MEILISEARCH_MASTER_KEY:
      process.env.MEILISEARCH_MASTER_KEY ?? process.env.MEILI_MASTER_KEY,
    MEILISEARCH_URL: process.env.MEILISEARCH_URL,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  });
}
