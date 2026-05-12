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

/**
 * @fileoverview Knip configuration file to identify unused files and dependencies in the project.
 *
 */

import type {KnipConfig} from "knip"

import {config as baseConfig} from "./packages/dev-common/Configs/knip.config"

const config: KnipConfig = {
    ...baseConfig,
    ignore: [
        ...(baseConfig.ignore as string[]),

        // Used in a sneaky way by jest
        "babel.jest.config.cjs",

        // Temporarily exclude for transition to monorepo (legit issue)
        "packages/ui-common/components/AgentChat/Common/Types.ts",

        // Used by CommitCheck script
        "jest_quiet.config.ts",
    ],
    ignoreDependencies: [
        ...baseConfig.ignoreDependencies,

        // Used internally by eslint
        "globals",

        // Used by jest
        "@babel/core",
        "@babel/preset-env",
        "babel-jest",

        // Used for Speech Recognition API types
        "@types/dom-speech-recognition",

        // Used internally by eslint
        "globals",

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

export default config
