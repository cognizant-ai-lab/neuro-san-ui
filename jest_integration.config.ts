import type {Config} from "@jest/types"

import sharedConfig from "./jest.config"

/** @type {import('jest').Config} */
const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    // For details on these settings: https://jestjs.io/docs/configuration
    testEnvironment: "node",
    setupFilesAfterEnv: [],
    coverageThreshold: {
        global: {
            lines: 5.2,
            branches: 2.5,
            functions: 4.0,
            statements: 5.2,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
