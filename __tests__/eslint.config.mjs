import {FlatCompat} from "@eslint/eslintrc"
import js from "@eslint/js"
import jestDom from "eslint-plugin-jest-dom"
import testingLibrary from "eslint-plugin-testing-library"
import path from "node:path"
import {fileURLToPath} from "node:url"

import baseConfig from "../eslint.config.mjs"

/* eslint-disable no-shadow */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
/* eslint-enable no-shadow */

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

const eslintConfig = [
    ...baseConfig,
    ...compat.extends("plugin:jest-dom/recommended", "plugin:testing-library/react"),
    {
        plugins: {
            "jest-dom": jestDom,
            "testing-library": testingLibrary,
        },

        rules: {
            "enforce-ids-in-jsx/missing-ids": "off",
            "testing-library/await-async-queries": "error",
            "testing-library/no-await-sync-queries": "error",
            "testing-library/no-debugging-utils": "off",
            "testing-library/no-dom-import": "error",
            "testing-library/no-manual-cleanup": "error",
            "testing-library/no-node-access": "off",
            "testing-library/no-container": "off",
            "react/no-array-index-key": "off",
            "react/display-name": "off",
            "@next/next/no-img-element": "off",
        },
    },
]

export default eslintConfig
