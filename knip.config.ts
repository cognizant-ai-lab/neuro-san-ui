import type {KnipConfig} from "knip"

import {config as baseConfig} from "./packages/dev-common/Configs/knip.config"
export const mergeConfigs = (...configs: KnipConfig[]): KnipConfig =>
    configs.reduce((acc, next) => {
        const result: KnipConfig = {...acc}
        for (const key of Object.keys(next) as (keyof KnipConfig)[]) {
            const a = acc[key]
            const b = next[key]
            if (Array.isArray(a) && Array.isArray(b)) {
                ;(result as Record<string, unknown>)[key] = [...a, ...b]
            } else if (a && b && typeof a === "object" && typeof b === "object") {
                ;(result as Record<string, unknown>)[key] = mergeConfigs(a as KnipConfig, b as KnipConfig)
            } else {
                ;(result as Record<string, unknown>)[key] = b
            }
        }
        return result
    }, {} as KnipConfig)

export default mergeConfigs(baseConfig, {
    ignore: [
        // Temporarily exclude for transition to monorepo (legit issue)
        "packages/ui-common/components/AgentChat/Common/Types.ts",

        // Used by CommitCheck script
        "jest_quiet.config.ts",
    ],
    ignoreDependencies: [
        // Used for Speech Recognition API types
        "@types/dom-speech-recognition",

        // Used by do_openapi_generate.sh
        "openapi-typescript",

        // Used by CommitCheck script
        "jest-silent-reporter",

        // Used by Next.js image optimization,
        "sharp",
    ],
    workspaces: {
        "packages/dev-common": {
            ignore: ["Configs/eslint.config.d.mts"],
            ignoreBinaries: [
                "packages/dev-common/BuildUtils/CommitCheck.sh",
                "packages/dev-common/BuildUtils/eslint_list_rules.sh",
            ],
        },
    },
})
