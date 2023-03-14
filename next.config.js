// @ts-check

// enables IDEs to type check this config file.
// See: https://nextjs.org/docs/basic-features/typescript

/**
 * @type {import('next').NextConfig}
 **/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

/* What is all this "withTM" stuff about? Without it, if you try to visit an experiment page via a deep link, the page
crashes with errors like "ReferenceError: self is not defined". Something to do with the arcane mysteries of SSR
(server-side rendering) in NextJS and how it doesn't play nicely with ECharts and its associated libs.

See discussion: https://github.com/hustcc/echarts-for-react/issues/425#issuecomment-1441106802

Note: in future versions of NextJS (13+) the next-transpile-modules component is deprecated:

https://www.npmjs.com/package/next-transpile-modules

"All features of next-transpile-modules are now natively built-in Next.js 13.1. Please use Next's 
transpilePackages option :)"
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withTM = require("next-transpile-modules")(["echarts", "zrender"]);

const nextConfig = withTM({
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

    // See comment above about "withTM"
    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')],
    },
});

module.exports = nextConfig;
