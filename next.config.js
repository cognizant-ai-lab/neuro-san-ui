// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

/**
 * @type {import('next').NextConfig}
 **/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const nextConfig = {
    typescript: {
        // Cause build to fail on Typescript transpilation errors
        ignoreBuildErrors: false,
    },
    eslint: {
        // We lint clean now so enable linting as part of the build
        ignoreDuringBuilds: false,

        // Only these dirs will be scanned by ESLint
        dirs: ['components', 'controller', 'pages', 'public', 'styles', 'tests', 'utils', '.']
    },

    publicRuntimeConfig: {
        // if the md_server_url is not set it defaults to invalid url
        // this way we don't accidentally point prod->staging or vice versa
        md_server_url: process.env.MD_SERVER_URL ?? "MD_SERVER_URL_must_be_set",
        enableAuthentication: process.env.ENABLE_AUTHENTICATION ?? true,
        unileafVersion: process.env.UNILEAF_VERSION
    },

    output: 'standalone',

    images: {
        domains: ['avatars.githubusercontent.com'],
    },

    poweredByHeader: false,

    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')],
    },

    transpilePackages: ['echarts', 'echarts-gl', 'zrender'],
};

module.exports = nextConfig;
