// This file is used by Jest to configure the testing environment for unit and integration tests

// Voodoo to speed up Jest, from here: https://stackoverflow.com/a/60905543
module.exports = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                // Doc: https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules/
                isolatedModules: true,
            },
        ],
    },
}
