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
            lines: 5.0,
            branches: 1.9,
            functions: 3.5,
            statements: 5.0,
        },
        "./utils/": {
            statements: 9.4,
            branches: 4.4,
            functions: 5.1,
            lines: 9.8,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
