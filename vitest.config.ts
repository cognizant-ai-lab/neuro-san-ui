import {availableParallelism} from "node:os"
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
            // Consider migrating to v8 coverage provider. Pros: faster. Cons: can be less accurate for some cases.
            provider: "istanbul",
            reporter: ["text-summary"],
            thresholds: {
                statements: -37,
                branches: -70,
                functions: -4,
                lines: -19,
            },
        },
        // TODO: potential small optimization: consider using `node` environment for non-UI tests
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
        globals: true,
        include: ["apps/**/__tests__/**/*.test.{ts,tsx}", "packages/**/__tests__/**/*.test.{ts,tsx}"],
        // Default to the number of CPU cores. Oversubscribing (e.g. 8 workers on 4 cores) makes the heavy MUI tests
        // several times slower and causes sporadic 5s timeouts, especially with coverage instrumentation enabled.
        // Override locally with VITEST_MAX_WORKERS.
        maxWorkers:
            process.env["CI"] === "true" ? undefined : (process.env["VITEST_MAX_WORKERS"] ?? availableParallelism()),
        // Have to manually specify GitHub Actions reporter when configuring reporters manually.
        // See: https://vitest.dev/guide/reporters.html#github-actions-reporter
        reporters: process.env["GITHUB_ACTIONS"] === "true" ? ["minimal", "github-actions"] : ["minimal"],
        setupFiles: ["./vitest.setup.ts"],
    },
})
