/**
 * Sync browser HOCON → plain object for neuro-san registries.
 * Handles: # comments, """ multiline strings, optional commas, trailing commas.
 */

function stripLineComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      let inStr = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"' && line[i - 1] !== "\\") {
          // start of """ handled elsewhere; here single "
          inStr = !inStr
        }
        if ((c === "#") && !inStr) return line.slice(0, i)
      }
      return line
    })
    .join("\n")
}

function convertTripleQuotes(text) {
  return text.replace(/"""([\s\S]*?)"""/g, (_, body) => JSON.stringify(body))
}

function insertMissingCommas(s) {
  // After a JSON value end, before next key or value opener on a following line
  const valueEnd = /("(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\})\s*$/
  // Simpler multi-pass regexes that worked for manifests + agent files:
  s = s.replace(/(["\d]|true|false|null)\s*\n(\s*")/g, "$1,\n$2")
  s = s.replace(/([}\]])\s*\n(\s*")/g, "$1,\n$2")
  s = s.replace(/(["\d]|true|false|null)\s*\n(\s*[{[])/g, "$1,\n$2")
  s = s.replace(/([}\]])\s*\n(\s*[{[])/g, "$1,\n$2")
  // after closing brace/bracket of nested, before another open brace in array
  s = s.replace(/(\})\s*\n(\s*\{)/g, "$1,\n$2")
  return s
}

function hoconToJsonish(text) {
  let s = stripLineComments(String(text))
  s = convertTripleQuotes(s)
  s = s.replace(/,\s*([}\]])/g, "$1")
  s = insertMissingCommas(s)
  // second pass trailing commas (after inserts)
  s = s.replace(/,\s*([}\]])/g, "$1")
  return s
}

function parseSync(hocon_string) {
  const cleaned = hoconToJsonish(hocon_string).trim()
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    const pos = Number((/position (\d+)/.exec(e.message) || [])[1])
    const ctx =
      Number.isFinite(pos)
        ? cleaned.slice(Math.max(0, pos - 80), pos + 80)
        : cleaned.slice(0, 200)
    throw new Error(`browser pyhocon parse failed: ${e.message} :: near ${JSON.stringify(ctx)}`)
  }
}

function toPlain(obj) {
  if (obj == null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(toPlain)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "function" || k === "_data") continue
    out[String(k)] = toPlain(v)
  }
  return out
}

export class ConfigTree {
  constructor(obj) {
    Object.assign(this, obj || {})
  }
  put(key, value) {
    this[key] = value
  }
  as_plain_ordered_dict() {
    const out = {}
    for (const [k, v] of Object.entries(this)) {
      if (typeof v === "function") continue
      out[k] = v && typeof v.as_plain_ordered_dict === "function" ? v.as_plain_ordered_dict() : v
    }
    return out
  }
}

export const ConfigFactory = {
  parse_String(hocon_string, _opts = {}) {
    const plain = toPlain(parseSync(hocon_string))
    return Object.assign(new ConfigTree(plain), plain)
  },
  parse_string(hocon_string, opts) {
    return ConfigFactory.parse_String(hocon_string, opts)
  },
}

export default { ConfigFactory, ConfigTree }
