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
            lines: 3.0,
            branches: 0.7,
            functions: 1.5,
            statements: 3.0,
        },
        // Coverage on utils is a little higher
        "./utils/": {
            statements: 9.4,
            branches: 4.3,
            functions: 5.0,
            lines: 9.7,
        },
    },
}
