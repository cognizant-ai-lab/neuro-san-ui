import react from "@vitejs/plugin-react"
import {defineConfig} from "vitest/config"

export default defineConfig({
    plugins: [react()],
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
                "apps/main/app/api/auth/[...nextauth]/route.ts",
            ],
            include: ["**/*.{js,jsx,ts,tsx}"],
            // For now use instanbul provider as we're merging with jest results.
            // Once we are fully migrated to vitest, consider switching to v8.
            provider: "istanbul",
            reporter: ["text-summary"],
            thresholds: {
                statements: -109,
                branches: -156,
                functions: -26,
                lines: -81,
            },
        },
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
        globals: false,
        include: ["**/__tests__/**/*.test.{ts,tsx}"],
        setupFiles: ["./vitest.setup.ts"],
    },
})
