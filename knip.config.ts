import type {KnipConfig} from "knip"

import {config} from "./packages/dev-common/Configs/knip.config"

const knipConfig: KnipConfig = {
    ...config,
    ignore: [
        ...config.ignore,

        // Temporarily exclude for transition to monorepo (legit issue)
        "packages/ui-common/components/AgentChat/Common/Types.ts",

        // Used by CommitCheck script
        "jest_quiet.config.ts",
    ],
    ignoreDependencies: [
        ...config.ignoreDependencies,
        // Used for Speech Recognition API types
        "@types/dom-speech-recognition",

        // Used by do_openapi_generate.sh
        "openapi-typescript",

        // Used by CommitCheck script
        "jest-silent-reporter",

        // Used by Next.js image optimization,
        "sharp",

        // Used by Jest for TS format config file
        "ts-node",

        // Peer dependencies of @cognizant-ai-lab/dev-common; installed here because ESLint runs from the monorepo root
        "@eslint/compat",
        "@eslint/js",
        "@next/eslint-plugin-next",
        "eslint-config-prettier",
        "eslint-plugin-jest",
        "eslint-plugin-jest-dom",
        "eslint-plugin-prefer-arrow-functions",
        "eslint-plugin-react",
        "eslint-plugin-react-hooks",
        "eslint-plugin-testing-library",
        "eslint-plugin-unicorn",
        "typescript-eslint",
    ],

    workspaces: {
        "packages/dev-common": {
            ignore: ["Configs/eslint.config.d.mts"],
        },
    },
}

export default knipConfig
