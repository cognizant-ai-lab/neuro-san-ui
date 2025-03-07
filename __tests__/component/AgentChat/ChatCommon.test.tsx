// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {ChatCommon} from "../../../components/AgentChat/ChatCommon"
import {AgentErrorProps, CombinedAgentType} from "../../../components/AgentChat/Types"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {sendChatQuery} from "../../../controller/agent/agent"
import {AgentType} from "../../../generated/metadata"
import {ChatResponse, ConnectivityResponse, FunctionResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

// Mock agent API
jest.mock("../../../controller/agent/agent", () => ({
    getAgentFunction: () =>
        FunctionResponse.fromPartial({
            function: {description: "Hello, I am the Hello World agent", parameters: []},
        }),
    getConnectivity: () => ConnectivityResponse.fromPartial({connectivityInfo: []}),
    sendChatQuery: jest.fn(),
}))

const TEST_USER = "testUser"

describe("AgentChatCommon", () => {
    let user: UserEvent
    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    async function sendQuery(agent: CombinedAgentType, query: string) {
        // locate user query input
        const userQueryInput = screen.getByPlaceholderText(`Chat with ${cleanUpAgentName(agent)}`)
        expect(userQueryInput).toBeInTheDocument()

        // Type a query
        await user.type(userQueryInput, query)

        // Find "Send" button
        const sendButton = screen.getByRole("button", {name: "Send"})
        expect(sendButton).toBeInTheDocument()

        // Click on the "Send" button
        await user.click(sendButton)
    }

    it("Should render correctly", async () => {
        render(
            <ChatCommon
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
            <ChatCommon
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
        expect(screen.queryByRole("button", {name: "Regenerate"})).not.toBeInTheDocument()
    })

    it("Should handle send correctly", async () => {
        const mockSendFunction = jest.fn()
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.TELCO_NETWORK_SUPPORT}
                onSend={mockSendFunction}
            />
        )

        const query = "Sample test query for send test"
        await sendQuery(AgentType.TELCO_NETWORK_SUPPORT, query)

        expect(mockSendFunction).toHaveBeenCalledTimes(1)
        expect(mockSendFunction).toHaveBeenCalledWith(query)
    })

    it("Should handle receiving chunks correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        const chatCommon = (
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.TELCO_NETWORK_SUPPORT}
                onSend={jest.fn()}
                onChunkReceived={onChunkReceivedMock}
            />
        )
        render(chatCommon)

        const testResponseText = '"Response text from LLM"'
        const successMessage: ChatMessage = ChatMessage.fromPartial({
            type: ChatMessageChatMessageType.AI,
            text: testResponseText,
        })

        const chatResponse: ChatResponse = ChatResponse.fromPartial({
            response: successMessage,
        })

        const chunk = JSON.stringify({result: chatResponse})
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(chunk)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(AgentType.TELCO_NETWORK_SUPPORT, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(chunk)
    })

    it("Should correctly detect an error chunk from Neuro-san", async () => {
        const chatCommon = (
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.ESP_DECISION_ASSISTANT}
                onSend={jest.fn()}
            />
        )
        render(chatCommon)

        const errorMessage = "Error message from LLM"
        const testResponseText = JSON.stringify({
            error: errorMessage,
            traceback: "test tracebook",
            tool: "test tool",
        } as AgentErrorProps)
        const successMessage: ChatMessage = ChatMessage.fromPartial({
            type: ChatMessageChatMessageType.AI,
            text: testResponseText,
        })

        const chatResponse: ChatResponse = ChatResponse.fromPartial({
            response: successMessage,
        })

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify({result: chatResponse}))
        })

        const query = "Sample test query for error handling"
        await sendQuery(AgentType.ESP_DECISION_ASSISTANT, query)

        // Should be 3 retries due to the error
        expect(await screen.findAllByText(/Error occurred/u)).toHaveLength(3)

        // Should be 3 alert items
        const alertItems = await screen.findAllByRole("alert")

        // First two are warnings
        ;[alertItems[0], alertItems[1], alertItems[2]].forEach((item) => {
            expect(item).toHaveClass("MuiAlert-standardWarning")
        })

        // Final one is an error
        expect(alertItems[3]).toHaveClass("MuiAlert-standardError")
    })

    it("Should show agent introduction", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={AgentType.HELLO_WORLD}
            />
        )

        expect(await screen.findByText(cleanUpAgentName(AgentType.HELLO_WORLD))).toBeInTheDocument()
    })
})
