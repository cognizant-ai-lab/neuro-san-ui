// @ts-check

import {defineConfig} from "eslint/config"

import sharedConfig from "./packages/dev-common/Configs/eslint.config.mjs"

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig([
    ...sharedConfig,
    {
        rules: {
            // Override inherit configs as necessary for this project
            "@next/next/no-html-link-for-pages": ["warn", "apps/main/pages"],
        },
    },
])
