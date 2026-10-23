import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {
    checkHealth,
    listPublishedNetworks,
    publishNetwork,
    unpublishNetwork,
} from "../../../../controller/publish/Publish"

const SERVER_URL = "https://publish.test"
const NETWORK_NAME = "cailville_bakery"
const ORG_NAME = "cailville"
const HOCON = "{ tools: [] }"
const PUBLISH_ID = "dep-123"
const PUBLISHED_URL = "https://publish.test/sites/cailville_bakery"

// Covers each publish server endpoint the client calls. The comment on each test names the endpoints it exercises.
describe("Publish", () => {
    withStrictMocks()

    let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

    const create = (refreshTheme?: boolean) =>
        publishNetwork({
            serverUrl: SERVER_URL,
            orgName: ORG_NAME,
            networkName: NETWORK_NAME,
            hocon: HOCON,
            refreshTheme,
        })

    beforeEach(() => {
        fetchMock = vi.fn<typeof fetch>()
        vi.stubGlobal("fetch", fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // GET /health
    it("should check the server's health endpoint through our /api/publish route", async () => {
        fetchMock.mockResolvedValue(Response.json({status: "ok"}))

        const isHealthy = await checkHealth(SERVER_URL)

        expect(isHealthy).toBe(true)
        expect(fetchMock.mock.calls[0][0]).toBe(`/api/publish/health?server=${encodeURIComponent(SERVER_URL)}`)
    })

    // GET /health
    it.each([
        {desc: "it can't be reached", response: Response.json({detail: "x"}, {status: httpStatus.BAD_GATEWAY})},
        {desc: "it isn't OK", response: Response.json({status: "degraded"})},
        {desc: "the request fails", response: new TypeError("Failed to fetch")},
    ])("should report an unhealthy server when $desc", async ({response}) => {
        if (response instanceof Response) {
            fetchMock.mockResolvedValue(response)
        } else {
            fetchMock.mockRejectedValue(response)
        }

        await expect(checkHealth(SERVER_URL)).resolves.toBe(false)
    })

    // POST /deployments
    it("should upload the HOCON with its name and the org name", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create()

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe(`/api/publish/deployments?server=${encodeURIComponent(SERVER_URL)}`)
        expect(init?.method).toBe("POST")
        const form = init?.body as FormData
        expect(form.get("name")).toBe(NETWORK_NAME)
        expect(form.get("org_name")).toBe(ORG_NAME)
        const file = form.get("file") as File
        expect(file.name).toBe(`${NETWORK_NAME}.hocon`)
        expect(await file.text()).toBe(HOCON)
    })

    // POST /deployments
    it("should send the org name in lowercase", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await publishNetwork({
            serverUrl: SERVER_URL,
            orgName: "Cailville-Stage",
            networkName: NETWORK_NAME,
            hocon: HOCON,
            refreshTheme: false,
        })

        const form = fetchMock.mock.calls[0][1]?.body as FormData
        expect(form.get("org_name")).toBe("cailville-stage")
    })

    // POST /deployments
    it("should ask for a themed site that keeps its existing theme", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create()

        const form = fetchMock.mock.calls[0][1]?.body as FormData
        expect(form.get("theme")).toBe("true")
        expect(form.get("theme_refresh")).toBe("false")
    })

    // POST /deployments
    it("should ask for a new theme when asked to", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create(true)

        const form = fetchMock.mock.calls[0][1]?.body as FormData
        expect(form.get("theme_refresh")).toBe("true")
    })

    // POST /deployments, then GET /deployments/{id}/wait until it's ready
    it("should keep waiting while the server says it's still building, then return the live URL", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "queued"}, {status: 202}))
            .mockResolvedValueOnce(new Response(null, {status: 504}))
            .mockResolvedValueOnce(
                Response.json({id: PUBLISH_ID, name: NETWORK_NAME, status: "ready", url: PUBLISHED_URL})
            )

        const ready = await create()

        expect(ready).toEqual({id: PUBLISH_ID, name: NETWORK_NAME, url: PUBLISHED_URL})
        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(fetchMock.mock.calls[1][0]).toContain(`/api/publish/deployments/${PUBLISH_ID}/wait?`)
    })

    // POST /deployments, then GET /deployments/{id}/wait ends as failed
    it("should fail with the server's error when the build fails", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "building"}, {status: 202}))
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "failed", error: "pip install failed"}))

        await expect(create()).rejects.toThrow("pip install failed")
    })

    // POST /deployments rejected
    it("should fail with the server's explanation when it rejects the upload", async () => {
        fetchMock.mockResolvedValue(Response.json({detail: "Invalid token"}, {status: 401}))

        await expect(create()).rejects.toThrow("Publishing failed (401): Invalid token")
    })

    // POST /deployments rejected
    it("should fail with the server's validation errors when they aren't a plain message", async () => {
        fetchMock.mockResolvedValue(
            Response.json({detail: [{loc: ["body", "file"], msg: "Field required"}]}, {status: 422})
        )

        await expect(create()).rejects.toThrow("Field required")
    })

    // POST /deployments ends as stopped
    it("should say how publishing ended when the server gives no error", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "stopped"}, {status: 202}))

        await expect(create()).rejects.toThrow("Publishing ended as stopped")
    })

    // POST /deployments rejected
    it("should fail with the status text when the error isn't JSON", async () => {
        fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", {status: 502, statusText: "Bad Gateway"}))

        await expect(create()).rejects.toThrow("Publishing failed (502): Bad Gateway")
    })

    // GET /deployments
    it("should list only our org's networks, with no URL for the unpublished ones", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [
                    {
                        id: "other-org",
                        name: NETWORK_NAME,
                        org_name: "someone-else",
                        status: "ready",
                        url: "x",
                    },
                    {id: "stopped", name: NETWORK_NAME, org_name: ORG_NAME, status: "stopped"},
                    {
                        id: PUBLISH_ID,
                        name: NETWORK_NAME,
                        org_name: ORG_NAME,
                        status: "ready",
                        url: PUBLISHED_URL,
                    },
                ],
            })
        )

        const published = await listPublishedNetworks(SERVER_URL, ORG_NAME)

        expect(fetchMock.mock.calls[0][0]).toBe(`/api/publish/deployments?server=${encodeURIComponent(SERVER_URL)}`)
        expect(published).toEqual([
            {id: "stopped", name: NETWORK_NAME, url: null},
            {id: PUBLISH_ID, name: NETWORK_NAME, url: PUBLISHED_URL},
        ])
    })

    // GET /deployments
    it("should list a network whose publish failed as unpublished", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [{id: "failed", name: NETWORK_NAME, org_name: ORG_NAME, status: "failed"}],
            })
        )

        await expect(listPublishedNetworks(SERVER_URL, ORG_NAME)).resolves.toEqual([
            {id: "failed", name: NETWORK_NAME, url: null},
        ])
    })

    // GET /deployments
    it("should list our org's networks when the server spells the org name with different case", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [
                    {
                        id: PUBLISH_ID,
                        name: NETWORK_NAME,
                        org_name: ORG_NAME.toUpperCase(),
                        status: "ready",
                        url: PUBLISHED_URL,
                    },
                ],
            })
        )

        await expect(listPublishedNetworks(SERVER_URL, ORG_NAME)).resolves.toEqual([
            {id: PUBLISH_ID, name: NETWORK_NAME, url: PUBLISHED_URL},
        ])
    })

    it("should leave out networks that are still building", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [{id: "building", name: NETWORK_NAME, org_name: ORG_NAME, status: "building"}],
            })
        )

        await expect(listPublishedNetworks(SERVER_URL, ORG_NAME)).resolves.toEqual([])
    })

    // DELETE /deployments/{id}
    it("should unpublish the network", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "stopped"}))

        await unpublishNetwork(SERVER_URL, PUBLISH_ID)

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe(`/api/publish/deployments/${PUBLISH_ID}?server=${encodeURIComponent(SERVER_URL)}`)
        expect(init?.method).toBe("DELETE")
    })
})
