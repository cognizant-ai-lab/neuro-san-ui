// This file is used by Jest to configure the testing environment for unit and integration tests

// Voodoo to speed up Jest, from here: https://stackoverflow.com/a/60905543
import path from "path"

module.exports = {
    // For details on these settings: https://jestjs.io/docs/configuration

    verbose: true,
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                // Doc: https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules/
                isolatedModules: true,
                tsconfig: path.resolve(__dirname, "tsconfig.test.json"),
            },
        ],
    },
    collectCoverage: true,
    collectCoverageFrom: ["**/*.{js,jsx,ts,tsx}", "!**/node_modules/**", "!.next/**", "!**/coverage/**", "!jest*.ts"],
    coverageReporters: ["text-summary"],
    coverageThreshold: {
        global: {
            lines: 0.45,
            branches: 0.28,
            functions: 0.13,
            statements: 0.45,
        },
        // Coverage on utils is a little higher
        "./utils/": {
            statements: 29.5,
            branches: 19,
            functions: 25,
            lines: 28.5,
        },
    },
}
