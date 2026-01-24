/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// This is the base jest config file from which other configs inherit.

// This file initially cargo culted from here:
// https://nextjs.org/docs/pages/building-your-application/optimizing/testing#jest-and-react-testing-library
import type {Config} from "@jest/types"

const config: Config.InitialOptions = {
    // For details on these settings: https://jestjs.io/docs/configuration

    preset: "ts-jest/presets/default-esm",
    extensionsToTreatAsEsm: [".ts", ".tsx"],
    transformIgnorePatterns: ["/node_modules/(?!next-auth|@next-auth|react|react-dom|react/jsx-runtime|lodash-es)"],
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: "<rootDir>/tsconfig.test.json",
            },
        ],
        "^.+\\.[jt]sx?$": ["babel-jest", {configFile: "./babel.jest.config.cjs"}],
    },
    verbose: false,
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testEnvironment: "jsdom",
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.{js,jsx,ts,tsx}",
        "!**/__tests__/**/*",
        "!**/coverage/**",
        "!**/dist/**",
        "!**/generated/**",
        "!**/.next/**",
        "!jest*.ts",
        "!knip.config.ts",
        "!**/next-env.d.ts",
        "!**/next.config.ts",
    ],
    coverageReporters: ["text-summary"],

    // Prevent Jest from trying to parse CSS files. Reference: https://stackoverflow.com/a/43813992
    moduleNameMapper: {
        "\\.(css|less)$": "<rootDir>/apps/main/__tests__/__mocks__/styleMock.js",
    },

    // Don't look for modules in these directories
    modulePathIgnorePatterns: ["<rootDir>/dist", "/.next/"],

    // By default, test any files in __tests__ folder
    testMatch: ["<rootDir>/**/__tests__/**/*.(test).{ts,tsx}"],

    // Exclude these files from Jest scanning
    testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist", "<rootDir>/.next/"],
}

export default config
