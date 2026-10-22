import {act, render, screen, waitFor, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import {MockInstance} from "vitest"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {NotificationType, sendNotification} from "../../../../components/Common/notification"
import {
    PUBLISH_SETTINGS_REQUIRED_MESSAGE,
    PUBLISHED_MESSAGE,
    PUBLISHED_TAB_BLOCKED_MESSAGE,
} from "../../../../components/MultiAgentAccelerator/Publish/Publish"
import {PublishButton, SHOW_DETAILS_LABEL} from "../../../../components/MultiAgentAccelerator/Publish/PublishButton"
import {
    PUBLIC_ACCESS_WARNING,
    REFRESH_THEME_LABEL,
} from "../../../../components/MultiAgentAccelerator/Publish/PublishConfirmation"
import {
    listPublishedNetworks,
    PublishedNetwork,
    publishNetwork,
    unpublishNetwork,
} from "../../../../controller/publish/Publish"
import {usePublishStore} from "../../../../state/Publish"
import {useSettingsStore} from "../../../../state/Settings"

//#region Constants

const PUBLISH_ID = "dep-123"
const DISPLAY_NAME = "Cailville Bakery"
const HOCON = "{ tools: [] }"
const PUBLISHED_URL = "http://live.test/cailville_bakery"
const NETWORK_NAME = "cailville_bakery"
const ORG_NAME = "cailville"
const SERVER_ERROR = "Publish server unavailable"
const SERVER_URL = "https://publish.test"

//#endregion Constants

//#region Mocks

vi.mock("../../../../controller/publish/Publish")
vi.mock("../../../../components/Common/notification")

const mockPublishNetwork = vi.mocked(publishNetwork)

//#endregion Mocks

describe("PublishButton", () => {
    withStrictMocks()

    let user: UserEvent
    let openSpy: MockInstance<typeof window.open>

    const makePublishedNetwork = (): PublishedNetwork => ({id: PUBLISH_ID, name: NETWORK_NAME, url: PUBLISHED_URL})

    /**
     * Keeps the publish in flight until the returned `release()` is called, which then succeeds.
     */
    const mockInFlightPublish = () => {
        let release!: () => void
        mockPublishNetwork.mockImplementation(
            () =>
                new Promise<PublishedNetwork>((resolve) => {
                    release = () => resolve(makePublishedNetwork())
                })
        )

        return () => release()
    }

    const renderPublishButton = () =>
        render(
            <PublishButton
                displayName={DISPLAY_NAME}
                hocon={HOCON}
                id="publish-button"
                networkName={NETWORK_NAME}
            />
        )

    const clickPublish = async () => {
        const publishButton = screen.getByRole("button", {name: "Publish"})
        await user.click(publishButton)
    }

    const clickPublishAndConfirm = async () => {
        await clickPublish()
        const confirmation = await screen.findByRole("dialog")
        const confirmButton = within(confirmation).getByRole("button", {name: "Publish"})
        await user.click(confirmButton)
    }

    const publishAndWaitUntilLive = async () => {
        await clickPublishAndConfirm()
        await screen.findByRole("button", {name: "Republish"})
    }

    const clickRepublish = async () => {
        const republishButton = screen.getByRole("button", {name: "Republish"})
        await user.click(republishButton)
        return screen.findByRole("dialog")
    }

    const confirmRepublish = async (confirmation: HTMLElement) => {
        const confirmButton = within(confirmation).getByRole("button", {name: "Republish"})
        await user.click(confirmButton)
        await waitFor(() => expect(mockPublishNetwork).toHaveBeenCalledTimes(2))
    }

    const openDetails = async () => {
        const detailsButton = screen.getByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText("Live")
    }

    const clickUnpublish = async () => {
        await openDetails()
        const unpublishButton = screen.getByRole("button", {name: "Unpublish"})
        await user.click(unpublishButton)
    }

    const clickUnpublishAndConfirm = async () => {
        await clickUnpublish()
        const confirmation = await screen.findByRole("dialog")
        const confirmButton = within(confirmation).getByRole("button", {name: "Unpublish"})
        await user.click(confirmButton)
    }

    beforeEach(() => {
        user = userEvent.setup()
        openSpy = vi.spyOn(window, "open").mockReturnValue({opener: window} as Window)
        usePublishStore.setState(usePublishStore.getInitialState())
        useSettingsStore.getState().resetSettings()
        useSettingsStore.getState().updateSettings({publish: {serverUrl: SERVER_URL, orgName: ORG_NAME}})

        mockPublishNetwork.mockResolvedValue(makePublishedNetwork())
        vi.mocked(unpublishNetwork).mockResolvedValue()
        vi.mocked(listPublishedNetworks).mockResolvedValue([])
    })

    it("should offer to publish a network that isn't published", async () => {
        renderPublishButton()

        await waitFor(() => expect(listPublishedNetworks).toHaveBeenCalledWith(SERVER_URL, ORG_NAME))
        screen.getByRole("button", {name: "Publish"})
        expect(screen.queryByRole("button", {name: SHOW_DETAILS_LABEL})).not.toBeInTheDocument()
    })

    it("should offer to republish a network the server already has live, without publishing again", async () => {
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()

        await screen.findByRole("button", {name: "Republish"})
        await openDetails()

        screen.getByText(PUBLISHED_URL)
        expect(mockPublishNetwork).not.toHaveBeenCalled()
    })

    it("should stay on Publish when the server can't be asked whether the network is live", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn())
        vi.mocked(listPublishedNetworks).mockRejectedValue(new Error(SERVER_ERROR))
        renderPublishButton()

        await waitFor(() => expect(warnSpy).toHaveBeenCalled())
        screen.getByRole("button", {name: "Publish"})
    })

    it("should ask the server once when several networks check whether they're live", async () => {
        render(
            <>
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon={HOCON}
                    id="first-publish-button"
                    networkName="first_network"
                />
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon={HOCON}
                    id="second-publish-button"
                    networkName="second_network"
                />
            </>
        )

        await waitFor(() => expect(screen.getAllByRole("button", {name: "Publish"})).toHaveLength(2))
        expect(listPublishedNetworks).toHaveBeenCalledTimes(1)
    })

    it("should ask before publishing, naming the network, server and org, and warning it'll be public", async () => {
        renderPublishButton()

        await clickPublish()

        const confirmation = await screen.findByRole("dialog")
        expect(confirmation).toHaveTextContent(`"${DISPLAY_NAME}" will be published to ${SERVER_URL}`)
        expect(confirmation).toHaveTextContent(`under the org "${ORG_NAME}"`)
        expect(confirmation).toHaveTextContent(PUBLIC_ACCESS_WARNING)
        expect(mockPublishNetwork).not.toHaveBeenCalled()
    })

    it("should not offer to recreate the theme on a first publish", async () => {
        renderPublishButton()

        await clickPublish()

        const confirmation = await screen.findByRole("dialog")
        expect(within(confirmation).queryByRole("checkbox", {name: REFRESH_THEME_LABEL})).not.toBeInTheDocument()
    })

    it("should not publish when the confirmation is cancelled", async () => {
        renderPublishButton()
        await clickPublish()
        const confirmation = await screen.findByRole("dialog")
        const cancelButton = within(confirmation).getByRole("button", {name: "Cancel"})

        await user.click(cancelButton)

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(mockPublishNetwork).not.toHaveBeenCalled()
        screen.getByRole("button", {name: "Publish"})
    })

    it("should publish the network's HOCON to the server and org from Settings", async () => {
        renderPublishButton()

        await publishAndWaitUntilLive()

        expect(mockPublishNetwork).toHaveBeenCalledWith(
            expect.objectContaining({
                serverUrl: SERVER_URL,
                orgName: ORG_NAME,
                networkName: NETWORK_NAME,
                hocon: HOCON,
            })
        )
    })

    it.each([
        {missing: "a publish server", publish: {serverUrl: null}},
        {missing: "an org name", publish: {orgName: null}},
    ])("should not allow publishing without $missing in Settings", async ({publish}) => {
        useSettingsStore.getState().updateSettings({publish})
        renderPublishButton()
        const publishButton = screen.getByRole("button", {name: "Publish"})

        // A disabled button gets no pointer events, so the pointer lands on its wrapper like a real one would
        await user.hover(publishButton.parentElement)

        expect(publishButton).toBeDisabled()
        await screen.findByRole("tooltip", {name: PUBLISH_SETTINGS_REQUIRED_MESSAGE})
    })

    it("should show the progress panel while publishing and close it once published", async () => {
        const releasePublish = mockInFlightPublish()
        renderPublishButton()

        await clickPublishAndConfirm()

        // The open panel is modal, which hides the button beneath it from the accessibility tree
        await screen.findByText("Putting it online...")
        screen.getByText("Publishing...")
        screen.getByRole("progressbar", {name: "Publishing progress"})

        releasePublish()
        await screen.findByRole("button", {name: "Republish"})
        expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument()
    })

    it("should open the live network in a new tab and say so once published", async () => {
        renderPublishButton()

        await publishAndWaitUntilLive()

        expect(openSpy).toHaveBeenCalledWith(PUBLISHED_URL, "_blank")
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.success,
            PUBLISHED_MESSAGE,
            "",
            expect.anything()
        )
    })

    it("should point to View live when the browser blocks the new tab", async () => {
        openSpy.mockReturnValue(null)
        renderPublishButton()

        await publishAndWaitUntilLive()

        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.success,
            PUBLISHED_TAB_BLOCKED_MESSAGE,
            "",
            expect.anything()
        )
    })

    it("should ask before republishing, saying it replaces the published version", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()

        const confirmation = await clickRepublish()

        expect(confirmation).toHaveTextContent(`The published version of "${DISPLAY_NAME}" on ${SERVER_URL}`)
        expect(confirmation).toHaveTextContent("will be replaced with this one")
        expect(within(confirmation).getByRole("checkbox", {name: REFRESH_THEME_LABEL})).not.toBeChecked()
    })

    it("should republish the network's HOCON and keep its theme", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        const confirmation = await clickRepublish()

        await confirmRepublish(confirmation)

        expect(mockPublishNetwork).toHaveBeenLastCalledWith(
            expect.objectContaining({networkName: NETWORK_NAME, hocon: HOCON, refreshTheme: false})
        )
    })

    it("should not republish when the confirmation is cancelled", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        const confirmation = await clickRepublish()
        const cancelButton = within(confirmation).getByRole("button", {name: "Cancel"})

        await user.click(cancelButton)

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(mockPublishNetwork).toHaveBeenCalledTimes(1)
    })

    it("should republish with a new theme when asked to", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        const confirmation = await clickRepublish()
        const refreshThemeCheckbox = within(confirmation).getByRole("checkbox", {name: REFRESH_THEME_LABEL})

        await user.click(refreshThemeCheckbox)
        await confirmRepublish(confirmation)

        expect(mockPublishNetwork).toHaveBeenLastCalledWith(expect.objectContaining({refreshTheme: true}))
    })

    it("should offer to republish a network the server has unpublished", async () => {
        vi.mocked(listPublishedNetworks).mockResolvedValue([{id: PUBLISH_ID, name: NETWORK_NAME, url: null}])
        renderPublishButton()
        await screen.findByRole("button", {name: "Republish"})
        const detailsButton = screen.getByRole("button", {name: SHOW_DETAILS_LABEL})

        await user.click(detailsButton)

        await screen.findByText("Unpublished")
        expect(screen.queryByRole("button", {name: "Unpublish"})).not.toBeInTheDocument()
    })

    it("should show an edited copy of a published network as published too", async () => {
        render(
            <>
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon={HOCON}
                    id="original-publish-button"
                    networkName={NETWORK_NAME}
                />
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon="{ tools: [], edited: true }"
                    id="edited-publish-button"
                    networkName={NETWORK_NAME}
                />
            </>
        )
        const [originalPublishButton] = await screen.findAllByRole("button", {name: "Publish"})

        await user.click(originalPublishButton)
        const confirmation = await screen.findByRole("dialog")
        const confirmButton = within(confirmation).getByRole("button", {name: "Publish"})
        await user.click(confirmButton)

        await waitFor(() => expect(screen.getAllByRole("button", {name: "Republish"})).toHaveLength(2))
    })

    it("should show the live URL in the details", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()

        await openDetails()

        screen.getByText(PUBLISHED_URL)
    })

    it("should reopen the progress panel when Publishing... is clicked", async () => {
        const releasePublish = mockInFlightPublish()
        renderPublishButton()
        await clickPublishAndConfirm()
        await screen.findByText("Putting it online...")
        await user.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument())
        const publishingButton = screen.getByRole("button", {name: "Publishing..."})

        await user.click(publishingButton)

        await screen.findByText("Putting it online...")

        releasePublish()
        await screen.findByRole("button", {name: "Republish"})
    })

    it("should ask before unpublishing, naming the live URL", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublish()

        const confirmation = await screen.findByRole("dialog")
        expect(confirmation).toHaveTextContent(`"${DISPLAY_NAME}" will be taken offline at ${PUBLISHED_URL}`)
        expect(unpublishNetwork).not.toHaveBeenCalled()
    })

    it("should stay live when unpublishing is cancelled", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        await clickUnpublish()
        const confirmation = await screen.findByRole("dialog")
        const cancelButton = within(confirmation).getByRole("button", {name: "Cancel"})

        await user.click(cancelButton)

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(unpublishNetwork).not.toHaveBeenCalled()
        screen.getByText("Live")
    })

    it("should not allow a second unpublish while the first is still running", async () => {
        let finishUnpublish!: () => void
        vi.mocked(unpublishNetwork).mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishUnpublish = resolve
                })
        )
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublishAndConfirm()

        expect(screen.getByRole("button", {name: "Unpublishing..."})).toBeDisabled()

        finishUnpublish()
        // Unpublishing closes the panel, so reopen it to see the result
        await waitFor(() => expect(screen.queryByText("Unpublishing...")).not.toBeInTheDocument())
        const detailsButton = await screen.findByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText("Unpublished")
    })

    it("should not allow republishing while unpublishing", async () => {
        vi.mocked(unpublishNetwork).mockImplementation(() => new Promise<void>(vi.fn()))
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublishAndConfirm()

        // The open panel is modal, which hides the button beneath it from the accessibility tree
        const republishButton = screen.getByRole("button", {name: "Republish", hidden: true})
        expect(republishButton).toBeDisabled()
    })

    it("should report the error and stay live when unpublishing fails", async () => {
        vi.mocked(unpublishNetwork).mockRejectedValue(new Error(SERVER_ERROR))
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublishAndConfirm()

        await waitFor(() =>
            expect(sendNotification).toHaveBeenCalledWith(
                NotificationType.error,
                `Failed to unpublish "${NETWORK_NAME}".`,
                expect.stringContaining(SERVER_ERROR)
            )
        )
        await openDetails()
    })

    it("should unpublish from the server it was published to, even if Settings changed since", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        act(() => {
            useSettingsStore.getState().updateSettings({publish: {serverUrl: "https://other-publish.test"}})
        })

        await clickUnpublishAndConfirm()

        expect(unpublishNetwork).toHaveBeenCalledWith(SERVER_URL, PUBLISH_ID)
    })

    it("should offer to republish after unpublishing", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublishAndConfirm()

        await screen.findByRole("button", {name: "Republish"})
    })

    it("should report the error and offer to publish again when publishing fails", async () => {
        mockPublishNetwork.mockRejectedValue(new Error(SERVER_ERROR))
        renderPublishButton()

        await clickPublishAndConfirm()

        await waitFor(() =>
            expect(sendNotification).toHaveBeenCalledWith(
                NotificationType.error,
                `Failed to publish "${NETWORK_NAME}".`,
                expect.stringContaining(SERVER_ERROR)
            )
        )
        await screen.findByRole("button", {name: "Publish"})
        expect(openSpy).not.toHaveBeenCalled()
    })

    it("should keep offering to republish when republishing fails and the server can't be asked", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn())
        renderPublishButton()
        await publishAndWaitUntilLive()
        mockPublishNetwork.mockRejectedValue(new Error(SERVER_ERROR))
        vi.mocked(listPublishedNetworks).mockRejectedValue(new Error(SERVER_ERROR))
        const confirmation = await clickRepublish()

        await confirmRepublish(confirmation)

        await waitFor(() => expect(warnSpy).toHaveBeenCalled())
        await waitFor(() => expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument())
        const detailsButton = screen.getByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText("Unpublished")
    })

    it("should show a network as live when the server lists it both live and unpublished", async () => {
        vi.mocked(listPublishedNetworks).mockResolvedValue([
            {id: "stopped", name: NETWORK_NAME, url: null},
            makePublishedNetwork(),
        ])
        renderPublishButton()
        await screen.findByRole("button", {name: "Republish"})

        await openDetails()

        screen.getByText(PUBLISHED_URL)
    })

    it("should ask the server again when republishing fails, and show what it says", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        mockPublishNetwork.mockRejectedValue(new Error(SERVER_ERROR))
        vi.mocked(listPublishedNetworks).mockResolvedValue([{id: PUBLISH_ID, name: NETWORK_NAME, url: null}])
        const confirmation = await clickRepublish()

        await confirmRepublish(confirmation)

        await waitFor(() => expect(listPublishedNetworks).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(screen.queryByText("Putting it online...")).not.toBeInTheDocument())
        const detailsButton = screen.getByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText("Unpublished")
    })
})
