import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {DeployLogEntry, publishNetwork, unpublishNetwork} from "../../../../controller/deploy/Deploy"

const NETWORK_NAME = "cailville_bakery"

describe("Deploy", () => {
    withStrictMocks()

    beforeEach(() => {
        vi.useFakeTimers()
    })

    it("should resolve to a live URL ending in the network name", async () => {
        const published = publishNetwork(NETWORK_NAME, vi.fn())

        await vi.runAllTimersAsync()

        await expect(published).resolves.toMatch(new RegExp(`/${NETWORK_NAME}$`, "u"))
    })

    it("should log each deploy step, ending with the live URL", async () => {
        const log: DeployLogEntry[] = []
        const published = publishNetwork(NETWORK_NAME, (entry) => log.push(entry))

        await vi.runAllTimersAsync()

        const url = await published
        expect(log.map((entry) => entry.message)).toEqual([
            expect.stringMatching(/^POST .*\/bundle$/u),
            expect.stringMatching(/^201 bundle_id=/u),
            expect.stringMatching(/^POST .*\/deploy$/u),
            "200",
        ])
        expect(log.at(-1)?.detail).toBe(url)
    })

    it("should resolve once the network is unpublished", async () => {
        const unpublished = unpublishNetwork(NETWORK_NAME)

        await vi.runAllTimersAsync()

        await expect(unpublished).resolves.toBeUndefined()
    })
})
