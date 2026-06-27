import react from "@vitejs/plugin-react"
import {defineConfig} from "vitest/config"

import {TESTS_MIGRATED_TO_VITEST} from "./vitest_migration"

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: TESTS_MIGRATED_TO_VITEST,
        exclude: ["node_modules", "dist", ".next", "coverage"],
        coverage: {
            provider: "v8",
            include: ["**/*.{js,jsx,ts,tsx}"],
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
        },
    },
})
