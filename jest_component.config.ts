// This file is used by Jest to configure the testing environment for component tests

// This file cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library

import type {Config} from "@jest/types"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: "./",
})

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // For details on these settings: https://jestjs.io/docs/configuration

    verbose: true,
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testEnvironment: "jest-environment-jsdom",
    collectCoverage: true,
    collectCoverageFrom: ["**/*.{js,jsx,ts,tsx}", "!**/node_modules/**", "!.next/**", "!**/coverage/**", "!jest*.ts"],
    coverageReporters: ["text-summary"],
    coverageThreshold: {
        global: {
            lines: 7.7,
            branches: 3.2,
            functions: 6.6,
            statements: 7.5,
        },
        // Coverage on utils is a little higher
        "./utils/": {
            statements: 15.0,
            branches: 5.8,
            functions: 15.0,
            lines: 15.0,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default createJestConfig(config)
