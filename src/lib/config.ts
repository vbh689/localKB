import { z } from "zod";

const configSchema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  MEILISEARCH_MASTER_KEY: z
    .string()
    .min(1, "MEILISEARCH_MASTER_KEY is required"),
  MEILISEARCH_URL: z.url().default("http://localhost:7700"),
  SESSION_COOKIE_NAME: z.string().default("localkb_session"),
});

export const config = configSchema.parse({
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  MEILISEARCH_MASTER_KEY: process.env.MEILISEARCH_MASTER_KEY,
  MEILISEARCH_URL: process.env.MEILISEARCH_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
});

