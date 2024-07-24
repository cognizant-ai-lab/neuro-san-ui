// This file is used by Jest to configure the testing environment for component tests

// This file initially cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library
import type {Config} from "@jest/types"
import path from "path"
// import nextJest from "next/jest.js"

// const createJestConfig = nextJest({
//     // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
//     dir: "./",
// })

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
    ],
    coverageReporters: ["text-summary"],
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
