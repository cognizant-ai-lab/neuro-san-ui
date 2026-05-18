/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AGENT_NETWORK_DESIGNER_ID, AGENT_RESERVATIONS_KEY} from "../../../components/MultiAgentAccelerator/const"
import {TempNetworkEditPanel} from "../../../components/MultiAgentAccelerator/TempNetworkEditPanel"
import {sendChatQuery} from "../../../controller/agent/Agent"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"

jest.mock("../../../controller/agent/Agent")

// #region: Test fixtures

const NEURO_SAN_URL = "http://localhost:8080"
const CURRENT_USER = "test-user"
const RESERVATION_ID = "my-network-e4f5a-1234-5678"
const AGENT_NETWORK_NAME = "my-network"

const TEMP_NETWORK: TemporaryNetwork = {
    reservation: {
        reservation_id: RESERVATION_ID,
        lifetime_in_seconds: 300,
        expiration_time_in_seconds: Date.now() / 1000 + 300,
    },
    agentInfo: {agent_name: `temporary/${RESERVATION_ID}`},
    agentNetworkName: AGENT_NETWORK_NAME,
    networkHocon: null,
    agentNetworkDefinition: [{origin: "frontman", tools: [], display_as: "llm_agent"}],
}

/**
 * Builds a streamed JSON line that simulates the network designer returning a new reservation.
 */
const makeReservationChunk = (reservationId: string): string =>
    JSON.stringify({
        response: {
            type: ChatMessageType.AGENT_FRAMEWORK,
            sly_data: {
                [AGENT_RESERVATIONS_KEY]: [
                    {
                        reservation_id: reservationId,
                        lifetime_in_seconds: 300,
                        expiration_time_in_seconds: Date.now() / 1000 + 300,
                    },
                ],
            },
        },
    })

// #endregion: Test fixtures

const renderPanel = (overrides: Partial<Parameters<typeof TempNetworkEditPanel>[0]> = {}) => {
    const onNetworkUpdated = jest.fn()

    render(
        <TempNetworkEditPanel
            neuroSanURL={NEURO_SAN_URL}
            currentUser={CURRENT_USER}
            currentTempNetwork={TEMP_NETWORK}
            onNetworkUpdated={onNetworkUpdated}
            {...overrides}
        />
    )

    return {onNetworkUpdated}
}

describe("TempNetworkEditPanel", () => {
    withStrictMocks()

    // #region: Rendering

    it("renders the input placeholder and send button", () => {
        renderPanel()
        expect(screen.getByRole("textbox")).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Send"})).toBeInTheDocument()
    })

    it("send button is disabled when input is empty", () => {
        renderPanel()
        expect(screen.getByRole("button", {name: "Send"})).toBeDisabled()
    })

    it("send button becomes enabled when input has text", async () => {
        const user = userEvent.setup()
        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")

        expect(screen.getByRole("button", {name: "Send"})).toBeEnabled()
    })

    // #endregion: Rendering

    // #region: Sending

    it("calls sendChatQuery targeting the network designer when send is clicked", async () => {
        const user = userEvent.setup()
        ;(sendChatQuery as jest.Mock).mockResolvedValue(undefined)

        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await waitFor(() => expect(sendChatQuery).toHaveBeenCalledTimes(1))

        const [url, , userInput, targetAgent] = (sendChatQuery as jest.Mock).mock.calls[0]
        expect(url).toBe(NEURO_SAN_URL)
        expect(userInput).toBe("Add a validation agent")
        expect(targetAgent).toBe(AGENT_NETWORK_DESIGNER_ID)
    })

    it("does NOT include skip_designer in slyData (uses full reasoning model)", async () => {
        const user = userEvent.setup()
        ;(sendChatQuery as jest.Mock).mockResolvedValue(undefined)

        renderPanel()

        await user.type(screen.getByRole("textbox"), "Remove the audit agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await waitFor(() => expect(sendChatQuery).toHaveBeenCalledTimes(1))

        const slyData = (sendChatQuery as jest.Mock).mock.calls[0][6] as Record<string, unknown>
        expect(slyData).not.toHaveProperty("skip_designer")
    })

    it("sends via Enter key (without Shift)", async () => {
        ;(sendChatQuery as jest.Mock).mockResolvedValue(undefined)

        renderPanel()

        const input = screen.getByRole("textbox")
        fireEvent.change(input, {target: {value: "Add a validation agent"}})
        fireEvent.keyDown(input, {key: "Enter", shiftKey: false})

        await waitFor(() => expect(sendChatQuery).toHaveBeenCalledTimes(1))
    })

    it("does NOT send on Shift+Enter", async () => {
        renderPanel()

        const input = screen.getByRole("textbox")
        fireEvent.change(input, {target: {value: "Add a validation agent"}})
        fireEvent.keyDown(input, {key: "Enter", shiftKey: true})

        // Nothing async triggered — verify no call was made
        expect(sendChatQuery).not.toHaveBeenCalled()
    })

    // #endregion: Sending

    // #region: Success path

    it("calls onNetworkUpdated with the parsed replacement network on success", async () => {
        const user = userEvent.setup()

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback: (c: string) => void) => {
            callback(makeReservationChunk(RESERVATION_ID))
        })

        const {onNetworkUpdated} = renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await waitFor(() => expect(onNetworkUpdated).toHaveBeenCalledTimes(1))

        const [replacement, allNew] = onNetworkUpdated.mock.calls[0] as [TemporaryNetwork, TemporaryNetwork[]]
        expect(replacement.reservation.reservation_id).toBe(RESERVATION_ID)
        expect(allNew).toHaveLength(1)
    })

    it("clears the input after a successful edit", async () => {
        const user = userEvent.setup()

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback: (c: string) => void) => {
            callback(makeReservationChunk(RESERVATION_ID))
        })

        renderPanel()

        const input = screen.getByRole("textbox")
        await user.type(input, "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await waitFor(() => expect(input).toHaveValue(""))
    })

    it("shows success status message after update", async () => {
        const user = userEvent.setup()

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback: (c: string) => void) => {
            callback(makeReservationChunk(RESERVATION_ID))
        })

        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await screen.findByText("Network topology updated.")
    })

    // #endregion: Success path

    // #region: Error paths

    it("shows error message when designer returns no networks", async () => {
        const user = userEvent.setup()

        // Returns without calling the callback → no networks collected
        ;(sendChatQuery as jest.Mock).mockResolvedValue(undefined)

        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await screen.findByText("No topology changes were returned. Please try a different prompt.")
    })

    it("shows error message when sendChatQuery rejects", async () => {
        const user = userEvent.setup()

        ;(sendChatQuery as jest.Mock).mockRejectedValue(new Error("Network error"))

        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await screen.findByText("Failed to apply changes: Network error")
    })

    // #endregion: Error paths

    // #region: Stop

    it("shows stop button while streaming and hides send button", async () => {
        // Never resolves so streaming stays in-flight
        ;(sendChatQuery as jest.Mock).mockImplementation(
            () =>
                new Promise<void>(() => {
                    void 0
                })
        )

        const user = userEvent.setup()
        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        await screen.findByRole("button", {name: "Stop"})
        expect(screen.queryByRole("button", {name: "Send"})).not.toBeInTheDocument()
    })

    it("stops streaming and clears status when stop is clicked", async () => {
        // Use fake timers so MUI's ripple animation timers are controlled and don't fire
        // state updates outside of act().
        jest.useFakeTimers()
        ;(sendChatQuery as jest.Mock).mockImplementation(
            (_url: string, signal: AbortSignal) =>
                new Promise<void>((_, reject) => {
                    signal.addEventListener("abort", () => {
                        reject(new DOMException("Aborted", "AbortError"))
                    })
                })
        )

        const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime})
        renderPanel()

        await user.type(screen.getByRole("textbox"), "Add a validation agent")
        await user.click(screen.getByRole("button", {name: "Send"}))

        const stopBtn = await screen.findByRole("button", {name: "Stop"})
        await user.click(stopBtn)

        // After abort: send button reappears, no error status
        await screen.findByRole("button", {name: "Send"})
        expect(screen.queryByText(/failed to apply/iu)).not.toBeInTheDocument()
    })

    // #endregion: Stop
})
