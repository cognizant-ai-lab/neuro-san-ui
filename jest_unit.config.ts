// Jest config for unit tests (and "component" tests)

import type {Config} from "@jest/types"

import sharedConfig from "./jest.config"

const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    // For details on these settings: https://jestjs.io/docs/configuration
    coverageThreshold: {
        global: {
            statements: -166,
            branches: -131,
            functions: -52,
            lines: -143,
        },
    },
}

export default config
