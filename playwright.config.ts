import { defineConfig } from '@playwright/test';

const isPreview = process.env.SMOKE_ENV === 'preview';
const port = isPreview ? 4173 : 5173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10_000,
  reporter: 'html',

  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'dev',
      use: { baseURL: 'http://localhost:5173' },
    },
    {
      name: 'preview',
      use: { baseURL: 'http://localhost:4173' },
    },
  ],

  webServer: {
    command: isPreview ? 'bun run build && bun run preview' : 'bun run dev',
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
