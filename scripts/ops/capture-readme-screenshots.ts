import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "public", "readme");

type CaptureTarget = {
  path: string;
  fileName: string;
  waitFor: (page: Page) => Promise<void>;
};

const targets: CaptureTarget[] = [
  {
    path: "/",
    fileName: "home.png",
    waitFor: (page) => page.getByRole("heading", { name: "Knowledge Hub" }).waitFor(),
  },
  {
    path: "/kb",
    fileName: "kb.png",
    waitFor: (page) =>
      page.getByRole("heading", { name: "Knowledge Base Articles" }).waitFor(),
  },
  {
    path: "/faq",
    fileName: "faq.png",
    waitFor: (page) => page.getByRole("heading", { name: "Câu hỏi thường gặp" }).waitFor(),
  },
  {
    path: "/login",
    fileName: "login.png",
    waitFor: (page) =>
      page
        .getByRole("heading", {
          name: "Đăng nhập vào LocalKB",
        })
        .waitFor(),
  },
];

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: {
      width: 1440,
      height: 1080,
    },
  });

  try {
    for (const target of targets) {
      const page = await context.newPage();
      const url = new URL(target.path, `${baseUrl}/`).toString();

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await target.waitFor(page);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(outputDir, target.fileName),
        fullPage: false,
      });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
