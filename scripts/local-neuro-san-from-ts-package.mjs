/**
 * Local neuro-san HTTP shim backed by @cognizant-ai-lab/neuro-san-npm (direct sessions).
 * Drop-in stand-in for remote NEURO_SAN_SERVER_URL. Local only; no commit intended.
 *
 * Usage (from neuro-san-ui):
 *   node --preserve-symlinks scripts/local-neuro-san-from-ts-package.mjs
 * Then set: NEURO_SAN_SERVER_URL=http://localhost:8080
 */
import http from "node:http"
import {URL, pathToFileURL} from "node:url"

if (!process.env.AGENT_MANIFEST_FILE) {
    process.env.AGENT_MANIFEST_FILE =
        "/Users/971999/Documents/git_repo/neuro-san/neuro_san/registries/manifest.hocon"
}

import {ConciergeSessionFactory} from "@cognizant-ai-lab/neuro-san-npm"

const PORT = Number(process.env.NEURO_SAN_LOCAL_PORT ?? 8080)
const conciergeFactory = new ConciergeSessionFactory()

let agentFactoryPromise = null
const getAgentFactory = async () => {
    if (!agentFactoryPromise) {
        agentFactoryPromise = import(
            pathToFileURL(
                new URL(
                    "../node_modules/@cognizant-ai-lab/neuro-san-npm/dist/generated/neuro_san/client/direct_agent_session_factory.js",
                    import.meta.url,
                ).pathname,
            ).href,
        ).then((m) => new m.DirectAgentSessionFactory())
    }
    return agentFactoryPromise
}

let chatMessageTypePromise = null
const getChatMessageType = async () => {
    if (!chatMessageTypePromise) {
        chatMessageTypePromise = import(
            pathToFileURL(
                new URL(
                    "../node_modules/@cognizant-ai-lab/neuro-san-npm/dist/generated/neuro_san/message/types/chat_message_type.js",
                    import.meta.url,
                ).pathname,
            ).href,
        ).then((m) => m.ChatMessageType)
    }
    return chatMessageTypePromise
}

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
const toWireTypes = (value, ChatMessageType) => {
    if (Array.isArray(value)) {
        return value.map((entry) => toWireTypes(entry, ChatMessageType))
    }
    if (value === null || typeof value !== "object") {
        return value
    }
    const converted = {}
    for (const [key, entry] of Object.entries(value)) {
        converted[key] =
            key === "type" && isChatMessageTypeMember(entry)
                ? ChatMessageType.to_string(entry)
                : toWireTypes(entry, ChatMessageType)
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
            sendJson(res, 200, {status: "ok", backend: "neuro-san-npm-direct"})
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
        const agentFactory = await getAgentFactory()
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
            const ChatMessageType = await getChatMessageType()
            const stream = session.streaming_chat(body)
            if (stream && typeof stream[Symbol.asyncIterator] === "function") {
                for await (const chatResponse of stream) {
                    res.write(`${JSON.stringify(toWireTypes(chatResponse, ChatMessageType))}\n`)
                }
            } else if (stream && typeof stream[Symbol.iterator] === "function") {
                for (const chatResponse of stream) {
                    const chunk = chatResponse && typeof chatResponse.then === "function"
                        ? await chatResponse
                        : chatResponse
                    res.write(`${JSON.stringify(toWireTypes(chunk, ChatMessageType))}\n`)
                }
            } else if (stream != null) {
                res.write(`${JSON.stringify(toWireTypes(stream, ChatMessageType))}\n`)
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
    console.log(`Set NEURO_SAN_SERVER_URL=http://localhost:${PORT} (was https://neuro-san-dev.decisionai.ml)`)
})
