import {defineConfig} from "eslint/config"

import sharedConfig from "./packages/dev-common/configs/eslint.config.mjs"

export default defineConfig([
    ...sharedConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
])
