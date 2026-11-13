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
import {createMocks, RequestMethod} from "node-mocks-http"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {ENABLE_PUBLISHING_ENV_VAR, PUBLISH_BEARER_TOKEN_ENV_VAR} from "../../../../Const"
import handler from "../../../../pages/api/publish/[...path]"

const SERVER_URL = "https://publish.example.com"
const BUNDLE_CONTENTS = "bundle contents"
const BUNDLE_DISPOSITION = 'attachment; filename="cailville_bakery.tar.gz"'
const HOCON = "hocon contents"

// Each test sends one of the publish server endpoints through the route. The comment on each test or group names it.
describe("Publish API route", () => {
    withStrictMocks()

    let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

    const callProxy = async (method: RequestMethod, query: Record<string, string | string[]>, body?: string) => {
        const {req, res} = createMocks({method, query, headers: body ? {"content-type": "text/plain"} : {}})
        const handled = handler(req, res)
        if (method !== "GET") {
            req.send(body ?? "")
        }
        await handled
        return res
    }

    beforeEach(() => {
        fetchMock = vi.fn<typeof fetch>()
        vi.stubGlobal("fetch", fetchMock)
        vi.stubEnv(ENABLE_PUBLISHING_ENV_VAR, "true")
        vi.stubEnv(PUBLISH_BEARER_TOKEN_ENV_VAR, "test-token")
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    // GET /deployments/{id}/wait - Status of Deployment
    it("should forward to the server path with the query and the bearer token from the environment", async () => {
        fetchMock.mockResolvedValue(Response.json({id: "dep-1", status: "ready"}))

        const res = await callProxy("GET", {path: ["deployments", "dep-1", "wait"], server: SERVER_URL, timeout: "60"})

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            new URL(`${SERVER_URL}/deployments/dep-1/wait?timeout=60`),
            expect.objectContaining({headers: expect.objectContaining({Authorization: "Bearer test-token"})})
        )
        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(JSON.parse(res._getData().toString())).toEqual({id: "dep-1", status: "ready"})
    })

    // POST /deployments - Create Network
    it("should pass the upload body and its content type through unchanged", async () => {
        fetchMock.mockResolvedValue(Response.json({id: "dep-1"}, {status: httpStatus.ACCEPTED}))

        const res = await callProxy("POST", {path: ["deployments"], server: SERVER_URL}, HOCON)

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            expect.anything(),
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({"Content-Type": "text/plain"}),
                body: expect.toSatisfy((body: Uint8Array) => new TextDecoder().decode(body) === HOCON),
            })
        )
        expect(res._getStatusCode()).toBe(httpStatus.ACCEPTED)
    })

    // DELETE /deployments/{id} - Delete Network
    it("should forward to a server URL that ends in a slash and relay an empty response", async () => {
        fetchMock.mockResolvedValue(new Response(null, {status: httpStatus.NO_CONTENT}))

        const res = await callProxy("DELETE", {path: ["deployments", "dep-1"], server: `${SERVER_URL}/`})

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(new URL(`${SERVER_URL}/deployments/dep-1`), expect.anything())
        expect(res._getStatusCode()).toBe(httpStatus.NO_CONTENT)
    })

    // GET /deployments/{id}/bundle - Build Deployment Bundle
    it("should relay a bundle with the file name the server gave it", async () => {
        fetchMock.mockResolvedValue(
            new Response(BUNDLE_CONTENTS, {
                headers: {"Content-Type": "application/gzip", "Content-Disposition": BUNDLE_DISPOSITION},
            })
        )

        const res = await callProxy("GET", {path: ["deployments", "dep-1", "bundle"], server: SERVER_URL})

        expect(res.getHeader("Content-Type")).toBe("application/gzip")
        expect(res.getHeader("Content-Disposition")).toBe(BUNDLE_DISPOSITION)
        expect(res._getData().toString()).toBe(BUNDLE_CONTENTS)
    })

    // GET /health - Health Check. The route doesn't look at the path, so these use the simplest endpoint.
    describe("Health check", () => {
        it("should not exist while publishing is disabled", async () => {
            vi.stubEnv(ENABLE_PUBLISHING_ENV_VAR, "false")

            const res = await callProxy("GET", {path: ["health"], server: SERVER_URL})

            expect(res._getStatusCode()).toBe(httpStatus.NOT_FOUND)
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it.each([
            {desc: "missing", server: undefined},
            {desc: "not a URL", server: "not a url"},
            {desc: "not http(s)", server: "file:///etc/passwd"},
        ])("should refuse a server URL that's $desc", async ({server}) => {
            const res = await callProxy("GET", {path: ["health"], ...(server ? {server} : {})})

            expect(res._getStatusCode()).toBe(httpStatus.BAD_REQUEST)
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it("should explain when the server can't be reached", async () => {
            // What fetch throws for a host that doesn't exist or a refused connection
            fetchMock.mockRejectedValue(new TypeError("fetch failed"))

            const res = await callProxy("GET", {path: ["health"], server: SERVER_URL})

            expect(res._getStatusCode()).toBe(httpStatus.BAD_GATEWAY)
        })

        it("should rethrow an unexpected error instead of saying the server couldn't be reached", async () => {
            fetchMock.mockRejectedValue(new RangeError("Something else went wrong"))

            await expect(callProxy("GET", {path: ["health"], server: SERVER_URL})).rejects.toThrow(
                "Something else went wrong"
            )
        })

        it("should say so when the server doesn't answer in time", async () => {
            fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"))

            const res = await callProxy("GET", {path: ["health"], server: SERVER_URL})

            expect(res._getStatusCode()).toBe(httpStatus.GATEWAY_TIMEOUT)
        })
    })
})
