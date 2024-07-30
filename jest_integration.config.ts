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
            branches: 1.75,
            functions: 3.5,
            statements: 5.0,
        },
        "./utils/": {
            statements: 15.0,
            branches: 27.0,
            functions: 10.0,
            lines: 15.0,
        },
    },
}

// Required for Jest to function so tell ts-prune to ignore it
// ts-prune-ignore-next
export default config
