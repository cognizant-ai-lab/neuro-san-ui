import {render, screen, waitForElementToBeRemoved} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {DeployPanel} from "../../../../components/MultiAgentAccelerator/Deploy/DeployPanel"
import {COPY_URL_LABEL, OPEN_URL_LABEL} from "../../../../components/MultiAgentAccelerator/Deploy/LiveUrlField"
import {Deployment, DeploymentStatus} from "../../../../state/Deployments"

const LIVE_URL = "http://live.test/cailville_bakery"
const MINUTE_MS = 60_000

const renderPanel = (deployment: Deployment) =>
    render(
        <DeployPanel
            deployment={deployment}
            id="deploy-panel"
            onUnpublish={vi.fn()}
        />
    )

const makeLiveDeployment = (publishedAt = Date.now()): Deployment => ({
    log: [],
    publishedAt,
    status: DeploymentStatus.Live,
    url: LIVE_URL,
})

describe("DeployPanel", () => {
    withStrictMocks()

    it.each([
        {ageMs: 5 * MINUTE_MS, expected: "Published 5 minutes ago"},
        {ageMs: 3 * 60 * MINUTE_MS, expected: "Published 3 hours ago"},
        {ageMs: 2 * 24 * 60 * MINUTE_MS, expected: "Published 2 days ago"},
    ])("should say $expected", ({ageMs, expected}) => {
        renderPanel(makeLiveDeployment(Date.now() - ageMs))

        screen.getByText(expected)
    })

    it("should copy the live URL to the clipboard", async () => {
        const user = userEvent.setup()
        renderPanel(makeLiveDeployment())
        const copyButton = screen.getByRole("button", {name: COPY_URL_LABEL})

        await user.click(copyButton)

        expect(await navigator.clipboard.readText()).toBe(LIVE_URL)
    })

    it("should say it couldn't copy when the clipboard refuses", async () => {
        const user = userEvent.setup()
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard blocked"))
        renderPanel(makeLiveDeployment())
        const copyButton = screen.getByRole("button", {name: COPY_URL_LABEL})

        await user.click(copyButton)

        await screen.findByRole("tooltip", {name: "Couldn't copy"})
    })

    it("should go back to offering to copy once the Copied tooltip closes", async () => {
        const user = userEvent.setup()
        renderPanel(makeLiveDeployment())
        const copyButton = screen.getByRole("button", {name: COPY_URL_LABEL})
        await user.click(copyButton)
        await screen.findByRole("tooltip", {name: "Copied"})

        await user.unhover(copyButton)
        await waitForElementToBeRemoved(() => screen.queryByRole("tooltip"))
        await user.hover(copyButton)

        await screen.findByRole("tooltip", {name: COPY_URL_LABEL})
    })

    it("should link to the live URL in a new tab", () => {
        renderPanel(makeLiveDeployment())

        const openLink = screen.getByRole("link", {name: OPEN_URL_LABEL})

        expect(openLink).toHaveAttribute("href", LIVE_URL)
        expect(openLink).toHaveAttribute("target", "_blank")
    })

    it("should not offer to unpublish while still publishing", () => {
        renderPanel({log: [], status: DeploymentStatus.Publishing})

        expect(screen.queryByRole("button", {name: "Unpublish"})).not.toBeInTheDocument()
    })
})
