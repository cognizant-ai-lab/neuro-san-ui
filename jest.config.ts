// This is the base jest config file from which other configs inherit.

// This file initially cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library
import type {Config} from "@jest/types"
import path from "path"

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // For details on these settings: https://jestjs.io/docs/configuration

    // Voodoo to speed up Jest, from here: https://stackoverflow.com/a/60905543
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                // Doc: https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules/
                isolatedModules: true,
                tsconfig: path.resolve(__dirname, "tsconfig.test.json"),
            },
        ],
    },
    verbose: true,
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testEnvironment: "jest-environment-jsdom",
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.{js,jsx,ts,tsx}",
        "!**/node_modules/**",
        "!.next/**",
        "!**/coverage/**",
        "!**/generated/**",
        "!jest*.ts",
        "!next-env.d.ts",
        "!postcss.config.js",
        "!tailwind.config.js",
    ],
    // coverageReporters: ["clover", "json", "lcov", "text"],
    coverageReporters: ["text-summary"],
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
