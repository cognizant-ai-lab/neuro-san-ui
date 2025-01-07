// This file is used by Jest to configure the testing environment for component tests

// This file cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library

import type {Config} from "@jest/types"
import nextJest from "next/jest.js"

import sharedConfig from "./jest.config"
const createJestConfig = nextJest({
    // Provide the path to Next.js app to load next.config.js and .env files in test environment
    dir: "./",
})

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    // For details on these settings: https://jestjs.io/docs/configuration
    coverageThreshold: {
        global: {
            statements: 24.52,
            branches: 20.83,
            functions: 23.25,
            lines: 24.2,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default createJestConfig(config)
