import react from "@vitejs/plugin-react"
import {defineConfig} from "vitest/config"

import {TESTS_MIGRATED_TO_VITEST} from "./vitest_migration"

export default defineConfig({
    plugins: [react()],
    test: {
        coverage: {
            reportsDirectory: "coverage-vitest",
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
                "apps/main/app/api/auth/[...nextauth]/route.ts",
            ],
            // TODO: Uncomment this once we have migrated all tests to vitest.
            // include: ["**/*.{js,jsx,ts,tsx}"],
            // For now use instanbul provider as we're merging with jest results.
            // Once we are fully migrated to vitest, consider switching to v8.
            provider: "istanbul",
            reporter: ["text-summary"],
            // These values are meaningless during migration to vitest as we are running tests in both jest and vitest.
            // Instead, use the combined coverage nunmbers from RunCombinedTests.sh.
            thresholds: {
                statements: -13,
                branches: -7,
                functions: -9,
                lines: -9,
            },
        },
        environment: "jsdom",
        exclude: ["node_modules", "dist", ".next", "coverage"],
        globals: false,
        include: TESTS_MIGRATED_TO_VITEST,
        setupFiles: ["./vitest.setup.ts"],
    },
})
