import {render, screen, waitForElementToBeRemoved} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {COPY_URL_LABEL, OPEN_URL_LABEL} from "../../../../components/MultiAgentAccelerator/Publish/PublishedNetworkUrl"
import {PublishPanel} from "../../../../components/MultiAgentAccelerator/Publish/PublishPanel"
import {PublishState, PublishStatus} from "../../../../state/Publish"

const PUBLISHED_URL = "http://live.test/cailville_bakery"

const renderPanel = (publishState: PublishState) =>
    render(
        <PublishPanel
            publishState={publishState}
            id="publish-panel"
            isUnpublishing={false}
            onUnpublish={vi.fn()}
        />
    )

const makePublishedNetwork = (): PublishState => ({
    publishId: "dep-123",
    serverUrl: "https://publish.test",
    status: PublishStatus.Published,
    url: PUBLISHED_URL,
})

describe("PublishPanel", () => {
    withStrictMocks()

    it("should copy the live URL, say Copied, then go back to offering to copy", async () => {
        const user = userEvent.setup()
        renderPanel(makePublishedNetwork())
        const copyButton = screen.getByRole("button", {name: COPY_URL_LABEL})

        await user.click(copyButton)

        expect(await navigator.clipboard.readText()).toBe(PUBLISHED_URL)
        await screen.findByRole("tooltip", {name: "Copied"})

        await user.unhover(copyButton)
        await waitForElementToBeRemoved(() => screen.queryByRole("tooltip"))
        await user.hover(copyButton)

        await screen.findByRole("tooltip", {name: COPY_URL_LABEL})
    })

    it("should say it couldn't copy when the clipboard refuses", async () => {
        const user = userEvent.setup()
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard blocked"))
        renderPanel(makePublishedNetwork())
        const copyButton = screen.getByRole("button", {name: COPY_URL_LABEL})

        await user.click(copyButton)

        await screen.findByRole("tooltip", {name: "Couldn't copy"})
    })

    it("should link to the live URL in a new tab", () => {
        renderPanel(makePublishedNetwork())

        const openLink = screen.getByRole("link", {name: OPEN_URL_LABEL})

        expect(openLink).toHaveAttribute("href", PUBLISHED_URL)
        expect(openLink).toHaveAttribute("target", "_blank")
    })

    it("should not offer to unpublish while still publishing", () => {
        renderPanel({status: PublishStatus.Publishing, displayName: "Cailville Bakery", waiting: new AbortController()})

        expect(screen.queryByRole("button", {name: "Unpublish"})).not.toBeInTheDocument()
    })
})
