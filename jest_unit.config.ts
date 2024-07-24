// Base jest config for all test types. Other configuration files will import this one.

import type {Config} from "@jest/types"

import sharedConfig from "./jest.config"

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    // For details on these settings: https://jestjs.io/docs/configuration
    coverageThreshold: {
        global: {
            lines: 0.5,
            branches: 0.7,
            functions: 0.1,
            statements: 0.5,
        },
        // Coverage on utils is a little higher
        "./utils/": {
            statements: 29.7,
            branches: 19.1,
            functions: 25.6,
            lines: 28.9,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
