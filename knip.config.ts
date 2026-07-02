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

    ignoreDependencies: [
        ...baseConfig.ignoreDependencies,

        // Used internally by eslint
        "globals",

        // Used for Speech Recognition API types
        "@types/dom-speech-recognition",

        // Used by do_openapi_generate.sh
        "openapi-typescript",

        // Used by Next.js image optimization,
        "sharp",

        // Peer dependencies of @cognizant-ai-lab/dev-common; installed here because ESLint runs from the monorepo root
        "@eslint/js",
        "@next/eslint-plugin-next",
        "eslint-config-prettier",
        "eslint-plugin-prefer-arrow-functions",
        "eslint-plugin-react",
        "eslint-plugin-react-hooks",
        "eslint-plugin-testing-library",
        "eslint-plugin-unicorn",
        "eslint-plugin-vitest",
        "typescript-eslint",
    ],
    workspaces: {
        "packages/dev-common": {
            ignore: ["Configs/eslint.config.d.mts"],
        },
    },
}

export default config
