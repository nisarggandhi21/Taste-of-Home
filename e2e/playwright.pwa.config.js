import { defineConfig, devices } from '@playwright/test';

// The installable-app tests. A service worker only exists in a built site, so unlike the
// main browser tests these run against `vite build` + `vite preview`, with the same API.
export default defineConfig({
  testDir: './pwa',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
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
      command: 'npm run build && npm run preview -- --port 5173 --strictPort',
      cwd: '../client',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        VITE_BASEURL: 'http://localhost:8800/api/',
        VITE_SUCCESS_URL: 'http://localhost:5173/success',
      },
    },
  ],
});
