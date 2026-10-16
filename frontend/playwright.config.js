import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    headless: true,
  },
  reporter: "list",
});
