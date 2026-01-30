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

const config: KnipConfig = {
    // From the doc:
    // "By default, Knip does not report unused exports in entry files. When a repository (or workspace) is
    // self-contained or private, you may want to include entry files when reporting unused exports:"
    includeEntryExports: true,

    // Treat hints as errors (will make exit code non-zero)
    treatConfigHintsAsErrors: true,

    // Opt-in to all issues types
    include: [
        "binaries",
        "classMembers",
        "dependencies",
        "devDependencies",
        "duplicates",
        "enumMembers",
        "exports",
        "files",
        "nsExports",
        "nsTypes",
        "optionalPeerDependencies",
        "types",
        "unlisted",
        "unresolved",
    ],

    ignore: [
        // Temporarily unused pending migration from Pinecone to pgvector
        "packages/ui-common/components/ChatBot/ChatBot.tsx",
        "packages/ui-common/controller/llm/endpoints.ts",

        // Used in a sneaky way by jest
        "babel.jest.config.cjs",

        // Duplicate export: revisit later (legit issue)
        "packages/ui-common/components/MultiAgentAccelerator/const.ts",

        // Temporarily exclude for transition to monorepo (legit issue)
        "packages/ui-common/components/AgentChat/Types.ts",

        "**/dist/**",

        // Used by CommitCheck script
        "jest_quiet.config.ts",
    ],

    ignoreDependencies: [
        // Used by jest
        "@babel/core",
        "@babel/preset-env",

        // Used for Speech Recognition API types
        "@types/dom-speech-recognition",

        // Used by Jest
        "babel-jest",

        // Used by eslint
        "eslint-config-next",

        // Used by yarn lint-summary script
        "eslint-formatter-summary",

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
    ],
}

export default config
