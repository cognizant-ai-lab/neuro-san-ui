const g = globalThis
if (!g.__neuroSanBrowserFs) {
  g.__neuroSanBrowserFs = new Map()
}
const files = g.__neuroSanBrowserFs

export function seedFile(path, contents) {
  const key = normalize(path)
  const data = typeof contents === "string" ? new TextEncoder().encode(contents) : contents
  files.set(key, data)
}

function normalize(p) {
  return String(p).replace(/\\/g, "/")
}

export function open(path, mode = "r") {
  const key = normalize(path)
  const binary = String(mode).includes("b")
  let data = files.get(key)
  if (!data) {
    const base = key.split("/").pop()
    for (const [k, v] of files) {
      if (k.endsWith("/" + base) || k === base) {
        data = v
        break
      }
    }
  }
  if (!data) {
    throw new Error(`browser open(): file not found: ${path} (have: ${[...files.keys()].join(", ")})`)
  }
  return {
    read() {
      return binary ? data : new TextDecoder().decode(data)
    },
    close() {},
    __enter__() { return this },
    __exit__() { this.close() },
  }
}

export default { open, seedFile }
