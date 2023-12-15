// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

/**
 * @type {import('next').NextConfig}
 **/
import path from "path"
import {fileURLToPath} from "url"

/* eslint-disable no-shadow */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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

const nextConfig = {
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
        // if the md_server_url is not set it defaults to invalid url
        // this way we don't accidentally point prod->staging or vice versa
        md_server_url: process.env.MD_SERVER_URL ?? "MD_SERVER_URL_must_be_set",
        enableAuthentication: process.env.ENABLE_AUTHENTICATION ?? true,
        unileafVersion: process.env.UNILEAF_VERSION,
    },

    output: "standalone",

    images: {
        domains: ["avatars.githubusercontent.com"],
    },

    poweredByHeader: false,

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

    transpilePackages: ["echarts", "echarts-gl", "zrender"],

    compiler: {
        // Prevent errors like "webpack Warning: Prop `className` did not match. Server: ..."
        // See: https://nextjs.org/docs/architecture/nextjs-compiler#styled-components
        // ssr and displayName are configured by default
        styledComponents: true,
    },
}

// Seems to need to be exported for NextJS to pick it up
// ts-prune-ignore-next
export default nextConfig
