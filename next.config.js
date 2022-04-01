const path = require("path");

module.exports = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  publicRuntimeConfig: {
    // if the md_server_url is not set it defaults to invalid url
    // this way we don't accidently point prod->staging or vice versa
    md_server_url: process.env.MD_SERVER_URL ?? "MD_SERVER_URL_must_be_set",
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
}
