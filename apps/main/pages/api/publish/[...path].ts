/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"

import {ENABLE_PUBLISHING_ENV_VAR, PUBLISH_BEARER_TOKEN_ENV_VAR, PUBLISH_SERVER_URL_ENV_VAR} from "../../../Const"

// Read the raw body so multipart uploads pass through unchanged
export const config = {api: {bodyParser: false}}

// The publish server endpoints the UI uses (see ui-common's controller/publish/Publish.ts). The token allows every
// endpoint, including ones that change the server's settings, so nothing else is forwarded.
const ALLOWED_REQUESTS: readonly {readonly method: string; readonly path: RegExp}[] = [
    {method: "GET", path: /^health$/u},
    {method: "GET", path: /^deployments$/u},
    {method: "POST", path: /^deployments$/u},
    {method: "GET", path: /^deployments\/[\w-]+\/wait$/u},
    {method: "DELETE", path: /^deployments\/[\w-]+$/u},
]

const readBody = async (req: NextApiRequest): Promise<Uint8Array<ArrayBuffer>> => {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
        chunks.push(Buffer.from(chunk))
    }
    return new Uint8Array(Buffer.concat(chunks))
}

/**
 * Parses the publish server URL the browser sent.
 * @returns The URL, or null if it's missing, not http(s), or has a username or password
 */
const parseServerUrl = (server: string | string[] | undefined): URL | null => {
    if (typeof server !== "string") return null

    try {
        const url = new URL(server.endsWith("/") ? server : `${server}/`)
        return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password ? url : null
    } catch {
        return null
    }
}

const isAllowedRequest = (method: string | undefined, path: string): boolean =>
    ALLOWED_REQUESTS.some((allowed) => allowed.method === method && allowed.path.test(path))

/**
 * Forwards requests to the publish server, which doesn't allow requests from browsers (no CORS headers).
 * `/api/publish/<path>?server=<server URL>&<query>` is sent to `<server URL>/<path>?<query>` with the bearer token
 * added. The route only exists while publishing is enabled. It forwards only to the configured publish server, and
 * only the requests the UI makes, so callers can't send the token elsewhere or use it for other endpoints.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env[ENABLE_PUBLISHING_ENV_VAR] !== "true") {
        res.status(httpStatus.NOT_FOUND).json({detail: "Publishing is not enabled"})
        return
    }

    // Startup refuses to run with publishing enabled and no token, so it's always set here.
    const token = process.env[PUBLISH_BEARER_TOKEN_ENV_VAR]

    const {path, server, ...query} = req.query

    const serverUrl = parseServerUrl(server)
    if (!serverUrl) {
        res.status(httpStatus.BAD_REQUEST).json({detail: "Missing or invalid publish server URL"})
        return
    }

    const allowedServerUrl = parseServerUrl(process.env[PUBLISH_SERVER_URL_ENV_VAR])
    if (serverUrl.href !== allowedServerUrl?.href) {
        res.status(httpStatus.FORBIDDEN).json({
            detail: `Publishing is only allowed to ${allowedServerUrl?.href ?? "the configured publish server"}`,
        })
        return
    }

    const serverPath = [path].flat().join("/")
    if (!isAllowedRequest(req.method, serverPath)) {
        res.status(httpStatus.FORBIDDEN).json({detail: `${req.method} /${serverPath} isn't a publishing request`})
        return
    }

    const target = new URL(serverPath, serverUrl)
    for (const [param, value] of Object.entries(query)) {
        for (const item of [value].flat()) {
            target.searchParams.append(param, item)
        }
    }

    const contentType = req.headers["content-type"]

    try {
        const upstream = await fetch(target, {
            method: req.method,
            // A redirect could send the token to a path or host the checks above didn't allow
            redirect: "error",
            headers: {
                Authorization: `Bearer ${token}`,
                ...(contentType ? {"Content-Type": contentType} : {}),
            },
            body: req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req),
        })

        const upstreamContentType = upstream.headers.get("content-type")
        if (upstreamContentType) {
            res.setHeader("Content-Type", upstreamContentType)
        }
        res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
    } catch (e) {
        res.status(httpStatus.BAD_GATEWAY).json({detail: `Couldn't reach the publish server: ${String(e)}`})
    }
}
