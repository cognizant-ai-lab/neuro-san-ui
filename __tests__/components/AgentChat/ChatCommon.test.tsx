import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {ChatCommon} from "../../../components/AgentChat/ChatCommon"
import {AgentErrorProps, CombinedAgentType, LegacyAgentType} from "../../../components/AgentChat/Types"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {sendChatQuery} from "../../../controller/agent/agent"
import {sendLlmRequest} from "../../../controller/llm/llm_chat"
import {ChatResponse, ConnectivityResponse, FunctionResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {
    ChatContext,
    ChatHistory,
    ChatMessage,
    ChatMessageChatMessageType,
} from "../../../generated/neuro_san/api/grpc/chat"

// Mock agent API
jest.mock("../../../controller/agent/agent", () => ({
    getAgentFunction: () =>
        FunctionResponse.fromPartial({
            function: {description: "Hello, I am the Hello World agent", parameters: []},
        }),
    getConnectivity: () =>
        ConnectivityResponse.fromPartial({
            connectivityInfo: [
                {
                    origin: "testOrigin",
                    tools: ["testTool"],
                },
            ],
        }),
    sendChatQuery: jest.fn(),
}))

// Mock llm_chat API
jest.mock("../../../controller/llm/llm_chat", () => ({
    sendLlmRequest: jest.fn(),
}))

// Don't want to send user notifications during tests so mock this
jest.mock("../../../components/Common/notification")

const TEST_USER = "testUser"
const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"
const CHAT_WITH_MATH_GUY = `Chat with ${TEST_AGENT_MATH_GUY}`

function getResponseMessage(type: ChatMessageChatMessageType, text: string): ChatMessage {
    return ChatMessage.fromPartial({
        type: type,
        text: text,
        chatContext: ChatContext.fromPartial({
            chatHistories: [
                ChatHistory.fromPartial({
                    messages: [
                        ChatMessage.fromPartial({
                            type: type,
                            text: text,
                        }),
                    ],
                }),
            ],
        }),
    })
}

describe("ChatCommon", () => {
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
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()

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
                targetAgent={TEST_AGENT_MATH_GUY}
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

    it("Should handle user input correctly and should call Send on click", async () => {
        const mockSendFunction = jest.fn()
        const strToCheck = "Please fix my internet"

        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={mockSendFunction}
            />
        )

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type user input
        await user.type(userInput, strToCheck)
        // Check that user input is correct
        expect(userInput).toHaveValue(strToCheck)

        const sendButton = await screen.findByRole("button", {name: "Send"})
        expect(sendButton).toBeInTheDocument()
        // Click Send button
        await user.click(sendButton)

        // Check that Send button on click works
        expect(mockSendFunction).toHaveBeenCalledTimes(1)
        expect(mockSendFunction).toHaveBeenCalledWith(strToCheck)
    })

    it("Should call Send on enter", async () => {
        const mockSendFunction = jest.fn()
        const strToCheck = "Please fix my internet"

        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={mockSendFunction}
            />
        )

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type user input
        await user.type(userInput, strToCheck)
        // Press enter
        fireEvent.keyDown(userInput, {key: "Enter"})

        // Check that enter has triggered the Send
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledWith(strToCheck))
    })

    it("Should not call Send on enter + shift and should handle multiline input correctly", async () => {
        const mockSendFunction = jest.fn()
        const strToCheckLine1 = "Please fix my internet line 1"
        const strToCheckLine2 = "Please fix my internet line 2"
        const fullStrToCheck = `${strToCheckLine1}\n${strToCheckLine2}`

        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={mockSendFunction}
            />
        )

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type line 1
        await user.type(userInput, strToCheckLine1)
        // Type enter + shift
        await user.type(userInput, "{Shift>}{Enter}{/Shift}")

        // Make sure that enter + shift has not triggered the Send
        await waitFor(() => expect(mockSendFunction).not.toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).not.toHaveBeenCalledWith(strToCheckLine1))

        // Type line 2
        await user.type(userInput, strToCheckLine2)

        // Press enter
        fireEvent.keyDown(userInput, {key: "Enter"})

        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledWith(fullStrToCheck))
    })

    it("Should handle receiving chunks from Neuro-san agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={jest.fn()}
                onChunkReceived={onChunkReceivedMock}
            />
        )

        const testResponseText = '"Response text from LLM"'
        const chatResponse: ChatResponse = ChatResponse.fromPartial({
            response: ChatMessage.fromPartial({
                type: ChatMessageChatMessageType.AGENT_FRAMEWORK,
                text: testResponseText,
                origin: [{tool: "testTool", instantiationIndex: 1}],
            }),
        })

        const chunk = JSON.stringify({result: chatResponse})
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(chunk)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(chunk)
    })

    it("Should handle receiving chunks from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={LegacyAgentType.DataGenerator}
                onSend={jest.fn()}
                onChunkReceived={onChunkReceivedMock}
            />
        )

        const testResponseText = '"Response text from LLM"'

        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(LegacyAgentType.DataGenerator, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText)
    })

    it("Should handle final answer from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={LegacyAgentType.DMSChat}
                onSend={jest.fn()}
                onChunkReceived={onChunkReceivedMock}
            />
        )

        const testResponseText = "Final Answer: Sample final answer from LLM"

        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText)
        })

        const query = "Sample test query for legacy agent final answer handling"
        await sendQuery(LegacyAgentType.DMSChat, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText)

        // should be a span with content "Final Answer"
        expect(screen.getByText("Final Answer")).toBeInTheDocument()
    })

    it("Should correctly handle errors thrown while fetching", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={LegacyAgentType.OpportunityFinder}
                onSend={jest.fn()}
            />
        )
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new Error("Sample error from fetch")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be 3 attempts, so 3 error messages
        expect(await screen.findAllByText(/Error occurred:/u)).toHaveLength(3)

        expect(console.error).toHaveBeenCalledTimes(3)
    })

    it("Should correctly an abort error correctly", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={LegacyAgentType.OpportunityFinder}
                onSend={jest.fn()}
            />
        )
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new (class extends Error {
                constructor(message?: string) {
                    super(message)
                    this.name = "AbortError"
                }
            })("Operation was aborted")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be only 1 attempt when we are aborted
        expect(sendLlmRequest).toHaveBeenCalledTimes(1)

        // For abort errors, we don't display the error block since they are handled differently
        expect(screen.queryByText(/Error occurred:/u)).not.toBeInTheDocument()
    })

    it("Should correctly detect an error chunk from Neuro-san", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={jest.fn()}
            />
        )

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
        await sendQuery(TEST_AGENT_MATH_GUY, query)

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

    it("Should correctly handle chat context", async () => {
        const {rerender} = render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                onSend={jest.fn()}
            />
        )

        const responseMessage = getResponseMessage(ChatMessageChatMessageType.AGENT_FRAMEWORK, "Sample AI response")

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = ChatResponse.toJSON(
            ChatResponse.fromPartial({
                response: responseMessage,
            })
        )

        let sentChatContext: ChatContext
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback, chatContext) => {
            callback(JSON.stringify({result: chatResponse}))
            sentChatContext = chatContext
        })

        const query = "Sample test query for chat context"
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        // re-render to update chat_context ref
        rerender(
            <ChatCommon
                id=""
                currentUser=""
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        //We should be sending back chat context as-is to the server to maintain conversation state
        expect(sentChatContext).toEqual(responseMessage.chatContext)
    })

    it("Should show agent introduction", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()
    })

    it("Should clear chat when a new agent is selected", async () => {
        const {rerender} = render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
                clearChatOnNewAgent={true}
            />
        )

        // Make sure first agent greeting appears
        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()

        rerender(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MUSIC_NERD}
                clearChatOnNewAgent={true}
            />
        )

        // Previous agent output should have been cleared
        expect(screen.queryByText(cleanUpAgentName(TEST_AGENT_MATH_GUY))).not.toBeInTheDocument()

        // New agent greeting should be present
        expect(await screen.findByText(cleanUpAgentName(TEST_AGENT_MUSIC_NERD))).toBeInTheDocument()
    })

    it("Should handle Stop correctly", async () => {
        const setAwaitingLlmMock = jest.fn()
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={setAwaitingLlmMock}
                isAwaitingLlm={true}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        const stopButton = await screen.findByRole("button", {name: "Stop"})
        expect(stopButton).toBeInTheDocument()

        await user.click(stopButton)
        expect(await screen.findByText("Request cancelled.")).toBeInTheDocument()
        expect(setAwaitingLlmMock).toHaveBeenCalledTimes(1)
        expect(setAwaitingLlmMock).toHaveBeenCalledWith(false)
    })

    it("Should handle autoscroll toggle correctly", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        const autoscrollButton = screen.getByRole("button", {name: "Autoscroll enabled"})
        expect(autoscrollButton).toBeInTheDocument()

        await user.click(autoscrollButton)
        expect(screen.getByRole("button", {name: "Autoscroll disabled"})).toBeInTheDocument()
    })

    it("Should handle text wrapping toggle correctly", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        const wrapButton = screen.getByRole("button", {name: "Text wrapping enabled"})
        expect(wrapButton).toBeInTheDocument()

        await user.click(wrapButton)
        expect(screen.getByRole("button", {name: "Text wrapping disabled"})).toBeInTheDocument()
    })

    it("Should handle final answer from Neuro-san agents correctly", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        const responseMessage = getResponseMessage(ChatMessageChatMessageType.AI, "Sample AI response")

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = ChatResponse.toJSON(
            ChatResponse.fromPartial({
                response: responseMessage,
            })
        )

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify({result: chatResponse}))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        expect(await screen.findByText("Final Answer")).toBeInTheDocument()
    })

    it("Should handle 'show thinking' button correctly", async () => {
        render(
            <ChatCommon
                id=""
                currentUser={TEST_USER}
                userImage=""
                setIsAwaitingLlm={jest.fn()}
                isAwaitingLlm={false}
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        // Send two responses, a regular AGENT one and an AI one
        // The initial [] is to make sure the message is not treated as JSON
        const agentResponseText = "[]Sample Agent response"
        const aiResponseText = "[]Sample AI response"
        const responseMessages = [
            getResponseMessage(ChatMessageChatMessageType.AGENT, agentResponseText),
            getResponseMessage(ChatMessageChatMessageType.AI, aiResponseText),
        ]

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponsesStringified = responseMessages.map((response) =>
            ChatResponse.toJSON(
                ChatResponse.fromPartial({
                    response: response,
                })
            )
        )

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify({result: chatResponsesStringified[0]}))
            callback(JSON.stringify({result: chatResponsesStringified[1]}))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query handle thinking button test")

        // Click "show thinking" button. It defaults to "hiding agent thinking" so we look for that
        const showThinkingButton = document.getElementById("show-thinking-button")
        expect(showThinkingButton).toBeInTheDocument()
        await user.click(showThinkingButton)

        // screen.debug()
        // All responsees should be visible when "show thinking" is enabled
        expect(await screen.findAllByText(aiResponseText)).toHaveLength(2)
        expect(await screen.findByText(agentResponseText)).toBeInTheDocument()

        // Now click the button again to hide agent thinking
        await user.click(showThinkingButton)

        // Only the AI response should be visible
        expect(await screen.findAllByText(aiResponseText)).toHaveLength(2)

        // Agent response should be in the DOM but with display: none
        expect(await screen.findByText(agentResponseText)).not.toBeVisible()
    })
})
