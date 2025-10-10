// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

import path from "path"

/* eslint-disable no-shadow */
const __dirname = import.meta.dirname
/* eslint-enable no-shadow */

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

const nextConfig: import("next").NextConfig = {
    transpilePackages: ["@cognizant-ai-lab/ui-common"],

    typescript: {
        // We check this elsewhere so disable during build
        ignoreBuildErrors: true,
    },
    eslint: {
        // We lint elsewhere so disable linting during build
        ignoreDuringBuilds: true,

        // Only these dirs will be scanned by ESLint. Apparently "." is enough to catch all subdirs (tested)
        dirs: ["."],
    },

    publicRuntimeConfig: {
        neuroSanUIVersion: process.env["NEURO_SAN_UI_VERSION"] || "unknown",
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
}

// Seems to need to be exported for Next.js to pick it up
export default nextConfig
