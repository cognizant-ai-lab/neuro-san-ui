// @ts-check

import {defineConfig} from "eslint/config"

import sharedConfig from "./packages/dev-common/Configs/eslint.config.mjs"

export default defineConfig([
    ...sharedConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },

        settings: {
            next: {
                rootDir: "apps/main",
            },
        },

        rules: {
            // Override inherit configs as necessary for this project
            "@next/next/no-html-link-for-pages": ["warn", "apps/main/pages"],
        },
    },
])
