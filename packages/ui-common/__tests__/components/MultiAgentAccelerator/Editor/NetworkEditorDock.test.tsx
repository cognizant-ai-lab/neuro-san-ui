import {act, render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {makeTempNetwork} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {TEMPORARY_NETWORK_FOLDER} from "../../../../components/MultiAgentAccelerator/const"
import {
    BANNER_AUTO_DISMISS_MS,
    NetworkEditorDock,
    NetworkEditorDockProps,
} from "../../../../components/MultiAgentAccelerator/Editor/NetworkEditorDock"
import {sendChatQuery} from "../../../../controller/agent/Agent"
import {ChatMessage, ChatMessageType, ChatResponse} from "../../../../generated/neuro-san/NeuroSanClient"
import {useTempNetworksStore} from "../../../../state/TemporaryNetworks"

//#region Constants

const ABORT_TITLE = "Abort changes?"
const AGENT_1 = "agent1"
const APPLIED_BANNER = "Changes applied."
const APPLY_BUTTON = "Apply"
const APPLYING_TITLE = "Applying changes to network"
const CANCELLED_BANNER = "Applying cancelled."
const CLOSE_EDIT_BUTTON = "close edit mode"
// MUIAlert's dismiss button has aria-label "close".
const DISMISS_BANNER_BUTTON = "close"
const DOCK_DEFAULT_RES = "dock-default-res"
const DOCK_NETWORK_ID = "temporary/dock-test-net"
const DOCK_NETWORK_NAME = "dock_network"
const EDIT_PROMPT = "Add a node"
const ELVES_PROMPT = "add some elves to check work"
const FAILED_BANNER = "Failed to apply network change."
const KEEP_APPLYING_BUTTON = "Keep applying"
// display_as value marking an editable LLM agent node.
const PROMPT_PLACEHOLDER = "Describe a change to the network"
// These buttons render a ■ startIcon, so their accessible name isn't a clean string; match the label.
const STOP_BUTTON = /stop/iu
const STOP_DISCARD_BUTTON = /stop & discard/iu

//#endregion Constants

//#region Mocks
vi.mock("../../../../controller/agent/Agent")

// Handle to the auto-mocked sendChatQuery so tests can stub it without repeating the cast.
const mockSendChatQuery = vi.mocked(sendChatQuery)

//#endregion Mocks

describe("NetworkEditorDock", () => {
    withStrictMocks()

    const makeDockReservationChunk = (reservationId: string, agentNetworkName: string) =>
        JSON.stringify({
            response: {
                type: "AGENT_FRAMEWORK",
                sly_data: {
                    agent_reservations: [
                        {
                            reservation_id: reservationId,
                            lifetime_in_seconds: 86400,
                            expiration_time_in_seconds: Date.now() / 1000 + 86400,
                        },
                    ],
                    agent_network_name: agentNetworkName,
                },
            },
        })

    /**
     * Mocks sendChatQuery so a dock apply stays in-flight until the returned `release()` is called,
     * at which point it succeeds with a reservation matching the current network. Lets a test observe
     * the in-flight overlay without the apply secretly resolving as a failure.
     */
    const mockInFlightDockApply = () => {
        let release!: () => void

        mockSendChatQuery.mockImplementation(
            (_url, _signal, _query, _agent, chunkCallback) =>
                new Promise<ChatResponse>((resolve) => {
                    release = () => {
                        chunkCallback(makeDockReservationChunk(DOCK_DEFAULT_RES, DOCK_NETWORK_NAME))
                        resolve({} satisfies ChatResponse)
                    }
                })
        )

        return () => release()
    }

    let user: UserEvent

    beforeEach(() => {
        // This has nothing to do with Jest itself and everything to do with a bug in React Testing Library.
        // See: https://github.com/testing-library/user-event/issues/1115#issuecomment-1565730917
        // @ts-expect-error -- it's an ugly workaround to be removed when the above issue is fixed in RTL.
        globalThis["jest"] = {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        }
        mockSendChatQuery.mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
            chunkCallback(makeDockReservationChunk(DOCK_DEFAULT_RES, DOCK_NETWORK_NAME))
            return {} satisfies ChatResponse
        })

        user = userEvent.setup()

        const initalState = useTempNetworksStore.getInitialState()
        useTempNetworksStore.setState(initalState)
    })

    const defaultProps: NetworkEditorDockProps = {
        currentUser: "test-user",
        id: "test-dock-id",
        isActive: true,
        networkId: DOCK_NETWORK_ID,
        neuroSanURL: "http://localhost:8080",
        setIsEditingNetwork: vi.fn(),
        setSelectedNetwork: vi.fn(),
        tempNetworks: [makeTempNetwork(DOCK_NETWORK_ID, [{origin: AGENT_1, tools: []}], DOCK_NETWORK_NAME)],
    }

    const renderNetworkEditorDock = (overrides: Partial<NetworkEditorDockProps> = {}) => {
        const props = {...defaultProps, ...overrides}
        return render(<NetworkEditorDock {...props} />)
    }

    it("shows the network editor dock when in edit mode", async () => {
        renderNetworkEditorDock()

        await screen.findByText("Network Editor")
    })

    it("Hides the dock when not in edit mode", () => {
        const {container} = renderNetworkEditorDock({isActive: false})

        // Should render nothing, not even Backdrop
        expect(container).toBeEmptyDOMElement()
    })

    it("calls setIsEditingNetwork when the close button is clicked", async () => {
        const setIsEditingNetwork = vi.fn()
        renderNetworkEditorDock({setIsEditingNetwork})

        await screen.findByText("Network Editor")

        const closeButton = screen.getByRole("button", {name: CLOSE_EDIT_BUTTON})
        await user.click(closeButton)

        expect(setIsEditingNetwork).toHaveBeenCalledExactlyOnceWith(false)
    })

    it("exits edit mode when the Escape key is pressed", async () => {
        const setIsEditingNetwork = vi.fn()
        renderNetworkEditorDock({setIsEditingNetwork})

        await user.keyboard("{Escape}")

        expect(setIsEditingNetwork).toHaveBeenCalledExactlyOnceWith(false)
    })

    it("does not exit on Escape when not in edit mode", async () => {
        const setIsEditingNetwork = vi.fn()
        renderNetworkEditorDock({isActive: false, setIsEditingNetwork})

        await user.keyboard("{Escape}")

        expect(setIsEditingNetwork).not.toHaveBeenCalled()
    })

    it("aborts an in-flight dock request if the close button is clicked during streaming", async () => {
        const setIsEditingNetwork = vi.fn()
        let capturedSignal: AbortSignal | undefined
        mockSendChatQuery.mockImplementation(
            (_url: string, signal: AbortSignal) =>
                new Promise<ChatResponse>((_resolve, reject) => {
                    capturedSignal = signal
                    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
                })
        )

        renderNetworkEditorDock({setIsEditingNetwork})

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // Wait until the overlay appears (streaming started)
        await screen.findByText(APPLYING_TITLE)

        // Click the close button while request is in-flight
        await user.click(screen.getByRole("button", {name: CLOSE_EDIT_BUTTON}))

        expect(capturedSignal?.aborted).toBe(true)
        expect(setIsEditingNetwork).toHaveBeenCalledExactlyOnceWith(false)
    })

    it("Apply button is disabled when prompt is empty", () => {
        renderNetworkEditorDock()

        expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeDisabled()
    })

    it("Apply button becomes enabled after typing a prompt", async () => {
        renderNetworkEditorDock({
            neuroSanURL: "http://localhost:8080",
            currentUser: "test-user",
        })

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste("Add a new agent")

        expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeEnabled()
    })

    it("forwards the dock prompt to sendChatQuery on Apply and replaces the network", async () => {
        const NEW_DOCK_RES_ID = "dock-new-res"
        mockSendChatQuery.mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
            chunkCallback(makeDockReservationChunk(NEW_DOCK_RES_ID, DOCK_NETWORK_NAME))
            return {} satisfies ChatResponse
        })

        const setSelectedNetwork = vi.fn()
        renderNetworkEditorDock({
            setSelectedNetwork,
        })

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste("Add a legal review agent")
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The typed prompt is forwarded to the designer...
        expect(mockSendChatQuery).toHaveBeenCalledTimes(1)
        expect(mockSendChatQuery.mock.calls[0][2]).toBe("Add a legal review agent")

        // ...and the returned reservation replaces the current network
        expect(setSelectedNetwork).toHaveBeenCalledWith(`${TEMPORARY_NETWORK_FOLDER}/${NEW_DOCK_RES_ID}`)
    })

    it("shows an error banner when dock apply returns no reservations", async () => {
        mockSendChatQuery.mockResolvedValue({})

        renderNetworkEditorDock()

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The user sees an error banner explaining no reservation came back
        expect(await screen.findByText(FAILED_BANNER)).toBeInTheDocument()
        expect(screen.getByText(/did not return a reservation/iu)).toBeInTheDocument()
    })

    it("shows an error banner when dock apply returns a reservation that does not match the network", async () => {
        // exercising the "reservation returned but did not match" branch.
        mockSendChatQuery.mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
            chunkCallback(makeDockReservationChunk(DOCK_DEFAULT_RES, "some-other-network"))
            return {} satisfies ChatResponse
        })

        const setSelectedNetwork = vi.fn()
        renderNetworkEditorDock({
            setSelectedNetwork,
            tempNetworks: [makeTempNetwork(DOCK_NETWORK_ID, [{origin: AGENT_1, tools: []}], undefined)],
        })

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The user sees an error banner explaining the reservation did not match, and no navigation occurs
        await screen.findByText(FAILED_BANNER)
        screen.getByText(/did not match the current network/iu)
        expect(setSelectedNetwork).not.toHaveBeenCalled()
    })

    it("shows an error banner and resets state when dock apply throws", async () => {
        mockSendChatQuery.mockRejectedValue(new Error("Network failure"))

        renderNetworkEditorDock({
            networkId: DOCK_NETWORK_ID,
        })

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The user sees an error banner carrying the underlying failure
        await screen.findByText(FAILED_BANNER)
        screen.getByText(/network failure/iu)

        // Button should re-enable after error
        expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeEnabled()
    })

    it("shows a timeout error banner that persists when the dock apply request times out", async () => {
        vi.useFakeTimers()

        // Create a custom UserEvent that is synced with Vitest's fake timers
        const localUser = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime,
        })

        mockSendChatQuery.mockImplementation((_url: string, signal: AbortSignal) => {
            return new Promise<ChatResponse>((_resolve, reject) => {
                signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
            })
        })

        renderNetworkEditorDock()

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await localUser.click(promptField)
        await localUser.paste(EDIT_PROMPT)

        const applyButton = screen.getByRole("button", {name: APPLY_BUTTON})
        await localUser.click(applyButton)

        // Advance past the 120-second dock apply timeout
        act(() => {
            vi.advanceTimersByTime(121_000)
        })

        // The user sees an error banner explaining the request timed out...
        await screen.findByText(/timed out/u)

        // ...and, unlike success/cancel banners, it does not auto-dismiss
        act(() => {
            vi.advanceTimersByTime(BANNER_AUTO_DISMISS_MS + 100)
        })
        expect(screen.getByText(FAILED_BANNER)).toBeInTheDocument()
    })

    it("deduplicates reservations when two chunks with the same name but different expiry arrive", async () => {
        const LOW_EXPIRY = Date.now() / 1000 + 100
        const HIGH_EXPIRY = Date.now() / 1000 + 86400
        const FIRST_RES = "res-low"
        const SECOND_RES = "res-high"

        const makeChunk = (reservationId: string, expiry: number) =>
            JSON.stringify({
                response: {
                    type: ChatMessageType.AGENT_FRAMEWORK,
                    sly_data: {
                        agent_reservations: [
                            {
                                reservation_id: reservationId,
                                lifetime_in_seconds: 300,
                                expiration_time_in_seconds: expiry,
                            },
                        ],
                        agent_network_name: DOCK_NETWORK_NAME,
                    },
                } satisfies ChatMessage,
            })

        mockSendChatQuery.mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
            // Send low-expiry first, then high-expiry (high should win)
            chunkCallback(makeChunk(FIRST_RES, LOW_EXPIRY))
            chunkCallback(makeChunk(SECOND_RES, HIGH_EXPIRY))
            return {} satisfies ChatResponse
        })

        const setSelectedNetwork = vi.fn()
        renderNetworkEditorDock({
            setSelectedNetwork,
        })

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(promptField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The higher-expiry reservation should win
        expect(setSelectedNetwork).toHaveBeenCalledExactlyOnceWith(`${TEMPORARY_NETWORK_FOLDER}/${SECOND_RES}`)
    })

    it("pressing Enter in the prompt field submits the dock apply", async () => {
        renderNetworkEditorDock()

        const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.type(promptField, `${EDIT_PROMPT}{Enter}`)
        expect(mockSendChatQuery).toHaveBeenCalledTimes(1)
    })

    it("does not show the applying overlay when the dock is idle", () => {
        const {container} = renderNetworkEditorDock({isActive: false})

        // Neither backdrop nor dock should be shown when inactive
        expect(container).toBeEmptyDOMElement()
    })

    it("shows the applying overlay with the prompt text while apply is in-flight", async () => {
        // Keep the apply in-flight so the overlay stays mounted; it never resolves, so no cleanup is needed.
        mockInFlightDockApply()

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(ELVES_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The overlay is shown with its title and the in-flight prompt text
        expect(screen.getByText(APPLYING_TITLE)).toBeVisible()
        expect(screen.getByText(ELVES_PROMPT)).toBeInTheDocument()
    })

    it("removes the applying overlay once the apply call completes", async () => {
        const release = mockInFlightDockApply()

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(ELVES_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))
        expect(screen.getByText(APPLYING_TITLE)).toBeVisible()

        await act(async () => {
            release()
        })

        await waitFor(() => {
            expect(screen.queryByText(APPLYING_TITLE)).not.toBeInTheDocument()
        })
    })

    it("shows Stop button in backdrop while applying; clicking it shows the confirm card", async () => {
        const release = mockInFlightDockApply()

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // Stop button should appear while backdrop is open, with no confirm card yet
        const stopButton = screen.getByRole("button", {name: STOP_BUTTON})
        expect(stopButton).toBeInTheDocument()
        expect(screen.queryByText(ABORT_TITLE)).not.toBeInTheDocument()

        await user.click(stopButton)

        // Confirm card should appear
        expect(screen.getByText(ABORT_TITLE)).toBeInTheDocument()
        expect(screen.getByRole("button", {name: KEEP_APPLYING_BUTTON})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: STOP_DISCARD_BUTTON})).toBeInTheDocument()

        await act(async () => {
            release()
        })
    })

    it("Keep applying dismisses the confirm card and continues streaming", async () => {
        const release = mockInFlightDockApply()

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        await user.click(screen.getByRole("button", {name: STOP_BUTTON}))
        await user.click(screen.getByRole("button", {name: KEEP_APPLYING_BUTTON}))

        // Progress card (with Stop button) should be back; backdrop still visible
        screen.getByRole("button", {name: STOP_BUTTON})
        expect(screen.getByText(APPLYING_TITLE)).toBeVisible()

        await act(async () => {
            release()
        })
    })

    it("clears the confirm card if the request completes while it is open, so the next apply streams", async () => {
        const release = mockInFlightDockApply()

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // Open the confirm card, then let the in-flight request complete without confirming.
        await user.click(await screen.findByRole("button", {name: STOP_BUTTON}))
        screen.getByText(ABORT_TITLE)

        await act(async () => {
            release()
        })

        // The completed apply must clear the stale confirm state.
        await screen.findByText(APPLIED_BANNER)
        expect(screen.queryByText(ABORT_TITLE)).not.toBeInTheDocument()

        // A fresh apply should stream, not resurface the confirm card immediately.
        const nextRelease = mockInFlightDockApply()
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        await screen.findByRole("button", {name: STOP_BUTTON})
        expect(screen.queryByText(ABORT_TITLE)).not.toBeInTheDocument()

        await act(async () => {
            nextRelease()
        })
    })

    it("Stop & discard aborts the request, hides backdrop, shows a cancel banner, restores prompt", async () => {
        mockSendChatQuery.mockImplementation((_url: string, signal: AbortSignal) => {
            return new Promise<ChatResponse>((_resolve, reject) => {
                signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
            })
        })

        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // Open confirm card, then discard
        await user.click(await screen.findByRole("button", {name: STOP_BUTTON}))
        await user.click(await screen.findByRole("button", {name: STOP_DISCARD_BUTTON}))

        // Backdrop should close
        await waitFor(() => {
            expect(screen.queryByText(APPLYING_TITLE)).not.toBeInTheDocument()
        })

        // The user sees a cancel banner and the prompt is left intact for retry
        await screen.findByText(CANCELLED_BANNER)
        screen.getByText(/prompt is restored below/iu)
        screen.getByDisplayValue(EDIT_PROMPT)

        // Discarding is an intentional abort, not a failure
        expect(screen.queryByText(FAILED_BANNER)).not.toBeInTheDocument()
    })

    it("shows a success banner and clears the prompt after dock apply completes", async () => {
        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        // The user sees a success banner confirming their changes were applied...
        await screen.findByText(APPLIED_BANNER)
        screen.getByText(/network has been updated/iu)
        // ...and the prompt is cleared once the change lands
        expect(screen.getByPlaceholderText(PROMPT_PLACEHOLDER)).toHaveValue("")
    })

    it("auto-dismisses the success banner after the timeout elapses", async () => {
        vi.useFakeTimers()

        // Create a custom UserEvent that is synced with Vitest's fake timers
        const localUser = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime,
        })

        renderNetworkEditorDock()

        const editInput = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await localUser.click(editInput)
        await localUser.paste(EDIT_PROMPT)

        const applyButton = screen.getByRole("button", {name: APPLY_BUTTON})
        await localUser.click(applyButton)

        await screen.findByText(APPLIED_BANNER)

        // Once the auto-dismiss timer fires, the banner disappears
        act(() => {
            vi.advanceTimersByTime(BANNER_AUTO_DISMISS_MS + 100)
        })

        await waitFor(() => {
            expect(screen.queryByText(APPLIED_BANNER)).not.toBeInTheDocument()
        })
    })

    it("dismisses the banner immediately when its close button is clicked", async () => {
        renderNetworkEditorDock()

        const instructionsField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
        await user.click(instructionsField)
        await user.paste(EDIT_PROMPT)
        await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

        await screen.findByText(APPLIED_BANNER)

        // Clicking the banner's close button removes it without waiting for the timer
        await user.click(screen.getByRole("button", {name: DISMISS_BANNER_BUTTON}))
        expect(screen.queryByText(APPLIED_BANNER)).not.toBeInTheDocument()
    })

    it("does nothing when Enter is pressed with an empty prompt", async () => {
        renderNetworkEditorDock()

        // Enter bypasses the disabled Apply button, so handleDockApply runs and must early-return.
        await user.click(screen.getByPlaceholderText(PROMPT_PLACEHOLDER))
        await user.keyboard("{Enter}")

        expect(mockSendChatQuery).not.toHaveBeenCalled()

        // The saving backdrop goes away when inactive
        expect(screen.queryByText(/applying changes to network/iu)).not.toBeInTheDocument()
    })
})
