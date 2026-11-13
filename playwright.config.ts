import { defineConfig, devices } from "@playwright/test";

const DEFAULT_PORT = "4173";
const HOST = "127.0.0.1";

const port = process.env["PORT"] ?? DEFAULT_PORT;
const baseURL = process.env["PLAYWRIGHT_BASE_URL"]
  ?? process.env["BASE_URL"]
  ?? `http://${HOST}:${port}`;

// Retries and workers are deliberately not set: the runner passes them as CLI flags.
export default defineConfig({
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  use: { baseURL },
  // A local run serves an existing `dist`; a gate server on the same URL is reused.
  webServer: {
    command: `npm run preview -- --host ${HOST} --port ${new URL(baseURL).port || port} --strictPort`,
    reuseExistingServer: true,
    url: baseURL,
  },
});
