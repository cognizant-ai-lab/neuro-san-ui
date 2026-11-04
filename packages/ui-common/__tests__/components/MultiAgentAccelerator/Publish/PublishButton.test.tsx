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
import {TemporaryNetwork, useTempNetworksStore} from "../../../../state/TemporaryNetworks"

//#region Constants

const PUBLISH_ID = "dep-123"
const DISPLAY_NAME = "Cailville Bakery"
const HOCON = "{ tools: [] }"
const PUBLISHED_URL = "http://live.test/cailville_bakery"
const NETWORK_ID = "temporary/cailville_bakery-1"
const NETWORK_NAME = "cailville_bakery"
// What a network published before was published under, with the id MAUI added to its name
const PUBLISH_NAME = `${NETWORK_NAME}_1a2b3c4d`
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

    const makeTempNetwork = (id: string, networkName: string, deploymentId?: string): TemporaryNetwork => ({
        reservation: {reservation_id: id, lifetime_in_seconds: 300, expiration_time_in_seconds: 0},
        agentInfo: {agent_name: id},
        agentNetworkName: networkName,
        ...(deploymentId && {
            published: {serverUrl: SERVER_URL, orgName: ORG_NAME, deploymentId, name: `${networkName}_1a2b3c4d`},
        }),
    })

    /** As if this browser published the network before, for example before a reload */
    const setPublishedBefore = (deploymentId = PUBLISH_ID) => {
        useTempNetworksStore.getState().setTempNetworks([makeTempNetwork(NETWORK_ID, NETWORK_NAME, deploymentId)])
    }

    /**
     * Keeps the publish in flight until the returned `release()` is called, which then succeeds.
     */
    const mockInFlightPublish = () => {
        let release!: () => void
        mockPublishNetwork.mockImplementation(
            ({onAccepted}) =>
                new Promise<PublishedNetwork>((resolve) => {
                    onAccepted?.(PUBLISH_ID)
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
                networkId={NETWORK_ID}
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
        await screen.findByRole("button", {name: "View live"})
    }

    const confirmRepublish = async (confirmation: HTMLElement) => {
        const confirmButton = within(confirmation).getByRole("button", {name: "Republish"})
        await user.click(confirmButton)
        await waitFor(() => expect(mockPublishNetwork).toHaveBeenCalledTimes(2))
    }

    /**
     * Opens the details panel, once the panel isn't already open or closing, and waits for the given status in it.
     */
    const openDetails = async (expectedStatus: "Live" | "Unpublished" = "Live") => {
        const detailsButton = await screen.findByRole("button", {name: SHOW_DETAILS_LABEL})
        await user.click(detailsButton)
        await screen.findByText(expectedStatus)
    }

    // While it's live, Republish is in the details panel
    const clickRepublish = async () => {
        await openDetails()
        const republishButton = screen.getByRole("button", {name: "Republish"})
        await user.click(republishButton)
        return screen.findByRole("dialog")
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
        useTempNetworksStore.getState().setTempNetworks([makeTempNetwork(NETWORK_ID, NETWORK_NAME)])
        useSettingsStore.getState().resetSettings()
        useSettingsStore.getState().updateSettings({publish: {serverUrl: SERVER_URL, orgName: ORG_NAME}})

        // Like the server, it reports the network's id once it accepts it
        mockPublishNetwork.mockImplementation(async ({onAccepted}) => {
            onAccepted?.(PUBLISH_ID)
            return makePublishedNetwork()
        })
        vi.mocked(unpublishNetwork).mockResolvedValue()
        vi.mocked(listPublishedNetworks).mockResolvedValue([])
    })

    it("should offer to publish a network this browser hasn't published, without asking the server", async () => {
        renderPublishButton()

        screen.getByRole("button", {name: "Publish"})
        expect(screen.queryByRole("button", {name: SHOW_DETAILS_LABEL})).not.toBeInTheDocument()
        expect(listPublishedNetworks).not.toHaveBeenCalled()
    })

    it("should show View live for a network this browser published that's still live", async () => {
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()

        await screen.findByRole("button", {name: "View live"})
        await openDetails()

        screen.getByText(PUBLISHED_URL)
        expect(mockPublishNetwork).not.toHaveBeenCalled()
    })

    it("should offer to publish when someone else has a network with the same name published", async () => {
        setPublishedBefore("their-dep")
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()

        await waitFor(() => expect(listPublishedNetworks).toHaveBeenCalled())
        screen.getByRole("button", {name: "Publish"})
    })

    it("should find the network by its id when another with the same name is live", async () => {
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([
            {id: "their-dep", name: NETWORK_NAME, url: "http://live.test/theirs"},
            {id: PUBLISH_ID, name: NETWORK_NAME, url: null},
        ])
        renderPublishButton()
        await screen.findByRole("button", {name: "Republish"})

        await openDetails("Unpublished")
    })

    it.each([
        {setting: "org name", publish: {orgName: "another-org"}},
        {setting: "publishing server", publish: {serverUrl: "https://other-publish.test"}},
    ])("should offer to publish after the $setting in Settings changes", async ({publish}) => {
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()
        await screen.findByRole("button", {name: "View live"})

        act(() => {
            useSettingsStore.getState().updateSettings({publish})
        })

        // This browser hasn't published it there
        await screen.findByRole("button", {name: "Publish"})
    })

    it("should show it as published again after changing the org name back", async () => {
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()
        await screen.findByRole("button", {name: "View live"})
        act(() => {
            useSettingsStore.getState().updateSettings({publish: {orgName: "another-org"}})
        })
        await screen.findByRole("button", {name: "Publish"})

        act(() => {
            useSettingsStore.getState().updateSettings({publish: {orgName: ORG_NAME}})
        })

        await screen.findByRole("button", {name: "View live"})
    })

    it("should stay on Publish when the server can't be asked whether the network is live", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn())
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockRejectedValue(new Error(SERVER_ERROR))
        renderPublishButton()

        await waitFor(() => expect(warnSpy).toHaveBeenCalled())
        screen.getByRole("button", {name: "Publish"})
    })

    it("should ask the server once when several networks check whether they're live", async () => {
        useTempNetworksStore
            .getState()
            .setTempNetworks([
                makeTempNetwork("temporary/first", "first_network", "first-dep"),
                makeTempNetwork("temporary/second", "second_network", "second-dep"),
            ])
        render(
            <>
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon={HOCON}
                    id="first-publish-button"
                    networkId="temporary/first"
                    networkName="first_network"
                />
                <PublishButton
                    displayName={DISPLAY_NAME}
                    hocon={HOCON}
                    id="second-publish-button"
                    networkId="temporary/second"
                    networkName="second_network"
                />
            </>
        )

        await waitFor(() => expect(listPublishedNetworks).toHaveBeenCalled())
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
            expect.objectContaining({serverUrl: SERVER_URL, orgName: ORG_NAME, hocon: HOCON})
        )
    })

    it("should publish under the network's name with an id of its own, so it can't replace another", async () => {
        renderPublishButton()

        await publishAndWaitUntilLive()

        expect(mockPublishNetwork).toHaveBeenCalledWith(
            expect.objectContaining({
                networkName: expect.stringMatching(new RegExp(`^${NETWORK_NAME}_[0-9a-f]{8}$`, "u")),
            })
        )
    })

    it("should give the site the network's name as its brand, without the id", async () => {
        renderPublishButton()

        await publishAndWaitUntilLive()

        expect(mockPublishNetwork).toHaveBeenCalledWith(expect.objectContaining({brand: "Cailville Bakery"}))
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
        await screen.findByRole("button", {name: "View live"})
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

        const [[{networkName: firstPublishName}]] = mockPublishNetwork.mock.calls
        expect(mockPublishNetwork).toHaveBeenLastCalledWith(
            expect.objectContaining({networkName: firstPublishName, hocon: HOCON, refreshTheme: false})
        )
    })

    it("should republish under the name it was first published under after a reload", async () => {
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])
        renderPublishButton()
        await screen.findByRole("button", {name: "View live"})
        const confirmation = await clickRepublish()

        const confirmButton = within(confirmation).getByRole("button", {name: "Republish"})
        await user.click(confirmButton)

        await waitFor(() =>
            expect(mockPublishNetwork).toHaveBeenCalledWith(expect.objectContaining({networkName: PUBLISH_NAME}))
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
        setPublishedBefore()
        vi.mocked(listPublishedNetworks).mockResolvedValue([{id: PUBLISH_ID, name: NETWORK_NAME, url: null}])
        renderPublishButton()
        await screen.findByRole("button", {name: "Republish"})

        await openDetails("Unpublished")

        expect(screen.queryByRole("button", {name: "Unpublish"})).not.toBeInTheDocument()
    })

    it("should finish publishing on the edited network when it's edited while publishing", async () => {
        const editedId = "temporary/cailville_bakery-2"
        let finishPublish!: () => void
        // The server only accepts it after the edit, which is the latest it can
        mockPublishNetwork.mockImplementation(
            ({onAccepted}) =>
                new Promise<PublishedNetwork>((resolve) => {
                    finishPublish = () => {
                        onAccepted?.(PUBLISH_ID)
                        resolve(makePublishedNetwork())
                    }
                })
        )
        const {unmount} = renderPublishButton()
        await clickPublishAndConfirm()
        await screen.findByText("Putting it online...")
        unmount()

        // Editing replaces the network with one under a new id, and the title bar shows that one
        act(() => {
            useTempNetworksStore.getState().upsertTempNetworks([makeTempNetwork(editedId, NETWORK_NAME)])
            usePublishStore.getState().replaceNetwork(NETWORK_ID, editedId)
        })
        render(
            <PublishButton
                displayName={DISPLAY_NAME}
                hocon="{ tools: [], edited: true }"
                id="edited-publish-button"
                networkId={editedId}
                networkName={NETWORK_NAME}
            />
        )
        screen.getByRole("button", {name: "Publishing..."})

        act(() => finishPublish())

        await screen.findByRole("button", {name: "View live"})
        expect(useTempNetworksStore.getState().tempNetworks[0].published?.deploymentId).toBe(PUBLISH_ID)
    })

    it("should show a published network as published after it's edited", async () => {
        const editedId = "temporary/cailville_bakery-2"
        renderPublishButton()
        await publishAndWaitUntilLive()
        vi.mocked(listPublishedNetworks).mockResolvedValue([makePublishedNetwork()])

        // Editing replaces the network with one under a new id
        useTempNetworksStore.getState().upsertTempNetworks([makeTempNetwork(editedId, NETWORK_NAME)])
        render(
            <PublishButton
                displayName={DISPLAY_NAME}
                hocon="{ tools: [], edited: true }"
                id="edited-publish-button"
                networkId={editedId}
                networkName={NETWORK_NAME}
            />
        )

        await waitFor(() => expect(screen.getAllByRole("button", {name: "View live"})).toHaveLength(2))
    })

    it("should open the live network again when View live is clicked", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        openSpy.mockClear()
        const viewLiveButton = screen.getByRole("button", {name: "View live"})

        await user.click(viewLiveButton)

        expect(openSpy).toHaveBeenCalledWith(PUBLISHED_URL, "_blank")
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
        await screen.findByRole("button", {name: "View live"})
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
        screen.getByText("View live")
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
        await openDetails("Unpublished")
    })

    it("should not allow republishing while unpublishing", async () => {
        vi.mocked(unpublishNetwork).mockImplementation(() => new Promise<void>(vi.fn()))
        renderPublishButton()
        await publishAndWaitUntilLive()

        await clickUnpublishAndConfirm()

        const republishButton = screen.getByRole("button", {name: "Republish"})
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

    it("should offer to republish when the server took the network but it failed to go live", async () => {
        mockPublishNetwork.mockImplementation(async ({onAccepted}) => {
            onAccepted?.(PUBLISH_ID)
            throw new Error(SERVER_ERROR)
        })
        vi.mocked(listPublishedNetworks).mockResolvedValue([{id: PUBLISH_ID, name: NETWORK_NAME, url: null}])
        renderPublishButton()

        await clickPublishAndConfirm()

        await screen.findByRole("button", {name: "Republish"})
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
        await openDetails("Unpublished")
    })

    it("should ask the server again when republishing fails, and show what it says", async () => {
        renderPublishButton()
        await publishAndWaitUntilLive()
        mockPublishNetwork.mockRejectedValue(new Error(SERVER_ERROR))
        vi.mocked(listPublishedNetworks).mockResolvedValue([{id: PUBLISH_ID, name: NETWORK_NAME, url: null}])
        const confirmation = await clickRepublish()
        vi.mocked(listPublishedNetworks).mockClear()

        await confirmRepublish(confirmation)

        await waitFor(() => expect(listPublishedNetworks).toHaveBeenCalledTimes(1))
        await openDetails("Unpublished")
    })
})
