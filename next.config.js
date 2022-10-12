
// This is JS not TS so suppress warning
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
	// We run eslint in CI/CD via a script that allows us
	// to pass without being lint-free. Until such time as
	// we are eslint-free, we need to ignore eslint during 
	// the build process.
        ignoreDuringBuilds: false,
        dirs: ['components', 'controller', 'pages', 'public', 'styles', 'tests', 'utils', '.']
    },

    publicRuntimeConfig: {
        // if the md_server_url is not set it defaults to invalid url
        // this way we don't accidentally point prod->staging or vice versa
        md_server_url: process.env.MD_SERVER_URL ?? "MD_SERVER_URL_must_be_set",
        enableAuthentication: process.env.ENABLE_AUTHENTICATION ?? true,
        unileafVersion: process.env.UNILEAF_VERSION
    },

    entry: path.resolve(__dirname, 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.min.js',
        library: {
            type: 'umd'
        }
    },

    mode: 'production',

    experimental: {
        outputStandalone: true,
    },

    images: {
        domains: ['avatars.githubusercontent.com'],
    },
}
