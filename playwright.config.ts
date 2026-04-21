import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx partykit dev',
      port: 1999,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
