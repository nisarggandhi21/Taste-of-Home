import { defineConfig, devices } from '@playwright/test';

// Browser tests for the real client against the real API (in-memory database, Stripe fake).
// Both servers are started automatically; see ../api/test/support/e2e-server.js for the
// seeded data. The tests share that data, so they run one at a time, in file order.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node test/support/e2e-server.js',
      cwd: '../api',
      url: 'http://localhost:8801/ready',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '../client',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_BASEURL: 'http://localhost:8800/api/',
        VITE_SUCCESS_URL: 'http://localhost:5173/success',
      },
    },
  ],
});
