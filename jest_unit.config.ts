// Jest config for unit tests (and "component" tests)

import type {Config} from "@jest/types"

import sharedConfig from "./jest.config"

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    // For details on these settings: https://jestjs.io/docs/configuration
    coverageThreshold: {
        global: {
            statements: 59.68,
            branches: 51.11,
            functions: 54.53,
            lines: 59.49,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
