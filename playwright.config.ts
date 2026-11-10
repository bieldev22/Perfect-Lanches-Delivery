import { defineConfig } from "@playwright/test";

const testDataDir = `.delivery/e2e/${process.pid}-${Date.now()}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:4188",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server/index.mjs",
    url: "http://127.0.0.1:4188",
    timeout: 45000,
    reuseExistingServer: false,
    env: {
      PORT: "4188",
      PUBLIC_URL: "http://127.0.0.1:4188",
      HOST: "127.0.0.1",
      DELIVERY_DEMO: "true",
      DELIVERY_DATA_DIR: testDataDir,
      PIX_PROVIDER: "demo",
      OPENAI_API_KEY: "",
      NODE_ENV: "development",
    },
  },
});
