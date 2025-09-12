import type {KnipConfig} from "knip"

const config: KnipConfig = {
    entry: ["./packages/ui-common/index.ts"],
    project: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    ignore: [
        // Temporarily unused pending migration from Pinecone to pgvector
        "packages/ui-common/components/ChatBot/ChatBot.tsx",
        "packages/ui-common/controller/llm/endpoints.ts",

        // Used in a sneaky way by jest
        "babel.jest.config.cjs",

        // Duplicate export: revisit later
        "packages/ui-common/components/MultiAgentAccelerator/const.ts",

        // Temporarily exclude for transition to monorepo
        ".github/**",
        "apps/main/package.json",
        "package.json",
        "packages/ui-common/components/AgentChat/Types.ts",
        "packages/ui-common/package.json",
    ],
    ignoreDependencies: ["sharp"], // Used by Next.js image optimization,
}

export default config
