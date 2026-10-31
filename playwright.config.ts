import { defineConfig, devices } from "@playwright/test";

/**
 * Visual checks for the odontogram. It renders the dev-only harness at
 * apps/clientes/app/preview/odontograma, so the real component and its
 * Tailwind styles are measured, not a copy.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "off",
  },
  webServer: {
    command: "bun run --cwd apps/clientes dev",
    url: "http://127.0.0.1:3001/preview/odontograma",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: "movil",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "escritorio",
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
