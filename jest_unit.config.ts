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
            statements: 41.44,
            branches: 37.06,
            functions: 39.75,
            lines: 41.05,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
