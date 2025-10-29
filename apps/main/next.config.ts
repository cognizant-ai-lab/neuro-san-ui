// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

import path from "path"

/* eslint-disable no-shadow */
const __dirname = import.meta.dirname
/* eslint-enable no-shadow */

// Extra headers to be returned
// Gleaned from here: https://nextjs.org/docs/advanced-features/security-headers
// TODO: Temporary for hackathon
const isDev = process.env.NODE_ENV !== 'production'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No X-Frame-Options in dev or it will always block iframes
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
  // ...(isDev ? [] : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]),

  {
    key: 'Content-Security-Policy',
    // Option 1 (tighter): list the VS Code ancestors explicitly
    value: "frame-ancestors 'self' vscode-webview://* vscode-resource://* vscode-file://*;"
    // Option 2 (fastest for hackathon dev): allow any ancestor
    // value: "frame-ancestors *;"
  }
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
