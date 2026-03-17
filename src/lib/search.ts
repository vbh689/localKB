import { Meilisearch } from "meilisearch";
import { config } from "@/lib/config";

declare global {
  var meilisearch: Meilisearch | undefined;
}

export const searchClient =
  globalThis.meilisearch ??
  new Meilisearch({
    host: config.MEILISEARCH_URL,
    apiKey: config.MEILISEARCH_MASTER_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.meilisearch = searchClient;
}

