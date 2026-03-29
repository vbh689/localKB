import { syncAllPublishedContent } from "@/lib/search-index";

async function main() {
  console.info("Starting search reindex...");
  await syncAllPublishedContent();
  console.info("Search reindex completed.");
}

main().catch((error) => {
  console.error("Search reindex failed.");
  console.error(error);
  process.exitCode = 1;
});
