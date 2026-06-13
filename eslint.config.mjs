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
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        // Inherited rule for MUI barrel imports
                        {
                            regex: "^@mui/[^/]+$",
                            message:
                                "Do not import from MUI barrel files. " +
                                "Import from specific component files instead.",
                        },

                        // Ban barrel imports to avoid out of sync issues and to encourage better tree shaking.
                        {
                            regex: "(^|.*/)packages/ui-common$",
                            message:
                                "Do not import from the packages/ui-common barrel file. Import from specific " +
                                "component/state files instead.",
                        },

                        // Importing via package name is also banned to maintain consistency
                        {
                            regex: "^@cognizant-ai-lab",
                            message:
                                "Do not import from the @cognizant-ai-lab/ui-common barrel file. " +
                                "Use a relative path to import specific component/state files instead.",
                        },
                    ],
                },
            ],
        },
    },
])
