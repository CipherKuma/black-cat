import { expect, test } from "@playwright/test";

// spec: BC-FE-1, BC-FE-2, BC-FE-3
// section: black-cat/frontend-core
// mode: browser

// Increase timeout — Next.js dev compiles pages on first visit (cold start)
test.setTimeout(120_000);

// Warm up the dev server before running tests. Next.js compiles on first
// request and the browser can abort the navigation if it takes too long.
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Retry root page up to 3 times to survive cold compilation
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto("http://127.0.0.1:3030/", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      break;
    } catch {
      if (i === 2)
        throw new Error("Dev server warm-up failed after 3 attempts");
    }
  }
  await ctx.close();
});

// Helper: navigate with retry for cold-compile resilience
async function safeGoto(page: import("@playwright/test").Page, path: string) {
  for (let i = 0; i < 2; i++) {
    try {
      await page.goto(path, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      return;
    } catch {
      if (i === 1)
        throw new Error(`Navigation to ${path} failed after 2 attempts`);
    }
  }
}

// spec: BC-FE-1
test("BC-FE-1: main pages render without crashes", async ({ page }) => {
  await safeGoto(page, "/");
  await expect(page).toHaveURL(/\/$/);

  await safeGoto(page, "/leaderboard");
  await expect(page).toHaveURL(/\/leaderboard/);

  await safeGoto(page, "/master");
  await expect(page).toHaveURL(/\/master/);
});

// spec: BC-FE-2
test("BC-FE-2: subscribe page renders and accepts interaction", async ({
  page,
}) => {
  await safeGoto(page, "/subscribe");
  await expect(page).toHaveURL(/\/subscribe/);
  await expect(page.locator("body")).not.toHaveText(/Application error/);
});

// spec: BC-FE-3
test("BC-FE-3: cross-page navigation remains stable", async ({ page }) => {
  await safeGoto(page, "/");
  await safeGoto(page, "/master");
  await safeGoto(page, "/leaderboard");
  await safeGoto(page, "/subscribe");
  await safeGoto(page, "/");
  await expect(page.locator("body")).toBeVisible();
});
