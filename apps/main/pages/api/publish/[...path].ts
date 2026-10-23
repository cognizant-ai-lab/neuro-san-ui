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

import {ENABLE_PUBLISHING_ENV_VAR, PUBLISH_BEARER_TOKEN_ENV_VAR} from "../../../Const"

// Read the raw body so multipart uploads pass through unchanged
export const config = {api: {bodyParser: false}}

// Longer than the 60 seconds the publish client asks /wait to hold open, so only a server that stops answering
// times out
const UPSTREAM_TIMEOUT_MS = 90_000

const readBody = async (req: NextApiRequest): Promise<Uint8Array<ArrayBuffer>> => {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
        chunks.push(Buffer.from(chunk))
    }
    return new Uint8Array(Buffer.concat(chunks))
}

/**
 * Parses the publish server URL the browser sent.
 * @returns The URL, or null if it's missing or not http(s)
 */
const parseServerUrl = (server: string | string[] | undefined): URL | null => {
    if (typeof server !== "string") return null

    try {
        const url = new URL(server.endsWith("/") ? server : `${server}/`)
        return url.protocol === "http:" || url.protocol === "https:" ? url : null
    } catch {
        return null
    }
}

/**
 * Forwards requests to the publish server, which doesn't allow requests from browsers (no CORS headers).
 * `/api/publish/<path>?server=<server URL>&<query>` is sent to `<server URL>/<path>?<query>` with the bearer token
 * added. The route only exists while publishing is enabled.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env[ENABLE_PUBLISHING_ENV_VAR] !== "true") {
        res.status(httpStatus.NOT_FOUND).json({detail: "Publishing is not enabled"})
        return
    }

    // Startup refuses to run with publishing enabled and no token, so it's always set here.
    // WARNING: this sends the token to whatever publish server URL the user enters in Settings, so anyone who can use
    // the app can have it sent to a server they control. Consider only forwarding to an allowed host.
    const token = process.env[PUBLISH_BEARER_TOKEN_ENV_VAR]

    const {path, server, ...query} = req.query

    const serverUrl = parseServerUrl(server)
    if (!serverUrl) {
        res.status(httpStatus.BAD_REQUEST).json({detail: "Missing or invalid publish server URL"})
        return
    }

    const target = new URL([path].flat().join("/"), serverUrl)
    for (const [param, value] of Object.entries(query)) {
        for (const item of [value].flat()) {
            target.searchParams.append(param, item)
        }
    }

    const contentType = req.headers["content-type"]

    try {
        const upstream = await fetch(target, {
            method: req.method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(contentType ? {"Content-Type": contentType} : {}),
            },
            body: req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })

        const upstreamContentType = upstream.headers.get("content-type")
        if (upstreamContentType) {
            res.setHeader("Content-Type", upstreamContentType)
        }
        res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
    } catch (e) {
        // We're a gateway to the publish server, so failing to reach it is a 502, and it not answering in time a 504
        if (e instanceof DOMException && e.name === "TimeoutError") {
            res.status(httpStatus.GATEWAY_TIMEOUT).json({detail: "The publish server didn't answer in time"})
        } else {
            res.status(httpStatus.BAD_GATEWAY).json({detail: `Couldn't reach the publish server: ${String(e)}`})
        }
    }
}
