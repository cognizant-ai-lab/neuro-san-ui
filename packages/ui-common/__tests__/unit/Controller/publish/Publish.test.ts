import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {
    checkHealth,
    fetchBundle,
    isPublishNameTaken,
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
const DEPLOYMENTS_ROUTE = `/api/publish/deployments?server=${encodeURIComponent(SERVER_URL)}`

// Matches a FormData body whose fields have these values
const formWith = (fields: Record<string, string>) =>
    expect.toSatisfy((form: FormData) => Object.entries(fields).every(([field, value]) => form.get(field) === value))

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

    // GET /health, then GET /deployments
    it("should check the server's health, then that it accepts our token, through our /api/publish route", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({status: "ok", port_pool: {capacity: 20}}))
            .mockResolvedValueOnce(Response.json({deployments: []}))

        const isHealthy = await checkHealth(SERVER_URL)

        expect(isHealthy).toBe(true)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            `/api/publish/health?server=${encodeURIComponent(SERVER_URL)}`,
            expect.anything()
        )
        expect(fetchMock).toHaveBeenNthCalledWith(2, DEPLOYMENTS_ROUTE, expect.anything())
    })

    // GET /health, then GET /deployments
    it.each([
        {desc: "it can't be reached", responses: [Response.json({detail: "x"}, {status: httpStatus.BAD_GATEWAY})]},
        {desc: "it isn't OK", responses: [Response.json({status: "degraded", port_pool: {}})]},
        {desc: "it isn't a publishing server", responses: [Response.json({status: "ok"})]},
        {
            desc: "it turns down our token",
            responses: [
                Response.json({status: "ok", port_pool: {}}),
                Response.json({detail: "Unauthorized"}, {status: httpStatus.UNAUTHORIZED}),
            ],
        },
    ])("should report an unhealthy server when $desc", async ({responses}) => {
        for (const response of responses) {
            fetchMock.mockResolvedValueOnce(response)
        }

        await expect(checkHealth(SERVER_URL)).resolves.toBe(false)
    })

    // GET /health
    it("should report an unhealthy server when the request fails", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

        await expect(checkHealth(SERVER_URL)).resolves.toBe(false)
    })

    // POST /deployments
    it("should upload the HOCON with its name and the org name", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create()

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DEPLOYMENTS_ROUTE, {
            method: "POST",
            body: expect.toSatisfy(
                (form: FormData) =>
                    form.get("name") === NETWORK_NAME &&
                    form.get("org_name") === ORG_NAME &&
                    (form.get("file") as File).name === `${NETWORK_NAME}.hocon` &&
                    (form.get("file") as File).size === HOCON.length
            ),
        })
    })

    // POST /deployments
    it("should ask for a themed site that keeps its existing theme", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create()

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DEPLOYMENTS_ROUTE, {
            method: "POST",
            body: formWith({theme: "true", theme_refresh: "false"}),
        })
    })

    // POST /deployments
    it("should ask for a new theme when asked to", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "ready", url: PUBLISHED_URL}, {status: 202}))

        await create(true)

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DEPLOYMENTS_ROUTE, {
            method: "POST",
            body: formWith({theme_refresh: "true"}),
        })
    })

    // POST /deployments, then GET /deployments/{id}/wait until it's ready
    it("should keep waiting while the server says it's still building, then return the live URL", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "queued"}, {status: 202}))
            // The server answers 504 when a wait times out before the build is done
            .mockResolvedValueOnce(
                Response.json({id: PUBLISH_ID, status: "building"}, {status: httpStatus.GATEWAY_TIMEOUT})
            )
            .mockResolvedValueOnce(
                Response.json({id: PUBLISH_ID, name: NETWORK_NAME, status: "ready", url: PUBLISHED_URL})
            )

        const liveNetwork = await create()

        expect(liveNetwork).toEqual({id: PUBLISH_ID, url: PUBLISHED_URL})
        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining(`/api/publish/deployments/${PUBLISH_ID}/wait?`),
            {signal: undefined}
        )
    })

    // POST /deployments, then GET /deployments/{id}/wait ends as failed
    it("should fail with the server's error when the build fails", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "building"}, {status: 202}))
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "failed", error: "pip install failed"}))

        await expect(create()).rejects.toThrow("pip install failed")
    })

    // POST /deployments
    it("should report the server's id for the network as soon as the server accepts it", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "queued"}, {status: 202}))
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "failed", error: "pip install failed"}))
        const onAccepted = vi.fn()

        await expect(
            publishNetwork({
                serverUrl: SERVER_URL,
                orgName: ORG_NAME,
                networkName: NETWORK_NAME,
                hocon: HOCON,
                onAccepted,
            })
        ).rejects.toThrow("pip install failed")

        expect(onAccepted).toHaveBeenCalledWith(PUBLISH_ID)
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

    // POST /deployments, then GET /deployments/{id}/wait times out without the server answering
    it.each([
        {
            desc: "our route",
            response: Response.json(
                {detail: "The publishing server didn't answer in time"},
                {status: httpStatus.GATEWAY_TIMEOUT}
            ),
            reason: "The publishing server didn't answer in time",
        },
        {
            desc: "a proxy",
            response: new Response("<html>Gateway Timeout</html>", {
                status: httpStatus.GATEWAY_TIMEOUT,
                statusText: "Gateway Timeout",
            }),
            reason: "Gateway Timeout",
        },
    ])("should fail with the reason when $desc times out the wait", async ({response, reason}) => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "queued"}, {status: 202}))
            .mockResolvedValueOnce(response)

        await expect(create()).rejects.toThrow(`Waiting for the network to go live failed (504): ${reason}`)
    })

    // POST /deployments, then GET /deployments/{id}/wait rejected without a detail
    it("should fail with the status text when the error doesn't say why", async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({id: PUBLISH_ID, status: "queued"}, {status: 202}))
            .mockResolvedValueOnce(
                Response.json({}, {status: httpStatus.INTERNAL_SERVER_ERROR, statusText: "Internal Server Error"})
            )

        await expect(create()).rejects.toThrow("Waiting for the network to go live failed (500): Internal Server Error")
    })

    // POST /deployments rejected
    it("should fail with the status text when the error isn't JSON", async () => {
        fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", {status: 502, statusText: "Bad Gateway"}))

        await expect(create()).rejects.toThrow("Publishing failed (502): Bad Gateway")
    })

    // GET /deployments
    it("should list every org's published networks, with no URL for the unpublished ones", async () => {
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

        const published = await listPublishedNetworks(SERVER_URL)

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DEPLOYMENTS_ROUTE)
        expect(published).toEqual([{id: "other-org", url: "x"}, {id: "stopped"}, {id: PUBLISH_ID, url: PUBLISHED_URL}])
    })

    // GET /deployments
    it("should list a network whose publish failed as unpublished", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [{id: "failed", name: NETWORK_NAME, org_name: ORG_NAME, status: "failed"}],
            })
        )

        await expect(listPublishedNetworks(SERVER_URL)).resolves.toEqual([{id: "failed"}])
    })

    it("should leave out networks that are still building", async () => {
        fetchMock.mockResolvedValue(
            Response.json({
                capacity: {},
                deployments: [{id: "building", name: NETWORK_NAME, org_name: ORG_NAME, status: "building"}],
            })
        )

        await expect(listPublishedNetworks(SERVER_URL)).resolves.toEqual([])
    })

    // GET /deployments
    it.each([
        {desc: "is live", network: {name: NETWORK_NAME, org_name: ORG_NAME, status: "ready"}, isTaken: true},
        {desc: "is stopped", network: {name: NETWORK_NAME, org_name: ORG_NAME, status: "stopped"}, isTaken: true},
        {
            desc: "is in the org spelled another way",
            network: {name: NETWORK_NAME, org_name: "Cailville"},
            isTaken: true,
        },
        {desc: "is in another org", network: {name: NETWORK_NAME, org_name: "someone-else"}, isTaken: false},
        {desc: "has another name", network: {name: "cailville_bakery_2", org_name: ORG_NAME}, isTaken: false},
    ])("should say whether the name is taken when a network by it $desc", async ({network, isTaken}) => {
        fetchMock.mockResolvedValue(Response.json({capacity: {}, deployments: [{id: "x", ...network}]}))

        await expect(isPublishNameTaken(SERVER_URL, ORG_NAME, NETWORK_NAME)).resolves.toBe(isTaken)
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(DEPLOYMENTS_ROUTE)
    })

    // GET /deployments rejected
    it("should fail with the server's explanation when it can't list networks to check the name", async () => {
        fetchMock.mockResolvedValue(Response.json({detail: "Invalid token"}, {status: 401}))

        await expect(isPublishNameTaken(SERVER_URL, ORG_NAME, NETWORK_NAME)).rejects.toThrow(
            "Listing published networks failed (401): Invalid token"
        )
    })

    // DELETE /deployments/{id}
    it("should unpublish the network", async () => {
        fetchMock.mockResolvedValue(Response.json({id: PUBLISH_ID, status: "stopped"}))

        await unpublishNetwork(SERVER_URL, PUBLISH_ID)

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            `/api/publish/deployments/${PUBLISH_ID}?server=${encodeURIComponent(SERVER_URL)}`,
            {method: "DELETE"}
        )
    })

    // GET /deployments/{id}/bundle
    it("should fetch the bundle of a published network under the file name the server gave it", async () => {
        fetchMock.mockResolvedValue(
            new Response(new Uint8Array([31, 139]), {
                headers: {"Content-Disposition": 'attachment; filename="cailville_bakery.tar.gz"'},
            })
        )

        const bundle = await fetchBundle(SERVER_URL, PUBLISH_ID)

        expect(fetchMock.mock.calls[0][0]).toBe(
            `/api/publish/deployments/${PUBLISH_ID}/bundle?server=${encodeURIComponent(SERVER_URL)}`
        )
        expect(bundle).toEqual({archive: new Uint8Array([31, 139]), fileName: "cailville_bakery.tar.gz"})
    })

    it("should name the bundle's file itself when the server doesn't", async () => {
        fetchMock.mockResolvedValue(new Response(new Uint8Array([31, 139])))

        const {fileName} = await fetchBundle(SERVER_URL, PUBLISH_ID)

        expect(fileName).toBe("bundle.tar.gz")
    })

    // GET /deployments/{id}/bundle rejected
    it("should fail with the server's explanation when it can't build the bundle", async () => {
        fetchMock.mockResolvedValue(Response.json({detail: "cailville_bakery is failed"}, {status: 409}))

        await expect(fetchBundle(SERVER_URL, PUBLISH_ID)).rejects.toThrow(
            "Building the bundle failed (409): cailville_bakery is failed"
        )
    })
})
