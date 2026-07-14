import {defineConfig} from "vitest/config"

export default defineConfig({
    test: {
        coverage: {
            enabled: false,
            exclude: [
                "**/.next/**",
                "**/__tests__/**",
                "**/coverage/**",
                "**/dist/**",
                "**/generated/**",
                "**/knip.config.ts",
                "**/next-env.d.ts",
                "**/next.config.ts",
                "**/vitest*.ts",
                "apps/main/app/api/auth/[[]...nextauth[]]/route.ts",
            ],
            include: ["**/*.{js,jsx,ts,tsx}"],
            // For now use instanbul provider as we're merging with jest results.
            // Once we are fully migrated to vitest, consider switching to v8.
            provider: "istanbul",
            reporter: ["text-summary"],
            thresholds: {
                statements: -83,
                branches: -139,
                functions: -18,
                lines: -58,
            },
        },
        // TODO: potential small optimization: consider using `node` environment for non-UI tests
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
        globals: true,
        include: ["apps/**/__tests__/**/*.test.{ts,tsx}", "packages/**/__tests__/**/*.test.{ts,tsx}"],
        // Let maxWorkers default to the number of CPU cores in CI, but set 8 for local development (best by test)
        maxWorkers: process.env["CI"] === "true" ? undefined : (process.env["VITEST_MAX_WORKERS"] ?? 8),
        // Have to manually specify GitHub Actions reporter when configuring reporters manually.
        // See: https://vitest.dev/guide/reporters.html#github-actions-reporter
        reporters: process.env["GITHUB_ACTIONS"] === "true" ? ["minimal", "github-actions"] : ["minimal"],
        setupFiles: ["./vitest.setup.ts"],
    },
})
