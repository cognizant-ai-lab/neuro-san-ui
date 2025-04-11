// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

import path from "path"
import {fileURLToPath} from "url"

/* eslint-disable no-shadow */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
/* eslint-enable no-shadow */

const BUILD_TARGETS: Record<string, string[] | null> = {
    all: null,
    neuroSan: ["pages/agentNetwork", "components/AgentNetwork"].map((dir) => path.join(__dirname, dir)),
}

// Extra headers to be returned
// Gleaned from here: https://nextjs.org/docs/advanced-features/security-headers
const securityHeaders = [
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "X-XSS-Protection",
        value: "1; mode=block",
    },
    {
        key: "Content-Security-Policy",
        value: "",
    },
]

const target = process.env.BUILD_TARGET || "all"

if (target && !Object.hasOwn(BUILD_TARGETS, target)) {
    throw new Error(`Unknown BUILD_TARGET: ${target}`)
}

const nextConfig: import("next").NextConfig = {
    typescript: {
        // Cause build to fail on Typescript transpilation errors
        ignoreBuildErrors: false,
    },
    eslint: {
        // We lint elsewhere so disable linting during build
        ignoreDuringBuilds: true,

        // Only these dirs will be scanned by ESLint. Apparently "." is enough to catch all subdirs (tested)
        dirs: ["."],
    },

    publicRuntimeConfig: {
        unileafVersion: process.env.UNILEAF_VERSION,
    },

    output: "standalone",

    images: {
        // See: https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**avatars.githubusercontent.com",
                port: "",
            },
            {
                protocol: "https",
                hostname: "**gravatar.com",
                port: "",
            },
        ],
    },

    poweredByHeader: false,

    // Disable dev tools icon
    devIndicators: false,

    async headers() {
        return [
            {
                // Apply these headers to all routes in the application.
                source: "/:path*",
                headers: securityHeaders,
            },
        ]
    },

    sassOptions: {
        includePaths: [path.join(__dirname, "styles")],
    },

    transpilePackages: [
        "@ant-design/pro-editor",
        "@ant-design/icons",
        "@ant-design/icons-svg",
        "echarts",
        "echarts-gl",
        "rc-pagination",
        "rc-picker",
        "rc-table",
        "rc-tree",
        "rc-util",
        "zrender",
    ],
}

// Seems to need to be exported for NextJS to pick it up
// ts-prune-ignore-next
export default nextConfig
