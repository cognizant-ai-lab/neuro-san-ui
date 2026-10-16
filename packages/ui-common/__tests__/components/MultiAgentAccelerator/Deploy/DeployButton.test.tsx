import {render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import {MockInstance} from "vitest"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {NotificationType, sendNotification} from "../../../../components/Common/notification"
import {
    DeployButton,
    PUBLISHED_MESSAGE,
    PUBLISHED_TAB_BLOCKED_MESSAGE,
    SHOW_DETAILS_LABEL,
} from "../../../../components/MultiAgentAccelerator/Deploy/DeployButton"
import {publishNetwork, unpublishNetwork} from "../../../../controller/deploy/Deploy"
import {useDeploymentsStore} from "../../../../state/Deployments"

//#region Constants

const BUNDLE_STEP = "POST http://bundle.test/bundle"
const DEPLOY_ERROR = "deploy service unavailable"
const LIVE_URL = "http://live.test/cailville_bakery"
const NETWORK_NAME = "cailville_bakery"

//#endregion Constants

//#region Mocks

vi.mock("../../../../controller/deploy/Deploy")
vi.mock("../../../../components/Common/notification")

const mockPublishNetwork = vi.mocked(publishNetwork)

//#endregion Mocks

describe("DeployButton", () => {
    withStrictMocks()

    let user: UserEvent
    let openSpy: MockInstance<typeof window.open>
    let openedTab: Window

    /**
     * Keeps the publish in flight until the returned `release()` is called, which then succeeds with LIVE_URL.
     */
    const mockInFlightPublish = () => {
        let release!: () => void
        mockPublishNetwork.mockImplementation(
            () =>
                new Promise<string>((resolve) => {
                    release = () => resolve(LIVE_URL)
                })
        )

        return () => release()
    }

    const renderDeployButton = () =>
        render(
            <DeployButton
                id="deploy-button"
                networkName={NETWORK_NAME}
            />
        )

    const publishAndWaitUntilLive = async () => {
        const publishButton = screen.getByRole("button", {name: "Publish"})
        await user.click(publishButton)
        await screen.findByRole("button", {name: "View live"})
    }

    const openDetails = async () => {
        const detailsButton = screen.getByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText("Live")
    }

    beforeEach(() => {
        user = userEvent.setup()
        openedTab = {opener: window} as Window
        openSpy = vi.spyOn(window, "open").mockReturnValue(openedTab)
        useDeploymentsStore.setState({deployments: {}})

        mockPublishNetwork.mockImplementation(async (_networkName, onLog) => {
            onLog({timestamp: Date.now(), message: BUNDLE_STEP, detail: `${NETWORK_NAME}.hocon`})
            return LIVE_URL
        })
        vi.mocked(unpublishNetwork).mockResolvedValue()
    })

    it("should offer to publish a network that isn't published", () => {
        renderDeployButton()

        screen.getByRole("button", {name: "Publish"})
        expect(screen.queryByRole("button", {name: SHOW_DETAILS_LABEL})).not.toBeInTheDocument()
    })

    it("should show that the network is being put online while publishing", async () => {
        const releasePublish = mockInFlightPublish()
        renderDeployButton()
        const publishButton = screen.getByRole("button", {name: "Publish"})

        await user.click(publishButton)

        // The open panel is modal, which hides the button beneath it from the accessibility tree
        screen.getByText("Publishing...")
        screen.getByText("Putting it online...")
        screen.getByRole("progressbar", {name: "Publishing progress"})

        releasePublish()
        await screen.findByRole("button", {name: "View live"})
    })

    it("should open the live network in a new tab once published", async () => {
        renderDeployButton()

        await publishAndWaitUntilLive()

        expect(openSpy).toHaveBeenCalledWith(LIVE_URL, "_blank")
    })

    it("should say the live network opened in a new tab", async () => {
        renderDeployButton()

        await publishAndWaitUntilLive()

        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.success,
            PUBLISHED_MESSAGE,
            "",
            expect.anything()
        )
    })

    it("should cut the new tab off from this page", async () => {
        renderDeployButton()

        await publishAndWaitUntilLive()

        expect(openedTab.opener).toBeNull()
    })

    it("should point to View live when the browser blocks the new tab", async () => {
        openSpy.mockReturnValue(null)
        renderDeployButton()

        await publishAndWaitUntilLive()

        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.success,
            PUBLISHED_TAB_BLOCKED_MESSAGE,
            "",
            expect.anything()
        )
    })

    it("should close the progress panel once published", async () => {
        renderDeployButton()

        await publishAndWaitUntilLive()

        expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument()
    })

    it("should open the live network again when View live is clicked", async () => {
        renderDeployButton()
        await publishAndWaitUntilLive()
        openSpy.mockClear()
        const viewLiveButton = screen.getByRole("button", {name: "View live"})

        await user.click(viewLiveButton)

        expect(openSpy).toHaveBeenCalledWith(LIVE_URL, "_blank")
    })

    it("should show the live URL and when it was published in the details", async () => {
        renderDeployButton()
        await publishAndWaitUntilLive()

        await openDetails()

        screen.getByText(LIVE_URL)
        screen.getByText("Published just now")
    })

    it("should list each deploy step under technical details", async () => {
        renderDeployButton()
        await publishAndWaitUntilLive()
        await openDetails()
        const technicalDetailsButton = screen.getByRole("button", {name: "Technical details"})

        await user.click(technicalDetailsButton)

        expect(screen.getByText(new RegExp(BUNDLE_STEP, "u"))).toHaveTextContent(`${NETWORK_NAME}.hocon`)
    })

    it("should reopen the progress panel when Publishing... is clicked", async () => {
        const releasePublish = mockInFlightPublish()
        renderDeployButton()
        const publishButton = screen.getByRole("button", {name: "Publish"})
        await user.click(publishButton)
        await user.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument())
        const publishingButton = screen.getByRole("button", {name: "Publishing..."})

        await user.click(publishingButton)

        await screen.findByText("Putting it online...")

        releasePublish()
        await screen.findByRole("button", {name: "View live"})
    })

    it("should report the error and stay live when unpublishing fails", async () => {
        vi.mocked(unpublishNetwork).mockRejectedValue(new Error(DEPLOY_ERROR))
        renderDeployButton()
        await publishAndWaitUntilLive()
        await openDetails()
        const unpublishButton = screen.getByRole("button", {name: "Unpublish"})

        await user.click(unpublishButton)

        await waitFor(() =>
            expect(sendNotification).toHaveBeenCalledWith(
                NotificationType.error,
                `Failed to unpublish "${NETWORK_NAME}".`,
                expect.stringContaining(DEPLOY_ERROR)
            )
        )
        // The panel stays open, and it's modal, which hides the button beneath it from the accessibility tree
        screen.getByText("View live")
    })

    it("should offer to publish again after unpublishing", async () => {
        renderDeployButton()
        await publishAndWaitUntilLive()
        await openDetails()
        const unpublishButton = screen.getByRole("button", {name: "Unpublish"})

        await user.click(unpublishButton)

        await screen.findByRole("button", {name: "Publish"})
    })

    it("should report the error and offer to publish again when publishing fails", async () => {
        mockPublishNetwork.mockRejectedValue(new Error(DEPLOY_ERROR))
        renderDeployButton()
        const publishButton = screen.getByRole("button", {name: "Publish"})

        await user.click(publishButton)

        await waitFor(() =>
            expect(sendNotification).toHaveBeenCalledWith(
                NotificationType.error,
                `Failed to publish "${NETWORK_NAME}".`,
                expect.stringContaining(DEPLOY_ERROR)
            )
        )
        screen.getByRole("button", {name: "Publish"})
        expect(openSpy).not.toHaveBeenCalled()
    })
})
