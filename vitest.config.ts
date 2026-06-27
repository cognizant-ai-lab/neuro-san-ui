import react from "@vitejs/plugin-react"
import {defineConfig} from "vitest/config"

import {TESTS_MIGRATED_TO_VITEST} from "./vitest_migration"

export default defineConfig({
    plugins: [react()],
    test: {
        coverage: {
            enabled: true,
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
            include: ["**/*.{js,jsx,ts,tsx}"],
            provider: "v8",
            reporter: ["text-summary"],
            thresholds: {
                lines: -2840,
                functions: -852,
                statements: -3082,
                branches: -1601,
            },
        },
        environment: "jsdom",
        exclude: ["node_modules", "dist", ".next", "coverage"],
        globals: false,
        include: TESTS_MIGRATED_TO_VITEST,
        setupFiles: ["./vitest.setup.ts"],
    },
})
