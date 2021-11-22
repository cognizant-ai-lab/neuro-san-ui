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
  }
}
