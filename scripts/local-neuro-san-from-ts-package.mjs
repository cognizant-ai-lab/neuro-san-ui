/**
 * Local neuro-san HTTP shim backed by @cognizant-ai-lab/neuro-san-npm (direct sessions).
 * Drop-in stand-in for remote NEURO_SAN_SERVER_URL. Local only; no commit intended.
 *
 * Usage (from neuro-san-ui):
 *   node --preserve-symlinks scripts/local-neuro-san-from-ts-package.mjs
 * Then set: NEURO_SAN_SERVER_URL=http://localhost:8080
 *
 * Networks: omit AGENT_MANIFEST_FILE to use registries shipped with the npm
 * package. Set AGENT_MANIFEST_FILE (and optionally NEURO_SAN_ROOT) to override.
 */
import http from "node:http"
import {
    ConciergeSessionFactory,
    DirectAgentSessionFactory,
    ChatMessageType,
} from "@cognizant-ai-lab/neuro-san-npm"

const PORT = Number(process.env.NEURO_SAN_LOCAL_PORT ?? 8080)
const conciergeFactory = new ConciergeSessionFactory()
const agentFactory = new DirectAgentSessionFactory()

// A ChatMessageType member is an IntEnum stand-in: a bare object carrying .name
// and coercing to its proto number.
const isChatMessageTypeMember = (value) =>
    value !== null &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.valueOf === "function" &&
    Number.isFinite(Number(value))

// The real neuro-san server hands these ChatMessage dicts to protobuf, and protobuf
// JSON renders an enum field as its wire name ("AI"). The npm package has no proto
// layer, so without this the raw enum member reaches the client as {"name":"AI"} and
// every `chatMessage.type === ChatMessageType.AI` comparison in the UI silently fails
// -- the chat looks empty even though the model answered. Recurse, because the
// messages nested in chat_context.chat_histories carry a "type" too.
const toWireTypes = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => toWireTypes(entry))
    }
    if (value === null || typeof value !== "object") {
        return value
    }
    const converted = {}
    for (const [key, entry] of Object.entries(value)) {
        converted[key] =
            key === "type" && isChatMessageTypeMember(entry)
                ? ChatMessageType.to_string(entry)
                : toWireTypes(entry)
    }
    return converted
}

const readJson = async (req) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

const sendJson = (res, status, body) => {
    const payload = JSON.stringify(body)
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    })
    res.end(payload)
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            })
            res.end()
            return
        }

        const url = new URL(req.url ?? "/", `http://localhost:${PORT}`)
        const {pathname} = url

        if (req.method === "GET" && (pathname === "/" || pathname === "/health")) {
            sendJson(res, 200, {
                status: "ok",
                backend: "neuro-san-npm-direct",
                agent_manifest_file: process.env.AGENT_MANIFEST_FILE ?? null,
            })
            return
        }

        if (req.method === "GET" && pathname === "/api/v1/list") {
            const session = conciergeFactory.create_session("direct", null, null, null, null)
            sendJson(res, 200, session.list({}))
            return
        }

        const agentMatch = pathname.match(/^\/api\/v1\/([^/]+)\/(connectivity|function|streaming_chat)$/u)
        if (!agentMatch) {
            sendJson(res, 404, {error: `No route for ${pathname}`})
            return
        }

        const agentName = decodeURIComponent(agentMatch[1])
        const action = agentMatch[2]
        const session = agentFactory.create_session(agentName, false, null, null)

        if (action === "connectivity" && req.method === "GET") {
            sendJson(res, 200, session.connectivity({}))
            return
        }
        if (action === "function" && req.method === "GET") {
            sendJson(res, 200, session.function({}))
            return
        }
        if (action === "streaming_chat" && req.method === "POST") {
            const body = await readJson(req)
            const headerKey = req.headers["x-openai-api-key"]
            if (typeof headerKey === "string" && headerKey.trim()) {
                process.env.OPENAI_API_KEY = headerKey.trim()
            }
            res.writeHead(200, {
                "Content-Type": "application/x-ndjson",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Transfer-Encoding": "chunked",
            })
            // AsyncCollatingQueue.put_final_item() reads the end-marker as
            // this.END_MESSAGE, which python resolves to the class attribute but
            // JavaScript looks up on the instance and finds nothing. The queue
            // therefore ends every run by pushing undefined, which the consumer
            // skips instead of stopping on, so the response never closes and the
            // browser waits on a stream that is already over. Put the class's own
            // marker on the instance so the end-marker is the one it checks for.
            const queue = session.invocation_context?.get_queue?.()
            if (queue != null && queue.END_MESSAGE == null) {
                queue.END_MESSAGE = queue.constructor.END_MESSAGE
            }

            const stream = session.streaming_chat(body)
            if (stream && typeof stream[Symbol.asyncIterator] === "function") {
                for await (const chatResponse of stream) {
                    res.write(`${JSON.stringify(toWireTypes(chatResponse))}\n`)
                }
            } else if (stream && typeof stream[Symbol.iterator] === "function") {
                for (const chatResponse of stream) {
                    const chunk = chatResponse && typeof chatResponse.then === "function"
                        ? await chatResponse
                        : chatResponse
                    res.write(`${JSON.stringify(toWireTypes(chunk))}\n`)
                }
            } else if (stream != null) {
                res.write(`${JSON.stringify(toWireTypes(stream))}\n`)
            }
            res.end()
            return
        }

        sendJson(res, 405, {error: `Method ${req.method} not allowed for ${pathname}`})
    } catch (error) {
        console.error(error)
        sendJson(res, 500, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })
    }
})

server.listen(PORT, () => {
    console.log(`Local neuro-san (ts-package direct) listening on http://localhost:${PORT}`)
    if (process.env.AGENT_MANIFEST_FILE) {
        console.log(`AGENT_MANIFEST_FILE=${process.env.AGENT_MANIFEST_FILE} (overrides loaded)`)
    } else {
        console.log("AGENT_MANIFEST_FILE unset (use for overrides) — using packaged registries")
    }
    if (process.env.NEURO_SAN_ROOT) {
        console.log(`NEURO_SAN_ROOT=${process.env.NEURO_SAN_ROOT}`)
    }
})
