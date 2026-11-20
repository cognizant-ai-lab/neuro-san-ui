import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {PublishStatus, resolveNetworkId, usePublishStore} from "../../../state/Publish"

describe("usePublishStore / replaceNetwork", () => {
    withStrictMocks()

    beforeEach(() => {
        usePublishStore.setState(usePublishStore.getInitialState())
    })

    it("moves a network's publish state to the network an edit replaced it with", () => {
        usePublishStore.getState().setPublishState("first", {status: PublishStatus.Unpublished})

        usePublishStore.getState().replaceNetwork("first", "second")

        expect(usePublishStore.getState().networks).toEqual({second: {status: PublishStatus.Unpublished}})
    })

    it("follows a network through several edits", () => {
        usePublishStore.getState().replaceNetwork("first", "second")
        usePublishStore.getState().replaceNetwork("second", "third")

        usePublishStore.getState().setPublishState("first", {status: PublishStatus.Unpublished})

        expect(resolveNetworkId("first")).toBe("third")
        expect(usePublishStore.getState().networks).toEqual({third: {status: PublishStatus.Unpublished}})
    })

    it("leaves a network as it is when a save keeps its id", () => {
        usePublishStore.getState().setPublishState("first", {status: PublishStatus.Unpublished})

        usePublishStore.getState().replaceNetwork("first", "first")

        expect(resolveNetworkId("first")).toBe("first")
        expect(usePublishStore.getState().networks).toEqual({first: {status: PublishStatus.Unpublished}})
    })
})
