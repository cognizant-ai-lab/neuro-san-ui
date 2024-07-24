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
            lines: 12.0,
            branches: 9.0,
            functions: 12.0,
            statements: 12.0,
        },
        // Coverage on utils is a little higher
        "./utils/": {
            statements: 15.0,
            branches: 5.7,
            functions: 15.0,
            lines: 15.8,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default createJestConfig(config)
