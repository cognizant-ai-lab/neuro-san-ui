// Jest config for running tests silently (no console output unless there is a test failure)

import type {Config} from "@jest/types"

import sharedConfig from "./jest_unit.config"

const config: Config.InitialOptions = {
    // Pull in shared config
    ...sharedConfig,

    silent: true,
    reporters: ["jest-silent-reporter"],
    coverageReporters: ["none"],
}

export default config
