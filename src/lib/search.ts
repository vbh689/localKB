import { Meilisearch } from "meilisearch";
import { getConfig } from "@/lib/config";

declare global {
  var meilisearch: Meilisearch | undefined;
}

const config = getConfig();

export const searchClient =
  globalThis.meilisearch ??
  new Meilisearch({
    host: config.MEILISEARCH_URL,
    apiKey: config.MEILISEARCH_MASTER_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.meilisearch = searchClient;
}
