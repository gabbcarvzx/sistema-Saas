import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  webServer: {
    command: "npm run dev",
    env: {
      PASSWORD_HASH_COST: "4",
    },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
});
