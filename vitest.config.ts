import {defineConfig} from "vitest/config"

export default defineConfig({
    test: {
        deps: {
            optimizer: {
                web: {
                    enabled: true,
                    include: [
                        "@emotion/react",
                        "@emotion/styled",
                        "@mui/icons-material",
                        "@mui/material",
                        "@mui/material/styles",
                        "@mui/system",
                        "@mui/x-tree-view",
                        "@testing-library/dom",
                        "@testing-library/react",
                        "@testing-library/user-event",
                        "@xyflow/react",
                        "notistack",
                        "react",
                        "react-dom",
                        "zustand",
                    ],
                },
            },
        },
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
                statements: -104,
                branches: -157,
                functions: -25,
                lines: -76,
            },
        },
        // TODO: potential small optimization: consider using `node` environment for non-UI tests
        environment: "jsdom",
        exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
        globals: true,
        include: ["apps/**/__tests__/**/*.test.{ts,tsx}", "packages/**/__tests__/**/*.test.{ts,tsx}"],
        // Have to manually specify GitHub Actions reporter when configuring reporters manually.
        // See: https://vitest.dev/guide/reporters.html#github-actions-reporter
        reporters: process.env["GITHUB_ACTIONS"] === "true" ? ["minimal", "github-actions"] : ["minimal"],
        setupFiles: ["./vitest.setup.ts"],
        maxWorkers: 8,
    },
})
