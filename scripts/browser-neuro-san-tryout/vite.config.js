import { defineConfig } from "vite"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { nodePolyfills } from "vite-plugin-node-polyfills"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const npmPkg = path.resolve(__dirname, "node_modules/@cognizant-ai-lab/neuro-san-npm")
const browserBuiltins = path.resolve(__dirname, "browser-stubs/builtins.js")
const browserNeuroSan = path.resolve(__dirname, "browser-stubs/neuro_san.js")
const browserPyhocon = path.resolve(__dirname, "browser-stubs/pyhocon.js")



function optionalStubPlugin() {
  const known = {
    "opentelemetry": path.resolve(__dirname, "browser-stubs/optional/empty.js"),

    "@langchain/mcp-adapters": path.resolve(__dirname, "browser-stubs/optional/mcp-adapters.js"),
  }
  const empty = path.resolve(__dirname, "browser-stubs/optional/empty.js")
  const stubPrefixes = [
    "@langchain/mcp-adapters",
    "langfuse",
    "@langfuse",
    "google-auth",
    "google.auth",
    "anthropic",
    "@anthropic",
  ]
  return {
    name: "optional-langchain-stubs",
    enforce: "pre",
    resolveId(source) {
      if (known[source]) return known[source]
      if (source === "langchain_core") {
        return path.resolve(__dirname, "node_modules/@langchain/core/dist/index.js")
      }
      for (const pref of stubPrefixes) {
        if (source === pref || source.startsWith(pref + "/")) return empty
      }
      return null
    },
  }
}


function stubOverridePlugin() {
  const remaps = [
    ["builtins.js", browserBuiltins],
    ["neuro_san.js", browserNeuroSan],
    ["pyhocon.js", browserPyhocon],
  ]
  return {
    name: "browser-neuro-san-stub-overrides",
    enforce: "pre",
    resolveId(source) {
      const norm = source.replace(/\\/g, "/")
      for (const [name, target] of remaps) {
        if (
          norm.endsWith(`/stubs/${name}`) ||
          norm.endsWith(`stubs/${name}`) ||
          norm === name
        ) {
          return target
        }
      }
      return null
    },
  }
}

export default defineConfig({
  define: {
    "process.env.AGENT_MANIFEST_FILE": JSON.stringify("/registries/manifest.json"),
  },
  plugins: [
    optionalStubPlugin(),

    stubOverridePlugin(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream", "events", "path", "os", "url"],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  resolve: {
    alias: [
      { find: "direct-agent-session-factory", replacement: path.join(npmPkg, "dist/generated/neuro_san/client/direct_agent_session_factory.js") },

      { find: path.join(npmPkg, "dist/stubs/builtins.js"), replacement: browserBuiltins },
      { find: path.join(npmPkg, "dist/stubs/neuro_san.js"), replacement: browserNeuroSan },
      { find: path.join(npmPkg, "dist/stubs/pyhocon.js"), replacement: browserPyhocon },
      { find: "asyncio", replacement: path.join(npmPkg, "dist/stubs/asyncio.js") },
      { find: "traceback", replacement: path.join(npmPkg, "dist/stubs/traceback.js") },
      { find: "futures", replacement: path.join(npmPkg, "dist/stubs/futures.js") },
      { find: "enum", replacement: path.join(npmPkg, "dist/stubs/enum.js") },
      { find: "statistics", replacement: path.join(npmPkg, "dist/stubs/statistics.js") },
      { find: "contextlib", replacement: path.join(npmPkg, "dist/stubs/contextlib.js") },
      { find: "neuro_san", replacement: browserNeuroSan },
      { find: "objsize", replacement: path.join(npmPkg, "dist/stubs/objsize.js") },
      { find: "inspect", replacement: path.join(npmPkg, "dist/stubs/inspect.js") },
      { find: "threading", replacement: path.join(npmPkg, "dist/stubs/threading.js") },
      { find: "exceptions", replacement: path.join(npmPkg, "dist/stubs/exceptions.js") },
    ],
  },
  optimizeDeps: {
    exclude: ["@cognizant-ai-lab/neuro-san-npm"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
