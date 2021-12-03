const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Will be available on both server and client
  publicRuntimeConfig: {
    // if the md_server_url is not set it defaults to staging
    md_server_url: process.env.MD_SERVER_URL ?? "http://gateway.staging.unileaf.evolution.ml:30002",
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
    webpack: (config, {buildId, dev, isServer, defaultLoaders, webpack}) => {

        config.plugins.push(
            new CopyPlugin({
                // Use copy plugin to copy *.wasm to output folder.
                patterns: [
                    {
                        from: 'node_modules/onnxruntime-web/dist/*.wasm',
                        to: 'static/chunks/pages/projects/[projectID]/experiments/[experimentID]/runs/[runID]/prescriptors/[prescriptorID]/[name].[ext]'
                    }
                ]
            })
        )

        return config
    }
}
