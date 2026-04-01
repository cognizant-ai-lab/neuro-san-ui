import {defineConfig, devices} from "@playwright/test"

/**
 * Playwright configuration for E2E tests.
 *
 * By default the tests expect the dev server to already be running.
 * Set `BASE_URL` env var to override the target (default: http://localhost:3000).
 *
 * To auto-start the dev server before tests, uncomment the `webServer` block.
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "github" : "html",
    timeout: 60_000,

    use: {
        baseURL: process.env.BASE_URL ?? "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],

    // Uncomment to have Playwright start the dev server automatically:
    // webServer: {
    //     command: "yarn dev",
    //     url: "http://localhost:3000",
    //     reuseExistingServer: !process.env.CI,
    //     timeout: 120_000,
    // },
})
