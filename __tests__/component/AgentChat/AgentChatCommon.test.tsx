// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {AgentChatCommon} from "../../../components/AgentChat/AgentChatCommon"
import {cleanUpAgentName} from "../../../components/AgentChat/common"
import {AgentType} from "../../../generated/metadata"
import {ConnectivityResponse, FunctionResponse} from "../../../generated/neuro_san/api/grpc/agent"

// Mock agent API
jest.mock("../../../controller/agent/agent", () => ({
    getAgentFunction: () =>
        FunctionResponse.fromPartial({
            function: {description: "Hello, I am the Hello World agent", parameters: []},
        }),
    getConnectivity: () => ConnectivityResponse.fromPartial({connectivityInfo: []}),
}))

describe("AgentChatCommon", () => {
    let user: UserEvent
    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("Should render correctly", async () => {
        render(
            <AgentChatCommon
                id=""
                currentUser=""
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.TELCO_NETWORK_SUPPORT}
            />
        )

        expect(await screen.findByText("Telco Network Support")).toBeInTheDocument()

        // Should have "Clear Chat", "Regenerate" and "Send" buttons
        expect(screen.getByRole("button", {name: "Clear Chat"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Regenerate"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Send"})).toBeInTheDocument()
    })

    it("Should behave correctly when awaiting the LLM response", async () => {
        render(
            <AgentChatCommon
                id=""
                currentUser=""
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={true}
                targetAgent={AgentType.TELCO_NETWORK_SUPPORT}
            />
        )

        // "Stop" button should be enabled while awaiting LLM response
        expect(await screen.findByRole("button", {name: "Stop"})).toBeEnabled()

        // "Send" button should be disabled while awaiting LLM response
        expect(await screen.findByRole("button", {name: "Send"})).toBeDisabled()

        // "Clear Chat" button should not be in the document while awaiting LLM response
        expect(screen.queryByRole("button", {name: "Clear Chat"})).not.toBeInTheDocument()

        // "Regenerate" button should be replaced by "Stop" button while awaiting LLM response
        expect(screen.getByRole("button", {name: "Stop"})).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: "Regenerate"})).not.toBeInTheDocument()
    })

    it("Should handle send correctly", async () => {
        const mockSendFunction = jest.fn()
        const testUser = "testUser"
        render(
            <AgentChatCommon
                id=""
                currentUser={testUser}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.TELCO_NETWORK_SUPPORT}
                sendFunction={mockSendFunction}
            />
        )

        // locate user query input
        const userQueryInput = screen.getByPlaceholderText("Chat with Telco Network Support")
        expect(userQueryInput).toBeInTheDocument()

        // Type a query
        const query = "Hello"
        await user.type(userQueryInput, query)

        // Find "Send" button
        const sendButton = screen.getByRole("button", {name: "Send"})

        // Click on the "Send" button
        await user.click(sendButton)

        expect(mockSendFunction).toHaveBeenCalledTimes(1)
        expect(mockSendFunction).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Object),
            testUser,
            query,
            AgentType.TELCO_NETWORK_SUPPORT,
            expect.any(Function)
        )
    })

    it("Should show agent introduction", async () => {
        render(
            <AgentChatCommon
                id=""
                currentUser="testUser"
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.HELLO_WORLD}
                sendFunction={jest.fn()}
            />
        )

        expect(await screen.findByText(cleanUpAgentName(AgentType.HELLO_WORLD))).toBeInTheDocument()
    })
})
